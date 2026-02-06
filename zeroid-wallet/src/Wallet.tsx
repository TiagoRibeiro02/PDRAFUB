import { useEffect, useState } from "react";

type DID = `did:${string}`;

interface StoredIdentity {
  did: DID;
  didDocument: object;
  publicKeyJwk: object;
  privateKeyJwk: object;
}

const boxStyle: React.CSSProperties = {
  background: "#111",
  color: "#ffff",
  padding: "1rem",
  borderRadius: "6px",
  fontSize: "0.85rem",
  overflowX: "auto"
};

const STORAGE_KEY = "zeroid_wallet";

async function generateDid(): Promise<any> {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,//exportable
    ["sign", "verify"]
  );

  const publicKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);

  const privateKeyJwk = await crypto.subtle.exportKey(
    "jwk",
    keyPair.privateKey
  );


  const did = `did:zeroid:${crypto.randomUUID()}`;

  const didDocument = {
    "@context": "https://www.w3.org/ns/did/v1",
    id: did,
    verificationMethod: [
      {
        id: `${did}#key-1`,
        type: "JsonWebKey2020",
        controller: did,
        publicKeyJwk,
      },
    ],
    authentication: [`${did}#key-1`],
  };

  return {
    did,
    didDocument,
    publicKeyJwk,
    privateKeyJwk,
  };
}

//anu Qrng para true random

export default function Wallet() {
  const [identity, setIdentity] = useState<StoredIdentity | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: StoredIdentity = JSON.parse(stored);
        setIdentity(parsed);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const createIdentity = async () => {
    const id = await generateDid();

    const storedIdentity = {
      did: id.did,
      didDocument: id.didDocument,
      publicKeyJwk: id.publicKeyJwk,
      privateKeyJwk: id.privateKeyJwk,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedIdentity));

    setIdentity(storedIdentity);
  };

  return (
    <div style={{ padding: "2rem" }}>
      {!identity ? (
        <>
          <h2>ZeroID Wallet</h2>
          <p>You don't have a DID yet.</p>
          <button onClick={createIdentity}>Create DID</button>
        </>
      ) : (
        <div style={{ marginTop: "2rem" }}>
          <h2>Decentralized Identity</h2>

          <div style={{ marginBottom: "1rem" }}>
            <strong>DID</strong>
            <pre style={boxStyle}>{identity.did}</pre>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <strong>KEYS</strong>
            <hr />

            <label>Public Key</label>
            <pre style={boxStyle}>
              {JSON.stringify(identity.publicKeyJwk, null, 2)}
            </pre>

            <label>Private Key</label>
            <pre style={{ ...boxStyle, color: "#b00020" }}>
              {JSON.stringify(identity.privateKeyJwk, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
