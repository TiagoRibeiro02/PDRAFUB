import { useState, useEffect } from "react";
import BankNFTManager from "./BankNFTManager";
import { QRCodeSVG } from "qrcode.react";
import { generateEntityQRSession, registerEntitySession, verifyWalletResponse, jwkToCompressed, getOnChainPublicKey, type EntityQRSession } from "./utils/qrAuth";
import UserPicker, { type BankUser } from './components/UserPicker';
import "./App.css";

// Import contract address and ABI
let contractAddress: string | undefined;
let MyNFTABI: any;
let kycContractAddress: string | undefined;
let KYCComplianceABI: any;

try {
  const addressData = await import('./contracts/contract-address.json');
  const abiData = await import('./contracts/MyNFT.json');
  contractAddress = addressData.MyNFT;
  MyNFTABI = abiData.abi;
} catch (error) {
  console.warn('Contract files not found. Please deploy the contract first.');
}

try {
  const kycDeployment = await import('./contracts/kyc-deployment.json');
  const kycAbi = await import('./contracts/KYCCompliance.json');
  kycContractAddress = kycDeployment.KYCCompliance;
  KYCComplianceABI = kycAbi.abi;
} catch (error) {
  console.warn('KYC contract files not found. Please deploy the KYC contract first.');
}

type TabType = 'nft-bank' | 'zkp-issuer';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('nft-bank');
  const [entityUser, setEntityUser] = useState<any>(
    JSON.parse(localStorage.getItem('entity_user') || 'null')
  );

  const handleLogout = () => {
    localStorage.removeItem('entity_user');
    window.location.href = '/login';
  };

  useEffect(() => {
    // Fetch fresh entity data from the DB
    const stored = JSON.parse(localStorage.getItem('entity_user') || 'null');
    if (stored?.id) {
      fetch(`http://localhost:8001/me.php?user_id=${stored.id}`)
        .then(r => r.json())
        .then(res => {
          if (res.success) {
            const updated = { ...stored, ...res.data };
            localStorage.setItem('entity_user', JSON.stringify(updated));
            setEntityUser(updated);
          }
        })
        .catch(() => {}); // keep cached data on network error
    }
  }, []);

  return (
    <div className="entity-app">
      <div className="entity-header">
        <div className="entity-header-top">
          <h1 className="entity-title">{entityUser.entity_name} - ZeroID System</h1>
          {entityUser && (
            <div className="entity-user-info">
              <span className="entity-logged-in">
                Logged in as <strong>{entityUser.username}</strong>
              </span>
              <button
                onClick={handleLogout}
                className="entity-logout-btn"
              >
                Logout
              </button>
            </div>
          )}
        </div>

        <div className="entity-tabs">
          <button 
            className={`entity-tab-btn ${activeTab === 'nft-bank' ? 'active' : ''}`}
            onClick={() => setActiveTab('nft-bank')}
          >
            NFT Bank
          </button>
          <button 
            className={`entity-tab-btn ${activeTab === 'zkp-issuer' ? 'active' : ''}`}
            onClick={() => setActiveTab('zkp-issuer')}
          >
            ZK Proof Issuer
          </button>
        </div>

      </div>

      {activeTab === 'nft-bank' && (
        contractAddress && MyNFTABI ? (
          <BankNFTManager 
            contractAddress={contractAddress}
            contractABI={MyNFTABI}
          />
        ) : (
          <div className="entity-contract-missing">
            <h2>NFT Contract Not Found</h2>
            <p className="entity-contract-missing-text">
              Please deploy the NFT contract first.
            </p>
          </div>
        )
      )}

      {activeTab === 'zkp-issuer' && (
        <ZKPIssuer />
      )}
    </div>
  );
}

// Original ZKP Issuer component
function ZKPIssuer() {
  const entityUser = JSON.parse(localStorage.getItem('entity_user') || 'null');
  const bankApiUrl: string = entityUser?.entity_api ?? 'http://localhost:8002/bank1_api.php';
  const kycIssuer: string = entityUser?.entity_name || entityUser?.entity_did || 'did:zeroid:unknown';

  const [did, setDid] = useState("");
  const [kycExpiryDate, setKycExpiryDate] = useState<string>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 2);
    return d.toISOString().split('T')[0];
  });
  const [zkProof, setZkProof] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [account, setAccount] = useState("");
  const [showQRRequest, setShowQRRequest] = useState(false);
  const [entitySession, setEntitySession] = useState<EntityQRSession | null>(null);
  const [selectedBankUser, setSelectedBankUser] = useState<BankUser | null>(null);
  // Compressed 33-byte secp256k1/P-256 public key stored on-chain: { pkX (bytes32 hex), pkParity (bool) }
  const [compressedPk, setCompressedPk] = useState<{ pkX: string; pkParity: boolean } | null>(null);

  useEffect(() => {
    checkWallet();
  }, []);

  // Poll relay server for wallet response
  useEffect(() => {
    if (!entitySession) return;
    const { sessionId, challenge } = entitySession.qrPayload;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:8000/qr-relay.php?sessionId=${sessionId}`);
        const result   = await response.json();

        if (result.success && result.data) {
          try {
            const { did, ethAddress, publicKey } = await verifyWalletResponse(
              result.data, sessionId, challenge, entitySession.secretKey
            );

            // ── Blockchain public-key check ──────────────────────────────
            let compressed: { pkX: string; pkParity: boolean } | null = null;
            if (publicKey) {
              try {
                compressed = jwkToCompressed(JSON.parse(publicKey) as JsonWebKey);
                const onChainHex = await getOnChainPublicKey(did, kycContractAddress!, KYCComplianceABI);
                if (onChainHex && onChainHex !== '0x') {
                  // Key already registered — compare x and parity
                  const onChainParity = onChainHex.slice(2, 4) === '03';
                  const onChainX     = onChainHex.slice(4).toLowerCase();
                  if (
                    onChainX !== compressed.pkX.slice(2).toLowerCase() ||
                    onChainParity !== compressed.pkParity
                  ) {
                    alert(
                      'Security error: the public key presented by the wallet does not match ' +
                      'the key registered on the blockchain for this DID.\n\n' +
                      'Possible key substitution attack — request rejected.'
                    );
                    setShowQRRequest(false);
                    setEntitySession(null);
                    return;
                  }
                  console.log('On-chain PK verified ✓');
                } else {
                  console.log('No on-chain PK yet — will be registered on first submission.');
                }
              } catch (pkErr: any) {
                console.warn('Blockchain PK check skipped:', pkErr.message);
              }
            }

            setDid(did);
            if (ethAddress) console.log('Received eth address:', ethAddress);
            if (publicKey)  { /* raw JWK kept in payload only — compressed form is in compressedPk */ }
            if (compressed) setCompressedPk(compressed);
            setShowQRRequest(false);
            setEntitySession(null);
          } catch (verifyErr: any) {
            console.error('QR mutual-auth verification failed:', verifyErr);
            alert(`Security error: ${verifyErr.message}\n\nPossible man-in-the-middle attack — request rejected.`);
          }
        }
      } catch (err) {
        console.error('Error polling for response:', err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [entitySession]);

  const generateQRRequest = async () => {
    try {
      const session = await generateEntityQRSession();
      await registerEntitySession(session.relayRegistration);
      setEntitySession(session);
      setSelectedBankUser(null);
      setCompressedPk(null);
      setShowQRRequest(true);
    } catch (err: any) {
      alert('Failed to create QR session: ' + (err?.message ?? err));
    }
  };

  const checkWallet = async () => {
    if (typeof window.ethereum === 'undefined') return;
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) setAccount(accounts[0]);
    } catch (err) {
      console.error('Error checking wallet:', err);
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask!');
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
    } catch (err: any) {
      console.error('Failed to connect wallet:', err);
    }
  };

  return (
    <div className="zkp-issuer">
      <h2>Entity - KYC Issuer</h2>
      <p className="zkp-subtitle">
        Generate zero-knowledge proofs for user DIDs
      </p>

      <UserPicker
        selectedUser={selectedBankUser}
        onSelect={setSelectedBankUser}
        label="Bank User"
        apiUrl={bankApiUrl}
      />

      <div className="zkp-form-row">
        <input
          placeholder="User DID (e.g., did:zeroid:...)"
          value={did}
          onChange={e => {
            setDid(e.target.value);
            setError(null);
          }}
          className="zkp-did-input ui-input-dark"
        />
        <div className="zkp-expiry-wrap">
          <label className="zkp-expiry-label">KYC Expiry Date</label>
          <input
            type="date"
            value={kycExpiryDate}
            onChange={e => setKycExpiryDate(e.target.value)}
            className="zkp-expiry-input ui-input-dark"
          />
        </div>
        <button
          onClick={generateQRRequest}
          className="zkp-btn zkp-btn-gold ui-btn ui-btn-gold"
        >
          Request via QR
        </button>
      </div>

      <div className="zkp-wallet-row">
        {!account ? (
          <button
            onClick={connectWallet}
            className="zkp-btn zkp-btn-gold ui-btn ui-btn-gold"
          >
            Connect Wallet
          </button>
        ) : (
          <div className="zkp-wallet-chip">
            Connected: {account.substring(0, 6)}...{account.substring(38)}
          </div>
        )}
      </div>

      <div className="zkp-actions-row">
        <button
          onClick={async () => {
            try {
              setError(null);
              setSubmitSuccess(false);
              const proof = await generatePlonkZKP(did);
              setZkProof(proof);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Unknown error");
            }
          }}
          disabled={!did}
          className={`zkp-btn ui-btn ${did ? 'zkp-btn-gold ui-btn-gold' : 'zkp-btn-disabled ui-btn-disabled'}`}
        >
          Generate PLONK ZK Proof
        </button>

        {zkProof && kycContractAddress && account && (
          <button
            onClick={async () => {
              try {
                setSubmitting(true);
                setError(null);
                // Public key is stored on-chain inside submitComplianceProof (first time)
                // or was already verified against on-chain record during QR scan.
                await submitProofToContract(
                  did,
                  zkProof,
                  kycIssuer,
                  new Date(kycExpiryDate).getTime() / 1000,
                  compressedPk?.pkX,
                  compressedPk?.pkParity,
                );
                // Update KYC flag in the bank DB for UI display
                if (selectedBankUser) {
                  try {
                    const res = await fetch(bankApiUrl, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'set_kyc', userId: selectedBankUser.id }),
                    });
                    const data = await res.json();
                    if (!data.success) console.warn('set_kyc failed:', data.message);
                  } catch (kycErr) {
                    console.warn('Failed to set KYC in bank DB:', kycErr);
                  }
                }
                setSubmitSuccess(true);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to submit proof");
              } finally {
                setSubmitting(false);
              }
            }}
            disabled={submitting}
            className="zkp-btn zkp-btn-gold ui-btn ui-btn-gold"
          >
            {submitting ? 'Submitting...' : 'Submit to Blockchain'}
          </button>
        )}
      </div>

      {error && (
        <p className="zkp-error">
          Error: {error}
        </p>
      )}

      {submitSuccess && (
        <div className="zkp-success">
          Proof successfully submitted to blockchain! The DID is now marked as KYC/AML compliant.
        </div>
      )}

      {/* QR Code Request Modal */}
      {showQRRequest && (
        <div className="zkp-modal-overlay ui-modal-overlay">
          <div className="zkp-modal ui-modal-panel">
            <button
              onClick={() => {
                setShowQRRequest(false);
                setEntitySession(null);
                setSelectedBankUser(null);
              }}
              className="zkp-modal-close ui-modal-close"
            >
              ✕
            </button>
            <h3 className="zkp-modal-title">Scan with Wallet</h3>
            <p className="zkp-modal-subtitle">
              Open your ZeroID Wallet and scan this QR code to share your DID
            </p>
            <div className="zkp-modal-qr-box">
              <QRCodeSVG 
                value={entitySession ? JSON.stringify(entitySession.qrPayload) : ''}
                size={256}
              />
            </div>
            <p className="zkp-modal-wait">
              Waiting for wallet response...
            </p>
          </div>
        </div>
      )}

      {zkProof && (
        <div className="zkp-proof-section">
          <h3>✓ Proof Generated</h3>
          <div className="zkp-proof-card">
            <h4>Proof:</h4>
            <pre className="zkp-proof-pre">
              {JSON.stringify(zkProof.proof, null, 2)}
            </pre>

            <h4 className="zkp-proof-subtitle">Public Signals:</h4>
            <pre className="zkp-proof-pre">
              {JSON.stringify(zkProof.publicSignals, null, 2)}
            </pre>

            <h4 className="zkp-proof-subtitle">Commitment:</h4>
            <pre className="zkp-proof-pre">
              {zkProof.commitment}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ZKP generation functions
async function didToBigInt(did: string): Promise<bigint> {
  const data = new TextEncoder().encode(did);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return BigInt("0x" + hashHex.substring(0, 32));
}

async function generatePlonkZKP(userDid: string) {
  const snarkjs = await import("snarkjs");
  const { buildPoseidon } = await import("circomlibjs");
  const verificationKey = await import("../zkp/verification_key.json");

  if (!userDid.startsWith("did:")) {
    throw new Error("Invalid DID format. Expected format: did:zeroid:xxxx");
  }

  const poseidon = await buildPoseidon();
  const DID = await didToBigInt(userDid);
  const status = BigInt(1);
  const r = BigInt(999888777);
  
  const commitmentHash = poseidon([DID, status, r]);
  const commitment = poseidon.F.toString(commitmentHash);
  
  const { proof, publicSignals } = await snarkjs.plonk.fullProve(
    { DID: DID.toString(), status: status.toString(), commitment, r: r.toString() },
    "/zkp/circuit_js/circuit.wasm",
    "/zkp/circuit_final.zkey"
  );

  const res = await snarkjs.plonk.verify(verificationKey, publicSignals, proof);

  if (res === true) {
    console.log("Verification OK");
  } else {
    console.log("Invalid proof");
  }

  return { proof, publicSignals, commitment };
}

async function submitProofToContract(
  userDid: string,
  zkProof: any,
  kycIssuer: string,
  expiryTimestamp: number,
  pkX?: string,
  pkParity?: boolean,
) {
  if (!kycContractAddress || !KYCComplianceABI) {
    throw new Error("KYC contract not deployed. Please deploy it first.");
  }

  const { ethers } = await import("ethers");
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  
  const kycContract = new ethers.Contract(
    kycContractAddress,
    KYCComplianceABI,
    signer
  );

  // Convert proof to bytes
  // The proof structure from snarkjs needs to be flattened
  const proofArray = [
    zkProof.proof.A[0], zkProof.proof.A[1],
    zkProof.proof.B[0], zkProof.proof.B[1],
    zkProof.proof.C[0], zkProof.proof.C[1],
    zkProof.proof.Z[0], zkProof.proof.Z[1],
    zkProof.proof.T1[0], zkProof.proof.T1[1],
    zkProof.proof.T2[0], zkProof.proof.T2[1],
    zkProof.proof.T3[0], zkProof.proof.T3[1],
    zkProof.proof.Wxi[0], zkProof.proof.Wxi[1],
    zkProof.proof.Wxiw[0], zkProof.proof.Wxiw[1],
    zkProof.proof.eval_a,
    zkProof.proof.eval_b,
    zkProof.proof.eval_c,
    zkProof.proof.eval_s1,
    zkProof.proof.eval_s2,
    zkProof.proof.eval_zw
  ];

  // Encode as bytes
  const proofBytes = ethers.AbiCoder.defaultAbiCoder().encode(
    ["uint256[24]"],
    [proofArray]
  );

  // Submit to contract — pkX/pkParity register the compressed public key on-chain.
  // Pass ZeroHash on subsequent calls (key already on chain from first submission).
  const { ZeroHash } = await import('ethers');
  const tx = await kycContract.submitComplianceProof(
    userDid,
    zkProof.commitment,
    kycIssuer,
    Math.floor(expiryTimestamp),
    pkX  ?? ZeroHash,   // bytes32 x-coordinate (0x00…00 = skip)
    pkParity ?? false,  // parity prefix: true → 0x03, false → 0x02
    proofBytes,
    zkProof.publicSignals
  );

  console.log("Transaction sent:", tx.hash);
  await tx.wait();
  console.log("Proof submitted successfully!");
}
