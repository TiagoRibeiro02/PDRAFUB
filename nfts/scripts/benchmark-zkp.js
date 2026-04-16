const hre = require("hardhat");
const { ethers } = hre;
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const solc = require("solc");

const DEPLOYMENTS_CACHE_VERSION = 1;

function loadDeploymentsCache(cachePath) {
  if (!fs.existsSync(cachePath)) {
    return { version: DEPLOYMENTS_CACHE_VERSION, deployments: {} };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    if (parsed && typeof parsed === "object" && parsed.deployments && typeof parsed.deployments === "object") {
      return parsed;
    }
  } catch {
    // Fall back to a clean cache if the file cannot be parsed.
  }

  return { version: DEPLOYMENTS_CACHE_VERSION, deployments: {} };
}

function saveDeploymentsCache(cachePath, cache) {
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
}

function buildDeploymentKey(chainId, protocolName) {
  return `${chainId}:${protocolName.toUpperCase()}`;
}

async function hasCode(address) {
  const code = await ethers.provider.getCode(address);
  return code && code !== "0x";
}

async function isReusableDeployment({
  signer,
  adapterAddress,
  kycAddress,
  kycArtifact,
}) {
  if (!ethers.isAddress(adapterAddress) || !ethers.isAddress(kycAddress)) {
    return false;
  }

  if (!(await hasCode(adapterAddress)) || !(await hasCode(kycAddress))) {
    return false;
  }

  const kyc = new ethers.Contract(kycAddress, kycArtifact.abi, signer);

  try {
    const linkedVerifier = await kyc.verifier();
    if (linkedVerifier.toLowerCase() !== adapterAddress.toLowerCase()) {
      return false;
    }

    const isAuthorized = await kyc.authorizedIssuers(signer.address);
    if (!isAuthorized) {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}

function compileFromSources(sources, contractFile, contractName) {
  const input = {
    language: "Solidity",
    sources: Object.fromEntries(
      Object.entries(sources).map(([file, content]) => [file, { content }])
    ),
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object", "evm.bytecode.linkReferences"],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const errors = output.errors.filter((e) => e.severity === "error");
    if (errors.length > 0) {
      throw new Error(errors.map((e) => e.formattedMessage).join("\n"));
    }
  }

  const artifact = output.contracts?.[contractFile]?.[contractName];
  if (!artifact) {
    throw new Error(`Could not compile ${contractName} from ${contractFile}`);
  }

  return {
    abi: artifact.abi,
    bytecode: `0x${artifact.evm.bytecode.object}`,
    linkReferences: artifact.evm.bytecode.linkReferences || {},
    allContracts: output.contracts || {},
  };
}

function hasLinkReferences(linkReferences) {
  return Object.values(linkReferences || {}).some((libs) =>
    Object.values(libs || {}).some((refs) => Array.isArray(refs) && refs.length > 0)
  );
}

function applyLinkReferences(bytecode, linkReferences, deployedLibraries) {
  let linked = bytecode.startsWith("0x") ? bytecode.slice(2) : bytecode;

  for (const [fileName, libraries] of Object.entries(linkReferences || {})) {
    for (const [libraryName, refs] of Object.entries(libraries || {})) {
      const libraryKey = `${fileName}:${libraryName}`;
      const address = deployedLibraries[libraryKey];
      if (!address) {
        throw new Error(`Missing deployed address for library ${libraryKey}`);
      }

      const normalizedAddress = address.toLowerCase().replace(/^0x/, "");

      for (const ref of refs) {
        const start = ref.start * 2;
        const length = ref.length * 2;
        const paddedAddress = normalizedAddress.padStart(length, "0");
        linked = `${linked.slice(0, start)}${paddedAddress}${linked.slice(start + length)}`;
      }
    }
  }

  return `0x${linked}`;
}

async function deployLibrariesForArtifact(artifact, signer) {
  const deployed = {};
  const deployedCache = new Map();

  async function deployLibrary(fileName, libraryName) {
    const key = `${fileName}:${libraryName}`;
    if (deployedCache.has(key)) {
      return deployedCache.get(key);
    }

    const libArtifact = artifact.allContracts?.[fileName]?.[libraryName];
    if (!libArtifact?.evm?.bytecode?.object) {
      throw new Error(`Library artifact not found for ${key}`);
    }

    const libLinkReferences = libArtifact.evm.bytecode.linkReferences || {};
    let libBytecode = `0x${libArtifact.evm.bytecode.object}`;

    if (hasLinkReferences(libLinkReferences)) {
      for (const [depFile, depLibraries] of Object.entries(libLinkReferences)) {
        for (const depLibrary of Object.keys(depLibraries || {})) {
          const depAddress = await deployLibrary(depFile, depLibrary);
          deployed[`${depFile}:${depLibrary}`] = depAddress;
        }
      }

      libBytecode = applyLinkReferences(libBytecode, libLinkReferences, deployed);
    }

    const libFactory = new ethers.ContractFactory(libArtifact.abi || [], libBytecode, signer);
    const libContract = await libFactory.deploy();
    await libContract.waitForDeployment();
    const libAddress = await libContract.getAddress();

    deployedCache.set(key, libAddress);
    deployed[key] = libAddress;
    return libAddress;
  }

  for (const [fileName, libraries] of Object.entries(artifact.linkReferences || {})) {
    for (const libraryName of Object.keys(libraries || {})) {
      await deployLibrary(fileName, libraryName);
    }
  }

  return deployed;
}

function parseCalldata(raw) {
  const text = raw.trim();

  const rawHexTuple = parseRawHexTupleForm(text);
  if (rawHexTuple) {
    return rawHexTuple;
  }

  const concatenated = parseConcatenatedArrayForm(text);
  if (concatenated) {
    return concatenated;
  }

  const parsed = tryParseAsTuple(text);
  if (parsed) {
    return parsed;
  }

  const fallback = parseByRegexFallback(text);
  if (fallback) {
    return fallback;
  }

  throw new Error(`Could not parse solidity calldata output: ${text}`);
}

function parseRawHexTupleForm(text) {
  const arrays = extractTopLevelArrays(text);
  if (arrays.length !== 2) {
    return null;
  }

  const proofItems = parseRawArrayItems(arrays[0]);
  const publicItems = parseRawArrayItems(arrays[1]);

  if (!proofItems || !publicItems) {
    return null;
  }

  const proofHex = normalizeProofNode(proofItems);
  const publicSignals = normalizePublicSignals(publicItems);

  if (!proofHex || !publicSignals) {
    return null;
  }

  return { proofHex, publicSignals };
}

function extractTopLevelArrays(text) {
  const arrays = [];
  let depth = 0;
  let start = -1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "[") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "]") {
      depth--;
      if (depth === 0 && start !== -1) {
        arrays.push(text.slice(start, i + 1));
        start = -1;
      }
    }
  }

  return arrays;
}

function parseRawArrayItems(arrayText) {
  const trimmed = arrayText.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
    return null;
  }

  const inner = trimmed.slice(1, -1).trim();
  if (!inner) return [];

  const tokens = inner.split(",").map((t) => t.trim()).filter(Boolean);
  if (tokens.length === 0) return null;

  return tokens.map((token) => {
    const unquoted = token.replace(/^"|"$/g, "");
    return unquoted;
  });
}

function parseConcatenatedArrayForm(text) {
  const compact = text.replace(/\s+/g, "");

  if (!compact.startsWith("[") || !compact.endsWith("]") || !compact.includes("][")) {
    return null;
  }

  const splitIndex = compact.indexOf("][");
  if (splitIndex === -1) {
    return null;
  }

  const firstPart = `${compact.slice(0, splitIndex + 1)}`;
  const secondPart = `[${compact.slice(splitIndex + 2)}`;

  try {
    const proofNode = JSON.parse(firstPart);
    const publicNode = JSON.parse(secondPart);

    const proofHex = normalizeProofNode(proofNode);
    const publicSignals = normalizePublicSignals(publicNode);

    if (!proofHex || !publicSignals) {
      return null;
    }

    return { proofHex, publicSignals };
  } catch {
    return null;
  }
}

function tryParseAsTuple(text) {
  const candidates = [text, `[${text}]`];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      const tuple = normalizeParsedTuple(parsed);
      if (tuple) {
        return tuple;
      }
    } catch {
      // continue trying
    }
  }

  return null;
}

function normalizeParsedTuple(parsed) {
  if (!Array.isArray(parsed)) {
    return null;
  }

  if (parsed.length === 2) {
    const [proofNode, publicNode] = parsed;
    const publicSignals = normalizePublicSignals(publicNode);
    if (!publicSignals) return null;

    const proofHex = normalizeProofNode(proofNode);
    if (!proofHex) return null;

    return { proofHex, publicSignals };
  }

  if (parsed.length === 1 && Array.isArray(parsed[0]) && parsed[0].length === 2) {
    return normalizeParsedTuple(parsed[0]);
  }

  return null;
}

function normalizeProofNode(proofNode) {
  if (typeof proofNode === "string" && proofNode.startsWith("0x")) {
    return proofNode;
  }

  if (Array.isArray(proofNode) && proofNode.length === 24) {
    const words = proofNode.map((item) => {
      if (typeof item !== "string") return null;
      const hex = item.startsWith("0x") ? item.slice(2) : item;
      if (!/^[0-9a-fA-F]{64}$/.test(hex)) return null;
      return hex.toLowerCase();
    });

    if (words.some((w) => w === null)) {
      return null;
    }

    return `0x${words.join("")}`;
  }

  return null;
}

function normalizePublicSignals(publicNode) {
  if (!Array.isArray(publicNode)) {
    return null;
  }

  const publicSignals = publicNode.map((x) => normalizeSignalValue(x));
  if (publicSignals.some((x) => x === null)) {
    return null;
  }

  if (publicSignals.length !== 3) {
    return null;
  }
  return publicSignals;
}

function normalizeSignalValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const str = value.toString().trim().replace(/^"|"$/g, "");
  if (/^0x[0-9a-fA-F]+$/.test(str)) {
    return BigInt(str).toString();
  }
  if (/^[0-9]+$/.test(str)) {
    return str;
  }
  return null;
}

function parseByRegexFallback(text) {
  const proofHexMatch = text.match(/0x[0-9a-fA-F]+/);
  if (!proofHexMatch) {
    return null;
  }

  const proofHex = proofHexMatch[0];
  const withoutProof = text.replace(proofHex, "");
  const arrayMatches = withoutProof.match(/\[[^\[\]]*\]/g) || [];
  const lastArray = arrayMatches[arrayMatches.length - 1] || "[]";
  const publicSignals = (lastArray.match(/"(\d+)"|\b\d+\b/g) || [])
    .map((token) => token.replaceAll('"', ""));

  if (publicSignals.length !== 3) {
    return null;
  }

  return { proofHex, publicSignals };
}

function exportSolidityCalldata(protocolDir, publicFile, proofFile) {
  const output = execFileSync(
    "npx",
    ["snarkjs", "zkey", "export", "soliditycalldata", publicFile, proofFile],
    { cwd: protocolDir, encoding: "utf8" }
  );
  return parseCalldata(output);
}

function toPaddedHexWord(value) {
  const bn = BigInt(value.toString());
  return bn.toString(16).padStart(64, "0");
}

function readGrothProofAndSignals(protocolDir, publicFile, proofFile) {
  const output = execFileSync(
    "npx",
    ["snarkjs", "zkey", "export", "soliditycalldata", publicFile, proofFile],
    { cwd: protocolDir, encoding: "utf8" }
  );

  const arrays = extractTopLevelArrays(output.trim());
  if (arrays.length < 4) {
    throw new Error(`GROTH16: unexpected solidity calldata format: ${output.trim()}`);
  }

  const readTokens = (segment) => {
    const matches = segment.match(/0x[0-9a-fA-F]+|\b\d+\b/g) || [];
    return matches;
  };

  const aTokens = readTokens(arrays[0]);
  const bTokens = readTokens(arrays[1]);
  const cTokens = readTokens(arrays[2]);
  const signalTokens = readTokens(arrays[3]);

  if (aTokens.length < 2 || bTokens.length < 4 || cTokens.length < 2 || signalTokens.length < 3) {
    throw new Error(`GROTH16: could not parse calldata arrays: ${output.trim()}`);
  }

  const proofWords = [
    aTokens[0],
    aTokens[1],
    bTokens[0],
    bTokens[1],
    bTokens[2],
    bTokens[3],
    cTokens[0],
    cTokens[1],
  ].map(toPaddedHexWord);

  const proofHex = `0x${proofWords.join("")}`;
  const publicSignals = signalTokens.slice(0, 3).map((x) => BigInt(x).toString());

  return { proofHex, publicSignals };
}

async function deployFromCompiled(artifact, signer, args = []) {
  let deployBytecode = artifact.bytecode;

  if (hasLinkReferences(artifact.linkReferences)) {
    const deployedLibraries = await deployLibrariesForArtifact(artifact, signer);
    deployBytecode = applyLinkReferences(
      deployBytecode,
      artifact.linkReferences,
      deployedLibraries
    );
  }

  if (/__\$[0-9a-fA-F]{34}\$__/.test(deployBytecode)) {
    throw new Error("Unresolved Solidity library placeholders remain in deploy bytecode");
  }

  const factory = new ethers.ContractFactory(artifact.abi, deployBytecode, signer);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  return contract;
}

async function getOrDeployContracts({
  signer,
  protocolName,
  adapterArtifact,
  adapterDeployArgs = [],
  kycArtifact,
  chainId,
  networkName,
  forceRedeploy,
  cache,
  cachePath,
}) {
  const deploymentKey = buildDeploymentKey(chainId, protocolName);
  const cached = cache.deployments[deploymentKey];

  if (!forceRedeploy && cached) {
    const reusable = await isReusableDeployment({
      signer,
      adapterAddress: cached.adapter,
      kycAddress: cached.kyc,
      kycArtifact,
    });

    if (reusable) {
      return {
        adapter: new ethers.Contract(cached.adapter, adapterArtifact.abi, signer),
        kyc: new ethers.Contract(cached.kyc, kycArtifact.abi, signer),
        reused: true,
      };
    }
  }

  const adapter = await deployFromCompiled(adapterArtifact, signer, adapterDeployArgs);
  const adapterAddress = await adapter.getAddress();

  const kyc = await deployFromCompiled(kycArtifact, signer, [adapterAddress]);
  const kycAddress = await kyc.getAddress();

  cache.deployments[deploymentKey] = {
    protocol: protocolName.toUpperCase(),
    chainId,
    network: networkName,
    signer: signer.address,
    adapter: adapterAddress,
    kyc: kycAddress,
    updatedAt: new Date().toISOString(),
  };
  saveDeploymentsCache(cachePath, cache);

  return { adapter, kyc, reused: false };
}

async function benchmarkProtocol({
  signer,
  protocolName,
  adapterArtifact,
  adapterDeployArgs = [],
  kycArtifact,
  proofHex,
  publicSignals,
  chainId,
  networkName,
  forceRedeploy,
  cache,
  cachePath,
}) {
  if (!Array.isArray(publicSignals) || publicSignals.length !== 3) {
    throw new Error(
      `${protocolName}: expected exactly 3 public signals, got ${JSON.stringify(publicSignals)}`
    );
  }

  const { adapter, kyc, reused } = await getOrDeployContracts({
    signer,
    protocolName,
    adapterArtifact,
    adapterDeployArgs,
    kycArtifact,
    chainId,
    networkName,
    forceRedeploy,
    cache,
    cachePath,
  });
  const adapterAddress = await adapter.getAddress();

  const txVerify = await adapter.verifyProofTx(proofHex, publicSignals);
  const rcVerify = await txVerify.wait();

  const did = `did:zeroid:${protocolName.toLowerCase()}-bench`;
  const commitment = publicSignals[2].toString();
  const expiryDate = Math.floor(Date.now() / 1000) + 86400;

  const txKyc = await kyc.submitComplianceProof(
    did,
    commitment,
    "did:zeroid:issuer-benchmark",
    expiryDate,
    ethers.ZeroHash,
    false,
    proofHex,
    publicSignals
  );
  const rcKyc = await txKyc.wait();

  return {
    protocol: protocolName,
    adapter: adapterAddress,
    kyc: await kyc.getAddress(),
    reusedDeployment: reused,
    verifyProofTxGas: rcVerify.gasUsed.toString(),
    submitComplianceProofGas: rcKyc.gasUsed.toString(),
  };
}

function readNoirProofAndPublicInputs(noirDir) {
  // Use bb prove outputs so proof and public inputs are guaranteed to be paired.
  const proofBinary = fs.readFileSync(path.join(noirDir, "target", "proof.bench", "proof"));
  const proofHex = "0x" + proofBinary.toString("hex");

  const publicInputsBinary = fs.readFileSync(
    path.join(noirDir, "target", "proof.bench", "public_inputs")
  );

  // bb writes field elements as 32-byte big-endian values.
  const publicSignals = [];
  for (let i = 0; i < 3; i++) {
    const fieldBytes = publicInputsBinary.slice(i * 32, (i + 1) * 32);
    const fieldHex = fieldBytes.toString("hex") || "0";
    const fieldValue = BigInt(`0x${fieldHex}`);
    publicSignals.push(fieldValue.toString());
  }

  return { proofHex, publicSignals };
}

async function main() {
  const root = path.resolve(__dirname, "../../");
  const perfRoot = path.join(root, "performance-experiments");
  const plonkDir = path.join(perfRoot, "plonk");
  const fflonkDir = path.join(perfRoot, "fflonk");
  const grothDir = path.join(perfRoot, "groth16");
  const noirDir = path.join(perfRoot, "noir");

  const chooseExisting = (dir, preferred, fallback) => {
    const preferredPath = path.join(dir, preferred);
    if (fs.existsSync(preferredPath)) return preferred;
    return fallback;
  };

  const plonkProofFile = chooseExisting(plonkDir, "proof.bench.json", "proof2.json");
  const plonkPublicFile = chooseExisting(plonkDir, "public.bench.json", "public2.json");
  const fflonkProofFile = chooseExisting(fflonkDir, "proof.bench.json", "proof.json");
  const fflonkPublicFile = chooseExisting(fflonkDir, "public.bench.json", "public.json");
  const grothProofFile = chooseExisting(grothDir, "proof.bench.json", "proof.json");
  const grothPublicFile = chooseExisting(grothDir, "public.bench.json", "public.json");
  const plonkCalldata = exportSolidityCalldata(plonkDir, plonkPublicFile, plonkProofFile);
  const fflonkCalldata = exportSolidityCalldata(fflonkDir, fflonkPublicFile, fflonkProofFile);
  const grothCalldata = readGrothProofAndSignals(grothDir, grothPublicFile, grothProofFile);

  const plonkSources = {
    "Verifier.sol": fs.readFileSync(path.join(plonkDir, "Verifier.sol"), "utf8"),
    "PlonkVerifierAdapter.sol": fs
      .readFileSync(path.join(plonkDir, "PlonkVerifierAdapter.sol"), "utf8")
      .replace('./Verifier.sol', 'Verifier.sol'),
    "KYCCompliance.sol": fs.readFileSync(path.join(plonkDir, "KYCCompliance.sol"), "utf8"),
  };

  const fflonkSources = {
    "verifier.sol": fs.readFileSync(path.join(fflonkDir, "verifier.sol"), "utf8"),
    "FflonkVerifierAdapter.sol": fs
      .readFileSync(path.join(fflonkDir, "FflonkVerifierAdapter.sol"), "utf8")
      .replace('./verifier.sol', 'verifier.sol'),
    "KYCCompliance.sol": fs.readFileSync(path.join(fflonkDir, "KYCCompliance.sol"), "utf8"),
  };

  const grothSources = {
    "verifier.sol": fs.readFileSync(path.join(grothDir, "verifier.sol"), "utf8"),
    "Groth16VerifierAdapter.sol": fs
      .readFileSync(path.join(grothDir, "Groth16VerifierAdapter.sol"), "utf8")
      .replace('./verifier.sol', 'verifier.sol'),
    "KYCCompliance.sol": fs.readFileSync(path.join(grothDir, "KYCCompliance.sol"), "utf8"),
  };

  const noirSources = {
    "Verifier.sol": fs.readFileSync(path.join(noirDir, "target", "Verifier.sol"), "utf8"),
    "NoirVerifierAdapter.sol": fs
      .readFileSync(path.join(noirDir, "target", "NoirVerifierAdapter.sol"), "utf8"),
    "KYCCompliance.sol": fs.readFileSync(path.join(noirDir, "target", "KYCCompliance.sol"), "utf8"),
  };

  const plonkAdapterArtifact = compileFromSources(
    plonkSources,
    "PlonkVerifierAdapter.sol",
    "PlonkVerifierAdapter"
  );
  const plonkKycArtifact = compileFromSources(plonkSources, "KYCCompliance.sol", "KYCCompliance");

  const fflonkAdapterArtifact = compileFromSources(
    fflonkSources,
    "FflonkVerifierAdapter.sol",
    "FflonkVerifierAdapter"
  );
  const fflonkKycArtifact = compileFromSources(fflonkSources, "KYCCompliance.sol", "KYCCompliance");

  const grothAdapterArtifact = compileFromSources(
    grothSources,
    "Groth16VerifierAdapter.sol",
    "Groth16VerifierAdapter"
  );
  const grothKycArtifact = compileFromSources(grothSources, "KYCCompliance.sol", "KYCCompliance");

  const noirAdapterArtifact = compileFromSources(
    noirSources,
    "NoirVerifierAdapter.sol",
    "NoirVerifierAdapter"
  );
  const noirVerifierArtifact = compileFromSources(noirSources, "Verifier.sol", "HonkVerifier");
  const noirKycArtifact = compileFromSources(noirSources, "KYCCompliance.sol", "KYCCompliance");

  const [signer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const networkName = network.name || "unknown";
  const forceRedeploy = process.env.ZKP_BENCHMARK_FORCE_REDEPLOY === "1";
  const cachePath = path.join(__dirname, "..", "artifacts", "zkp-deployments.json");
  const cache = loadDeploymentsCache(cachePath);

  const noirVerifier = await deployFromCompiled(noirVerifierArtifact, signer);
  const noirVerifierAddress = await noirVerifier.getAddress();

  const plonkResult = await benchmarkProtocol({
    signer,
    protocolName: "PLONK",
    adapterArtifact: plonkAdapterArtifact,
    kycArtifact: plonkKycArtifact,
    proofHex: plonkCalldata.proofHex,
    publicSignals: plonkCalldata.publicSignals,
    chainId,
    networkName,
    forceRedeploy,
    cache,
    cachePath,
  });

  const fflonkResult = await benchmarkProtocol({
    signer,
    protocolName: "FFLONK",
    adapterArtifact: fflonkAdapterArtifact,
    kycArtifact: fflonkKycArtifact,
    proofHex: fflonkCalldata.proofHex,
    publicSignals: fflonkCalldata.publicSignals,
    chainId,
    networkName,
    forceRedeploy,
    cache,
    cachePath,
  });

  const grothResult = await benchmarkProtocol({
    signer,
    protocolName: "GROTH16",
    adapterArtifact: grothAdapterArtifact,
    kycArtifact: grothKycArtifact,
    proofHex: grothCalldata.proofHex,
    publicSignals: grothCalldata.publicSignals,
    chainId,
    networkName,
    forceRedeploy,
    cache,
    cachePath,
  });

  const noirProofAndSignals = readNoirProofAndPublicInputs(noirDir);
  const noirResult = await benchmarkProtocol({
    signer,
    protocolName: "NOIR",
    adapterArtifact: noirAdapterArtifact,
    adapterDeployArgs: [noirVerifierAddress],
    kycArtifact: noirKycArtifact,
    proofHex: noirProofAndSignals.proofHex,
    publicSignals: noirProofAndSignals.publicSignals,
    chainId,
    networkName,
    forceRedeploy,
    cache,
    cachePath,
  });

  const output = {
    generatedAt: new Date().toISOString(),
    results: [plonkResult, fflonkResult, grothResult, noirResult],
  };

  console.log("=== ON-CHAIN GAS BENCHMARK ===");
  console.log(JSON.stringify(output, null, 2));
  console.log(`BENCHMARK_GAS_JSON=${JSON.stringify(output)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
