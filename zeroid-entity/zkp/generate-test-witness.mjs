import { buildPoseidon } from "circomlibjs";
import { createHash } from "crypto";
import { execFileSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";

const zkpDir = resolve(process.cwd(), "zkp");

const did = process.argv[2] || "did:zeroid:test-user-001";
const status = 1n;
const r = 999888777n;

const hashHex = createHash("sha256").update(did).digest("hex");
const DID = BigInt("0x" + hashHex.substring(0, 32));

const poseidon = await buildPoseidon();
const commitmentHash = poseidon([DID, status, r]);
const commitment = poseidon.F.toString(commitmentHash);

const input = {
  DID: DID.toString(),
  status: status.toString(),
  commitment,
  r: r.toString(),
};

const inputPath = resolve(zkpDir, "input.test.json");
const witnessPath = resolve(zkpDir, "witness.test.wtns");
const wasmPath = resolve(zkpDir, "circuit_js", "circuit.wasm");

mkdirSync(dirname(inputPath), { recursive: true });
writeFileSync(inputPath, JSON.stringify(input, null, 2));

if (!existsSync(wasmPath)) {
  throw new Error(`WASM not found at ${wasmPath}`);
}

execFileSync(
  "npx",
  ["snarkjs", "wtns", "calculate", wasmPath, inputPath, witnessPath],
  { stdio: "inherit" }
);

console.log("Generated test witness artifacts:");
console.log(`- DID source: ${did}`);
console.log(`- Input: ${inputPath}`);
console.log(`- Witness: ${witnessPath}`);
console.log(`- Commitment: ${commitment}`);
