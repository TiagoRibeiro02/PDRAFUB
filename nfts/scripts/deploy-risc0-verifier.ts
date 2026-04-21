import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";

type VerifierArtifact = {
  abi: any[];
  bytecode: string;
};

function getConstructorInputs(abi: any[]): Array<{ name?: string; type: string }> {
  const ctor = abi.find((item: any) => item?.type === "constructor");
  const inputs = ctor?.inputs;
  return Array.isArray(inputs) ? inputs : [];
}

function parseDeployArgs(abi: any[]): unknown[] {
  const inputs = getConstructorInputs(abi);
  if (inputs.length === 0) {
    return [];
  }

  const rawJson = process.env.RISC0_VERIFIER_CONSTRUCTOR_ARGS_JSON;
  if (rawJson) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      throw new Error(
        "RISC0_VERIFIER_CONSTRUCTOR_ARGS_JSON must be valid JSON (expected an array)."
      );
    }

    if (!Array.isArray(parsed)) {
      throw new Error(
        "RISC0_VERIFIER_CONSTRUCTOR_ARGS_JSON must be a JSON array."
      );
    }

    if (parsed.length !== inputs.length) {
      throw new Error(
        `RISC0_VERIFIER_CONSTRUCTOR_ARGS_JSON length mismatch. Expected ${inputs.length}, got ${parsed.length}.`
      );
    }

    return parsed;
  }

  // Convenience path for RiscZeroGroth16Verifier constructor(bytes32,bytes32).
  if (
    inputs.length === 2 &&
    inputs[0].type === "bytes32" &&
    inputs[1].type === "bytes32" &&
    process.env.RISC0_CONTROL_ROOT &&
    process.env.RISC0_BN254_CONTROL_ID
  ) {
    return [process.env.RISC0_CONTROL_ROOT, process.env.RISC0_BN254_CONTROL_ID];
  }

  const signature = inputs.map((i, idx) => `${i.type}${i.name ? ` ${i.name}` : ` arg${idx}`}`).join(", ");
  throw new Error(
    `Verifier constructor requires arguments: (${signature}). ` +
      "Provide RISC0_VERIFIER_CONSTRUCTOR_ARGS_JSON as a JSON array, " +
      "or set RISC0_CONTROL_ROOT and RISC0_BN254_CONTROL_ID for bytes32,bytes32 constructors."
  );
}

const KNOWN_RISC0_ROUTER_BY_CHAIN_ID: Record<number, string> = {
  1: "0x8EaB2D97Dfce405A1692a21b3ff3A172d593D319", // Ethereum Mainnet
  11155111: "0x925d8331ddc0a1F0d96E68CF073DFE1d92b69187", // Ethereum Sepolia
  17000: "0xf70aBAb028Eb6F4100A24B203E113D94E87DE93C", // Holesky
  42161: "0x0b144e07a0826182b6b59788c34b32bfa86fb711", // Arbitrum Mainnet
  421614: "0x0b144e07a0826182b6b59788c34b32bfa86fb711", // Arbitrum Sepolia
  8453: "0x0b144e07a0826182b6b59788c34b32bfa86fb711", // Base Mainnet
  84532: "0x0b144e07a0826182b6b59788c34b32bfa86fb711", // Base Sepolia
  10: "0x0b144e07a0826182b6b59788c34b32bfa86fb711", // Optimism Mainnet
  11155420: "0xB369b4dd27FBfb59921d3A4a3D23AC2fc32FB908", // Optimism Sepolia
  137: "0xdBAD523786971B75A7b1c1CFdCfECDeb59A764B9", // Polygon PoS
};

function normalizeBytecode(bytecode: string): string {
  return bytecode.startsWith("0x") ? bytecode : `0x${bytecode}`;
}

function readVerifierArtifact(artifactPath: string): VerifierArtifact {
  const parsed = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  // Supports both plain {abi, bytecode} and Hardhat artifact shape.
  if (Array.isArray(parsed?.abi) && typeof parsed?.bytecode === "string") {
    return { abi: parsed.abi, bytecode: normalizeBytecode(parsed.bytecode) };
  }

  if (Array.isArray(parsed?.abi) && typeof parsed?.deployedBytecode === "string") {
    return { abi: parsed.abi, bytecode: normalizeBytecode(parsed.bytecode || parsed.deployedBytecode) };
  }

  // Supports Foundry artifacts with nested bytecode object.
  if (Array.isArray(parsed?.abi) && typeof parsed?.bytecode?.object === "string") {
    return { abi: parsed.abi, bytecode: normalizeBytecode(parsed.bytecode.object) };
  }

  throw new Error(
    `Invalid verifier artifact at ${artifactPath}. Expected { abi, bytecode }, Hardhat artifact, or Foundry artifact.`
  );
}

async function main() {
  const root = path.resolve(__dirname, "..");
  const cwdRoot = process.cwd();
  const artifactCandidates = [
    process.env.RISC0_VERIFIER_ARTIFACT_PATH,
    path.join(root, "risc0-verifier-artifact.json"),
    path.join(cwdRoot, "risc0-verifier-artifact.json"),
    path.join(root, "artifacts", "risc0-verifier-artifact.json"),
    path.join(cwdRoot, "artifacts", "risc0-verifier-artifact.json"),
    path.join(root, "..", "performance-experiments", "risc0-ethereum", "contracts", "out", "RiscZeroGroth16Verifier.sol", "RiscZeroGroth16Verifier.json"),
  ].filter((p): p is string => typeof p === "string" && p.length > 0);
  const artifactPath = artifactCandidates.find((p) => fs.existsSync(p)) || artifactCandidates[0];
  const [deployer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  let verifierAddress = process.env.RISC0_VERIFIER_ADDRESS;
  let deploymentMode: "provided-address" | "managed-router" | "deployed-from-artifact" | "mock-local";

  if (verifierAddress) {
    if (!ethers.isAddress(verifierAddress)) {
      throw new Error(`Invalid RISC0_VERIFIER_ADDRESS: ${verifierAddress}`);
    }
    deploymentMode = "provided-address";
    console.log("Using verifier from RISC0_VERIFIER_ADDRESS:", verifierAddress);
  } else if (fs.existsSync(artifactPath)) {
    const { abi, bytecode } = readVerifierArtifact(artifactPath);
    const deployArgs = parseDeployArgs(abi);

    console.log("Deploying RISC0 verifier with:", deployer.address);
    const factory = new ethers.ContractFactory(abi, bytecode, deployer);
    const verifier = await factory.deploy(...deployArgs);
    await verifier.waitForDeployment();
    verifierAddress = await verifier.getAddress();
    deploymentMode = "deployed-from-artifact";
  } else {
    console.log("RISC0 verifier artifact not found at:", artifactPath);
    console.log("Checked artifact candidates:", artifactCandidates);
    const knownRouter = KNOWN_RISC0_ROUTER_BY_CHAIN_ID[chainId];
    if (!knownRouter && (chainId === 31337 || chainId === 1337)) {
      console.log("No artifact found on localhost. Deploying local MockRisc0Verifier fallback.");
      const mockFactory = await ethers.getContractFactory("MockRisc0Verifier");
      const mockVerifier = await mockFactory.deploy();
      await mockVerifier.waitForDeployment();
      verifierAddress = await mockVerifier.getAddress();
      deploymentMode = "mock-local";
    } else if (!knownRouter) {
      throw new Error(
        `Missing verifier artifact: ${artifactPath}. ` +
          "Set RISC0_VERIFIER_ARTIFACT_PATH to a valid JSON file, or set RISC0_VERIFIER_ADDRESS to an existing verifier/router address."
      );
    } else {
      verifierAddress = knownRouter;
      deploymentMode = "managed-router";
      console.log("No artifact found. Falling back to managed RISC0 verifier router:", verifierAddress);
    }
  }

  if (!verifierAddress) {
    throw new Error("Failed to resolve a RISC0 verifier address.");
  }

  const output = {
    verifier: verifierAddress,
    mode: deploymentMode,
    artifactPath,
    network: network.name,
    chainId,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
  };

  const outPath = path.join(root, "artifacts", "risc0-verifier-deployment.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  console.log("RISC0 verifier address:", verifierAddress);
  console.log("Saved deployment info:", outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
