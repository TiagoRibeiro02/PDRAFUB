import { execFileSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const repoRoot = resolve(process.cwd(), "..");
const perfRoot = resolve(process.cwd());
const plonkDir = resolve(perfRoot, "plonk");
const fflonkDir = resolve(perfRoot, "fflonk");
const grothDir = resolve(perfRoot, "groth16");
const plonky3Dir = resolve(perfRoot, "plonky3");
const halo2Dir = resolve(perfRoot, "halo2", "circuit");
const nftsDir = resolve(repoRoot, "nfts");

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
  execFileSync(command, args, { cwd, stdio: "inherit" });
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

function benchmarkRustProtocol({ name, cwd, bin }) {
  ensureFile(resolve(cwd, "Cargo.toml"), `${name} Cargo.toml`);
  ensureFile(resolve(cwd, "src", "main.rs"), `${name} main.rs`);

  const args = ["run", "--release"];
  if (bin) {
    args.push("--bin", bin);
  }
  args.push("--", "--bench-json");

  const output = execFileSync("cargo", args, {
    cwd,
    encoding: "utf8",
  });

  process.stdout.write(output);

  const parsed = parseBenchTimingsFromOutput(output, name);
  return {
    proofGenerationMs: Number(parsed.proofGenerationMs),
    verificationMs: Number(parsed.verificationMs),
  };
}

function appendUnsupportedGasEntries(gas) {
  const existing = new Set((gas?.results || []).map((item) => item.protocol?.toUpperCase()));
  const missingProtocols = ["PLONKY3", "HALO2"].filter((p) => !existing.has(p));

  if (missingProtocols.length === 0) {
    return gas;
  }

  const additions = missingProtocols.map((protocol) => ({
    protocol,
    supported: false,
    reason:
      "No Solidity verifier adapter is configured for this protocol in nfts/scripts/benchmark-zkp.js.",
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

  process.stdout.write(artifactOutput);

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

  process.stdout.write(gasOutput);

  const marker = "BENCHMARK_HALO2_GAS_JSON=";
  const line = gasOutput
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith(marker));

  if (!line) {
    throw new Error("Could not parse HALO2 gas benchmark output");
  }

  return JSON.parse(line.slice(marker.length));
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
  });

  process.stdout.write(output);

  const marker = "BENCHMARK_GAS_JSON=";
  const line = output
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith(marker));

  if (!line) {
    throw new Error("Could not parse gas benchmark output");
  }

  return JSON.parse(line.slice(marker.length));
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
  const plonk = benchmarkProtocol({
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
  });

  const fflonk = benchmarkProtocol({
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
  });

  const groth16 = benchmarkProtocol({
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
  });

  const plonky3 = benchmarkRustProtocol({
    name: "PLONKY3",
    cwd: plonky3Dir,
  });

  const halo2 = benchmarkRustProtocol({
    name: "HALO2",
    cwd: halo2Dir,
    bin: "circuit",
  });

  const onchainGas = runGasBenchmark();
  const halo2Gas = benchmarkHalo2Gas();
  const gas = appendUnsupportedGasEntries(mergeHalo2Gas(onchainGas, halo2Gas));

  const currentRun = {
    generatedAt: new Date().toISOString(),
    timings: {
      plonk,
      fflonk,
      groth16,
      plonky3,
      halo2,
    },
    gas,
  };

  const outPath = resolve(perfRoot, "benchmark-results.json");
  const previousRuns = loadExistingRuns(outPath);
  const report = {
    updatedAt: new Date().toISOString(),
    totalRuns: previousRuns.length + 1,
    runs: [...previousRuns, currentRun],
  };

  writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log("\n=== ZKP BENCHMARK SUMMARY ===");
  console.log(JSON.stringify(currentRun, null, 2));
  console.log(`\nTotal stored runs: ${report.totalRuns}`);
  console.log(`\nSaved report to: ${outPath}`);
}

main();
