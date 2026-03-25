import { execFileSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const repoRoot = resolve(process.cwd(), "..");
const perfRoot = resolve(process.cwd());
const plonkDir = resolve(perfRoot, "plonk");
const fflonkDir = resolve(perfRoot, "fflonk");
const grothDir = resolve(perfRoot, "groth16");
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

function runGasBenchmark() {
  ensureTestnetEnv();

  const output = execFileSync("npm", ["run", "benchmark:zkp"], {
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

  const gas = runGasBenchmark();

  const currentRun = {
    generatedAt: new Date().toISOString(),
    timings: {
      plonk,
      fflonk,
      groth16,
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
