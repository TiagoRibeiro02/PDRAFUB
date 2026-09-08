import { execFileSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const repoRoot = resolve(process.cwd(), "..");
const perfRoot = resolve(process.cwd());
const nftsDir = resolve(repoRoot, "nfts");
const localTmpDir = resolve(perfRoot, ".tmp");
const resultsPath = resolve(perfRoot, "benchmark-signed-results.json");
const RUN_COUNT = 1000;

function loadEnvFromNfts() {
  const envPath = resolve(nftsDir, ".env");
  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
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

function runSignedCredentialBenchmark() {
  ensureTestnetEnv();

  mkdirSync(localTmpDir, { recursive: true });

  const output = execFileSync("npm", ["run", "benchmark:signed-credential:local"], {
    cwd: nftsDir,
    encoding: "utf8",
    env: { ...process.env, TMPDIR: process.env.TMPDIR || localTmpDir },
  });

  const timingMarker = "BENCHMARK_TIMINGS_JSON=";
  const gasMarker = "BENCHMARK_GAS_JSON=";

  const timingLine = output
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith(timingMarker));
  const gasLine = output
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith(gasMarker));

  if (!timingLine) {
    throw new Error("Could not parse signed credential benchmark timing output");
  }

  if (!gasLine) {
    throw new Error("Could not parse signed credential benchmark gas output");
  }

  return {
    timings: JSON.parse(timingLine.slice(timingMarker.length)),
    gas: JSON.parse(gasLine.slice(gasMarker.length)),
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
    const benchmark = runSignedCredentialBenchmark();
    runResults.push({
      generatedAt: new Date().toISOString(),
      timings: { signed: benchmark.timings },
      gas: benchmark.gas,
    });
  }

  const previousRuns = loadExistingRuns(resultsPath);
  const report = {
    updatedAt: new Date().toISOString(),
    totalRuns: previousRuns.length + runResults.length,
    runs: [...previousRuns, ...runResults],
  };

  writeFileSync(resultsPath, JSON.stringify(report, null, 2));
  console.log(`Generated signed benchmark runs in: ${resultsPath}`);
}

main();