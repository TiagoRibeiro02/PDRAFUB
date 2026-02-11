import { useState } from "react";
import * as snarkjs from "snarkjs";
import { buildPoseidon } from "circomlibjs";
import verificationKey from "../verification_key.json";

// Convert DID string to BigInt via hashing
async function didToBigInt(did: string): Promise<bigint> {
  const data = new TextEncoder().encode(did);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  // Convert hex hash to BigInt (take first 16 bytes to avoid overflow)
  return BigInt("0x" + hashHex.substring(0, 32));
}

async function generatePlonkZKP(userDid: string) {
  // Validate DID format
  if (!userDid.startsWith("did:")) {
    throw new Error("Invalid DID format. Expected format: did:zeroid:xxxx");
  }

  // Initialize Poseidon hash
  const poseidon = await buildPoseidon();
  
  // Circuit inputs - convert DID string to BigInt via hashing
  const DID = await didToBigInt(userDid);
  const status = BigInt(1);
  const r = BigInt(999888777); // Institution secret (this will be hidden)
  
  // Calculate commitment = Poseidon(DID, status, r)
  const commitmentHash = poseidon([DID, status, r]);
  const commitment = poseidon.F.toString(commitmentHash);
  
  // Generate proof with all inputs
  const { proof, publicSignals } = await snarkjs.plonk.fullProve(
    { DID: DID.toString(), status: status.toString(), commitment, r: r.toString() },
    "/circuit_js/circuit.wasm",
    "/circuit_final.zkey"
  );

  console.log("Proof: ");
  console.log(JSON.stringify(proof, null, 1));

  const res = await snarkjs.plonk.verify(verificationKey, publicSignals, proof);

  

  if (res === true) {
    console.log("Verification OK");
  } else {
    console.log("Invalid proof");
  }

  return { proof, publicSignals, commitment };
}

/*async function hashDid(did: string): Promise<string> {
  const data = new TextEncoder().encode(did);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}*/

export default function EntityApp() {
  const [did, setDid] = useState("");
  const [zkProof, setZkProof] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Entity - KYC Issuer</h1>

      <input
        placeholder="User DID"
        value={did}
        onChange={e => {
          setDid(e.target.value);
          setError(null);
        }}
        style={{ width: "100%", marginBottom: "1rem" }}
      />

      <button
        onClick={async () => {
          try {
            const proof = await generatePlonkZKP(did);
            setZkProof(proof);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
          }
        }}
        disabled={!did}
      >
        Generate PLONK ZK Proof
      </button>

      {error && (
        <p style={{ color: "red", marginTop: "1rem" }}>Error: {error}</p>
      )}

      {zkProof && (
        <>
          <h3>Zero-Knowledge Proof (PLONK)</h3>
          <pre>{JSON.stringify(zkProof, null, 2)}</pre>
        </>
      )}
    </div>
  );
}
