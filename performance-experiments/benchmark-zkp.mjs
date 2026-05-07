import { execFileSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const repoRoot = resolve(process.cwd(), "..");
const perfRoot = resolve(process.cwd());
const plonkDir = resolve(perfRoot, "plonk");
const fflonkDir = resolve(perfRoot, "fflonk");
const grothDir = resolve(perfRoot, "groth16");
const noirDir = resolve(perfRoot, "noir");
const halo2Dir = resolve(perfRoot, "halo2", "circuit");
const risc0Dir = resolve(perfRoot, "RiskZero");
const nftsDir = resolve(repoRoot, "nfts");
const localTmpDir = resolve(perfRoot, ".tmp");
const RUN_COUNT = 1;

function loadEnvFromNfts() {
  const envPath = resolve(nftsDir, ".env");
  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, "utf8");
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      continue;
    }

    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['\"]|['\"]$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function ensureTestnetEnv() {
  loadEnvFromNfts();

  if (!process.env.SEPOLIA_RPC_URL || !process.env.PRIVATE_KEY) {
    throw new Error(
      "Missing testnet env vars. Set SEPOLIA_RPC_URL and PRIVATE_KEY before running benchmarks."
    );
  }

  const normalizedKey = process.env.PRIVATE_KEY.trim().replace(/^0x/, "");
  if (!/^[0-9a-fA-F]{64}$/.test(normalizedKey)) {
    throw new Error(
      "Invalid PRIVATE_KEY in nfts/.env. It must be a 32-byte hex key (64 hex chars), optionally prefixed with 0x."
    );
  }
}

function runWithTimer(command, args, cwd) {
  const start = process.hrtime.bigint();
  execFileSync(command, args, { cwd, stdio: "pipe" });
  const end = process.hrtime.bigint();
  const ms = Number(end - start) / 1_000_000;
  return Number(ms.toFixed(2));
}

function ensureFile(path, label) {
  if (!existsSync(path)) {
    throw new Error(`Missing ${label}: ${path}`);
  }
}

function benchmarkProtocol({ name, cwd, proveArgs, verifyArgs, requiredFiles }) {
  for (const file of requiredFiles) {
    ensureFile(resolve(cwd, file.path), `${name} ${file.label}`);
  }

  const proofGenMs = runWithTimer("snarkjs", proveArgs, cwd);
  const verifyMs = runWithTimer("snarkjs", verifyArgs, cwd);
  return { proofGenerationMs: proofGenMs, verificationMs: verifyMs };
}

function parseBenchTimingsFromOutput(output, protocolName) {
  const marker = "BENCHMARK_TIMINGS_JSON=";
  const line = output
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith(marker));

  if (!line) {
    throw new Error(`Missing timing marker from ${protocolName} benchmark output`);
  }

  return JSON.parse(line.slice(marker.length));
}

function benchmarkRustProtocol({ name, cwd, bin, mainFile = "src/main.rs" }) {
  ensureFile(resolve(cwd, "Cargo.toml"), `${name} Cargo.toml`);
  ensureFile(resolve(cwd, mainFile), `${name} main.rs`);

  const args = ["run", "--release"];
  if (bin) {
    args.push("--bin", bin);
  }
  args.push("--", "--bench-json");

  mkdirSync(localTmpDir, { recursive: true });

  const output = execFileSync("cargo", args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, TMPDIR: process.env.TMPDIR || localTmpDir },
  });

  const parsed = parseBenchTimingsFromOutput(output, name);
  return {
    proofGenerationMs: Number(parsed.proofGenerationMs),
    verificationMs: Number(parsed.verificationMs),
  };
}

function benchmarkNoirProtocol() {
  const proofOutputDir = resolve(noirDir, "target", "proof.bench");

  ensureFile(resolve(noirDir, "target", "kyc_circuit.json"), "NOIR bytecode");
  ensureFile(resolve(noirDir, "target", "witness.gz"), "NOIR witness");
  ensureFile(resolve(noirDir, "target", "vk", "vk"), "NOIR verification key");

  const proofGenerationMs = runWithTimer(
    "bb",
    [
      "prove",
      "-b",
      "./target/kyc_circuit.json",
      "-w",
      "./target/witness.gz",
      "-k",
      "./target/vk/vk",
      "-o",
      "./target/proof.bench",
      "-t",
      "evm",
    ],
    noirDir
  );

  ensureFile(resolve(proofOutputDir, "proof"), "NOIR generated proof");
  ensureFile(resolve(proofOutputDir, "public_inputs"), "NOIR generated public inputs");

  const verificationMs = runWithTimer(
    "bb",
    [
      "verify",
      "-k",
      "./target/vk/vk",
      "-p",
      "./target/proof.bench/proof",
      "-i",
      "./target/proof.bench/public_inputs",
      "-t",
      "evm",
    ],
    noirDir
  );

  return { proofGenerationMs, verificationMs };
}

function benchmarkRiscZeroProtocol() {
  const proofDir = resolve(risc0Dir, "proofs");

  const timings = benchmarkRustProtocol({
    name: "RISC0",
    cwd: risc0Dir,
    bin: "host",
    mainFile: "host/src/main.rs",
  });

  ensureFile(resolve(proofDir, "proof.bench.json"), "RISC0 generated proof");
  ensureFile(resolve(proofDir, "public.bench.json"), "RISC0 generated public inputs");

  return timings;
}

function appendUnsupportedGasEntries(gas) {
  const existing = new Set((gas?.results || []).map((item) => item.protocol?.toUpperCase()));
  const unsupportedReasons = {
    HALO2: "No Solidity verifier adapter is configured for this protocol in nfts/scripts/benchmark-zkp.js.",
  };

  const missingProtocols = Object.keys(unsupportedReasons).filter((p) => !existing.has(p));

  if (missingProtocols.length === 0) {
    return gas;
  }

  const additions = missingProtocols.map((protocol) => ({
    protocol,
    supported: false,
    reason: unsupportedReasons[protocol],
    verifyProofTxGas: null,
    submitComplianceProofGas: null,
  }));

  return {
    ...gas,
    results: [...(gas?.results || []), ...additions],
  };
}

function benchmarkHalo2Gas() {
  const artifactOutput = execFileSync(
    "cargo",
    ["run", "--release", "--bin", "halo2_evm_gas", "--", "--bench-json"],
    {
      cwd: halo2Dir,
      encoding: "utf8",
    }
  );

  const artifactMarker = "BENCHMARK_HALO2_ARTIFACT_JSON=";
  const artifactLine = artifactOutput
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith(artifactMarker));

  if (!artifactLine) {
    throw new Error("Could not parse HALO2 artifact generation output");
  }

  const gasOutput = execFileSync("npm", ["run", "benchmark:halo2-gas:local"], {
    cwd: nftsDir,
    encoding: "utf8",
  });

  const marker = "BENCHMARK_HALO2_GAS_JSON=";
  const timingMarker = "BENCHMARK_HALO2_VERIFICATION_TIME_JSON=";
  const line = gasOutput
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith(marker));
  const timingLine = gasOutput
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith(timingMarker));

  if (!line) {
    throw new Error("Could not parse HALO2 gas benchmark output");
  }

  if (!timingLine) {
    throw new Error("Could not parse HALO2 verification-time benchmark output");
  }

  const gas = JSON.parse(line.slice(marker.length));
  const timing = JSON.parse(timingLine.slice(timingMarker.length));

  return {
    gas,
    verificationMs: Number(timing.verificationMs),
  };
}

function mergeHalo2Gas(gas, halo2Gas) {
  const filtered = (gas?.results || []).filter(
    (entry) => entry.protocol?.toUpperCase() !== "HALO2"
  );

  return {
    ...gas,
    results: [...filtered, halo2Gas],
  };
}

function runGasBenchmark() {
  const output = execFileSync("npm", ["run", "benchmark:zkp:local"], {
    cwd: nftsDir,
    encoding: "utf8",
    env: {
      ...process.env,
      ZKP_SKIP_RISC0: "1",
    },
  });

  const marker = "BENCHMARK_GAS_JSON=";
  const timingMarker = "BENCHMARK_ONCHAIN_VERIFICATION_TIME_JSON=";
  const line = output
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith(marker));
  const timingLine = output
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith(timingMarker));

  if (!line) {
    throw new Error("Could not parse gas benchmark output");
  }

  if (!timingLine) {
    throw new Error("Could not parse on-chain verification-time benchmark output");
  }

  const timingJson = JSON.parse(timingLine.slice(timingMarker.length));
  const verificationMsByProtocol = Object.fromEntries(
    (timingJson?.results || []).map((item) => [
      String(item.protocol || "").toUpperCase(),
      Number(item.verificationMs),
    ])
  );

  return {
    gas: JSON.parse(line.slice(marker.length)),
    verificationMsByProtocol,
  };
}

function applyOnchainVerificationTiming(timing, protocolName, onchainGasResult) {
  if (isModelError(timing) || isModelError(onchainGasResult)) {
    return timing;
  }

  const onchainValue = onchainGasResult?.verificationMsByProtocol?.[protocolName];
  if (!Number.isFinite(onchainValue)) {
    return timing;
  }

  return {
    ...timing,
    verificationMs: onchainValue,
  };
}

function getErrorMessage(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return String(error);
}

function runWithModelError(modelName, fn) {
  try {
    return fn();
  } catch (error) {
    return {
      error: true,
      model: modelName,
      message: getErrorMessage(error),
    };
  }
}

function makeGasErrorResult(protocol, message) {
  return {
    protocol,
    supported: false,
    reason: message,
    verifyProofTxGas: null,
    submitComplianceProofGas: null,
  };
}

function isModelError(value) {
  return Boolean(value && typeof value === "object" && value.error === true);
}

function buildGasResult(onchainGasResult, halo2GasResult) {
  const protocols = ["PLONK", "FFLONK", "GROTH16", "NOIR"];

  if (isModelError(onchainGasResult) && isModelError(halo2GasResult)) {
    return {
      generatedAt: new Date().toISOString(),
      results: [
        ...protocols.map((p) => makeGasErrorResult(p, `Error on ${onchainGasResult.model}: ${onchainGasResult.message}`)),
        makeGasErrorResult("HALO2", `Error on ${halo2GasResult.model}: ${halo2GasResult.message}`),
      ],
    };
  }

  if (isModelError(onchainGasResult)) {
    return {
      generatedAt: new Date().toISOString(),
      results: [
        ...protocols.map((p) => makeGasErrorResult(p, `Error on ${onchainGasResult.model}: ${onchainGasResult.message}`)),
        halo2GasResult,
      ],
    };
  }

  if (isModelError(halo2GasResult)) {
    const filtered = (onchainGasResult?.results || []).filter(
      (entry) => entry.protocol?.toUpperCase() !== "HALO2"
    );
    return {
      ...onchainGasResult,
      results: [
        ...filtered,
        makeGasErrorResult("HALO2", `Error on ${halo2GasResult.model}: ${halo2GasResult.message}`),
      ],
    };
  }

  return appendUnsupportedGasEntries(mergeHalo2Gas(onchainGasResult, halo2GasResult));
}

function benchmarkOneRun() {
  const plonk = runWithModelError("PLONK", () =>
    benchmarkProtocol({
      name: "PLONK",
      cwd: plonkDir,
      requiredFiles: [
        { path: "circuit_final.zkey", label: "zkey" },
        { path: "witness.test.wtns", label: "witness" },
        { path: "verification_key.json", label: "verification key" },
      ],
      proveArgs: [
        "plonk",
        "prove",
        "circuit_final.zkey",
        "witness.test.wtns",
        "proof.bench.json",
        "public.bench.json",
      ],
      verifyArgs: [
        "plonk",
        "verify",
        "verification_key.json",
        "public.bench.json",
        "proof.bench.json",
      ],
    })
  );

  const fflonk = runWithModelError("FFLONK", () =>
    benchmarkProtocol({
      name: "FFLONK",
      cwd: fflonkDir,
      requiredFiles: [
        { path: "circuit_final.zkey", label: "zkey" },
        { path: "witness.test.wtns", label: "witness" },
        { path: "verification_key.json", label: "verification key" },
      ],
      proveArgs: [
        "fflonk",
        "prove",
        "circuit_final.zkey",
        "witness.test.wtns",
        "proof.bench.json",
        "public.bench.json",
      ],
      verifyArgs: [
        "fflonk",
        "verify",
        "verification_key.json",
        "public.bench.json",
        "proof.bench.json",
      ],
    })
  );

  const groth16 = runWithModelError("GROTH16", () =>
    benchmarkProtocol({
      name: "GROTH16",
      cwd: grothDir,
      requiredFiles: [
        { path: "circuit_final.zkey", label: "zkey" },
        { path: "witness.test.wtns", label: "witness" },
        { path: "verification_key.json", label: "verification key" },
      ],
      proveArgs: [
        "groth16",
        "prove",
        "circuit_final.zkey",
        "witness.test.wtns",
        "proof.bench.json",
        "public.bench.json",
      ],
      verifyArgs: [
        "groth16",
        "verify",
        "verification_key.json",
        "public.bench.json",
        "proof.bench.json",
      ],
    })
  );

  const noir = runWithModelError("NOIR", () => benchmarkNoirProtocol());

  const halo2 = runWithModelError("HALO2", () =>
    benchmarkRustProtocol({
      name: "HALO2",
      cwd: halo2Dir,
      bin: "circuit",
    })
  );

  const onchainGas = runWithModelError("ONCHAIN_GAS", () => runGasBenchmark());
  const halo2GasAndTiming = runWithModelError("HALO2_GAS", () => benchmarkHalo2Gas());
  const plonkWithOnchainVerification = applyOnchainVerificationTiming(plonk, "PLONK", onchainGas);
  const fflonkWithOnchainVerification = applyOnchainVerificationTiming(fflonk, "FFLONK", onchainGas);
  const groth16WithOnchainVerification = applyOnchainVerificationTiming(groth16, "GROTH16", onchainGas);
  const halo2WithOnchainVerification =
    !isModelError(halo2) && !isModelError(halo2GasAndTiming)
      ? { ...halo2, verificationMs: halo2GasAndTiming.verificationMs }
      : halo2;
  const gas = buildGasResult(
    isModelError(onchainGas) ? onchainGas : onchainGas.gas,
    isModelError(halo2GasAndTiming) ? halo2GasAndTiming : halo2GasAndTiming.gas
  );

  return {
    generatedAt: new Date().toISOString(),
    timings: {
      plonk: plonkWithOnchainVerification,
      fflonk: fflonkWithOnchainVerification,
      groth16: groth16WithOnchainVerification,
      noir,
      halo2: halo2WithOnchainVerification,
    },
    gas,
  };
}

function loadExistingRuns(outPath) {
  if (!existsSync(outPath)) {
    return [];
  }

  try {
    const parsed = JSON.parse(readFileSync(outPath, "utf8"));

    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (Array.isArray(parsed?.runs)) {
      return parsed.runs;
    }

    if (parsed?.generatedAt && parsed?.timings && parsed?.gas) {
      return [parsed];
    }

    return [];
  } catch {
    return [];
  }
}

function main() {
  const runResults = [];
  for (let i = 1; i <= RUN_COUNT; i += 1) {
    console.log(i);
    runResults.push(benchmarkOneRun());
  }

  const outPath = resolve(perfRoot, "benchmark-results.json");
  const previousRuns = loadExistingRuns(outPath);
  const report = {
    updatedAt: new Date().toISOString(),
    totalRuns: previousRuns.length + runResults.length,
    runs: [...previousRuns, ...runResults],
  };

  writeFileSync(outPath, JSON.stringify(report, null, 2));
}

main();
