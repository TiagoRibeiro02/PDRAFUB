import { execFileSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const repoRoot = resolve(process.cwd(), "..");
const perfRoot = resolve(process.cwd());
const nftsDir = resolve(repoRoot, "nfts");
const resultsPath = resolve(perfRoot, "benchmark-nft-results.json");

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

function runNftGasBenchmark() {
  ensureTestnetEnv();

  const output = execFileSync("npm", ["run", "benchmark:nft-gas"], {
    cwd: nftsDir,
    encoding: "utf8",
  });

  process.stdout.write(output);

  const marker = "BENCHMARK_NFT_GAS_JSON=";
  const line = output
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith(marker));

  if (!line) {
    throw new Error("Could not parse NFT gas benchmark output");
  }

  return JSON.parse(line.slice(marker.length));
}

function loadExistingResults() {
  if (!existsSync(resultsPath)) {
    return {
      updatedAt: new Date().toISOString(),
      totalRuns: 0,
      runs: [],
    };
  }

  try {
    const parsed = JSON.parse(readFileSync(resultsPath, "utf8"));

    if (Array.isArray(parsed)) {
      return {
        updatedAt: new Date().toISOString(),
        totalRuns: parsed.length,
        runs: parsed,
      };
    }

    if (Array.isArray(parsed?.nftGasRuns)) {
      return {
        updatedAt: parsed.updatedAt || new Date().toISOString(),
        totalRuns: parsed.nftGasRuns.length,
        runs: parsed.nftGasRuns,
      };
    }

    return {
      updatedAt: parsed.updatedAt || new Date().toISOString(),
      totalRuns: parsed.totalRuns || (Array.isArray(parsed.runs) ? parsed.runs.length : 0),
      runs: Array.isArray(parsed.runs) ? parsed.runs : [],
    };
  } catch {
    return {
      updatedAt: new Date().toISOString(),
      totalRuns: 0,
      runs: [],
    };
  }
}

function main() {
  const nftGasRun = {
    generatedAt: new Date().toISOString(),
    ...runNftGasBenchmark(),
  };

  const existing = loadExistingResults();
  const report = {
    updatedAt: new Date().toISOString(),
    totalRuns: existing.runs.length + 1,
    runs: [...existing.runs, nftGasRun],
  };

  writeFileSync(resultsPath, JSON.stringify(report, null, 2));

  console.log("\n=== NFT GAS BENCHMARK SUMMARY ===");
  console.log(JSON.stringify(nftGasRun, null, 2));
  console.log(`\nTotal stored NFT gas runs: ${report.totalRuns}`);
  console.log(`\nSaved report to: ${resultsPath}`);
}

main();
