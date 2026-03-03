import { useState, useEffect } from "react";
import BankNFTManager from "./BankNFTManager";
import { QRCodeSVG } from "qrcode.react";
import { generateEntityQRSession, registerEntitySession, verifyWalletResponse, type EntityQRSession } from "./utils/qrAuth";
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
  const [account, setAccount] = useState<string>('');

  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ 
          method: 'eth_accounts' 
        });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        }
      } catch (err) {
        console.error('Error checking wallet connection:', err);
      }
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask to use this app!');
      return;
    }

    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      setAccount(accounts[0]);

      // Switch to localhost network
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x539' }], // 1337 in hex
        });
      } catch (switchError: any) {
        // Chain hasn't been added yet
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x539',
              chainName: 'Localhost 8545',
              rpcUrls: ['http://127.0.0.1:8545'],
            }],
          });
        }
      }
    } catch (err: any) {
      console.error('Failed to connect wallet:', err);
    }
  };

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '0.75rem 1.5rem',
    background: isActive ? 'rgb(202, 165, 97)' : '#333',
    color: 'white',
    border: 'none',
    borderRadius: '6px 6px 0 0',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: isActive ? 'bold' : 'normal',
    transition: 'all 0.2s',
    marginRight: '0.5rem'
  });

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', borderRadius: '12px' }}>
      <div style={{ 
        background: '#1a1a1a', 
        padding: '1rem 2rem', 
        borderBottom: '2px solid #333',
        marginBottom: '1rem',
        borderRadius: '12px 12px 0 0',
      }}>
        <h1 style={{ margin: '0 0 1rem 0' }}>Bank Entity - ZeroID System</h1>
        
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button 
            style={tabStyle(activeTab === 'nft-bank')}
            onClick={() => setActiveTab('nft-bank')}
          >
            NFT Bank
          </button>
          <button 
            style={tabStyle(activeTab === 'zkp-issuer')}
            onClick={() => setActiveTab('zkp-issuer')}
          >
            ZK Proof Issuer
          </button>
        </div>

        {activeTab === 'nft-bank' && (
          <div style={{
            background: '#fef3cd',
            padding: '0.75rem',
            borderRadius: '6px',
            color: '#856404',
            fontSize: '0.9rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <strong>Contract:</strong> {contractAddress || <em>Not deployed</em>}
              {' | '}
              <strong>Network:</strong> Localhost:8545 (Chain ID: 1337)
            </div>
            {!account && (
              <button 
                onClick={connectWallet}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#1565c0',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 'bold'
                }}
              >
                Connect Wallet
              </button>
            )}
            {account && (
              <div style={{ fontSize: '0.85rem' }}>
                Connected: {account.substring(0, 6)}...{account.substring(38)}
              </div>
            )}
          </div>
        )}
      </div>

      {activeTab === 'nft-bank' && (
        contractAddress && MyNFTABI ? (
          <BankNFTManager 
            contractAddress={contractAddress}
            contractABI={MyNFTABI}
          />
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h2>NFT Contract Not Found</h2>
            <p style={{ color: '#888' }}>
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

  useEffect(() => {
    checkWallet();
  }, []);

  // Poll relay server for wallet response
  useEffect(() => {
    if (!entitySession) return;
    const { sessionId, challenge, entitySignature } = entitySession.qrPayload;
    const { encryptionPrivateKey } = entitySession;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:8000/qr-relay.php?sessionId=${sessionId}`);
        const result   = await response.json();

        if (result.success && result.data) {
          try {
            const { did, ethAddress } = await verifyWalletResponse(
              result.data, sessionId, challenge, entitySignature, encryptionPrivateKey
            );
            setDid(did);
            if (ethAddress) console.log('Received eth address:', ethAddress);
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
    <div style={{ padding: "2rem" }}>
      <h2>Entity - KYC Issuer</h2>
      <p style={{ color: '#888', marginBottom: '1rem' }}>
        Generate zero-knowledge proofs for user DIDs
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          placeholder="User DID (e.g., did:zeroid:...)"
          value={did}
          onChange={e => {
            setDid(e.target.value);
            setError(null);
          }}
          style={{ 
            flex: '1',
            padding: '0.75rem',
            background: '#1a1a1a',
            border: '1px solid #333',
            color: 'white',
            borderRadius: '6px'
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.75rem', color: '#888' }}>KYC Expiry Date</label>
          <input
            type="date"
            value={kycExpiryDate}
            onChange={e => setKycExpiryDate(e.target.value)}
            style={{ 
              padding: '0.75rem',
              background: '#1a1a1a',
              border: '1px solid #333',
              color: 'white',
              borderRadius: '6px'
            }}
          />
        </div>
        <button
          onClick={generateQRRequest}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'rgb(202, 165, 97)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold',
            whiteSpace: 'nowrap'
          }}
        >
          Request via QR
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        {!account ? (
          <button
            onClick={connectWallet}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'rgb(202, 165, 97)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}
          >
            Connect Wallet
          </button>
        ) : (
          <div style={{ 
            padding: '0.75rem 1.5rem',
            background: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '6px',
            color: '#888'
          }}>
            Connected: {account.substring(0, 6)}...{account.substring(38)}
          </div>
        )}
      </div>

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
        style={{
          padding: '0.75rem 1.5rem',
          background: did ? 'rgb(202, 165, 97)' : '#333',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: did ? 'pointer' : 'not-allowed',
          fontSize: '1rem',
          fontWeight: 'bold',
          marginRight: '1rem'
        }}
      >
        Generate PLONK ZK Proof
      </button>

      {zkProof && kycContractAddress && account && (
        <button
          onClick={async () => {
            try {
              setSubmitting(true);
              setError(null);
              await submitProofToContract(did, zkProof, new Date(kycExpiryDate).getTime() / 1000);
              setSubmitSuccess(true);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to submit proof");
            } finally {
              setSubmitting(false);
            }
          }}
          disabled={submitting}
          style={{
            padding: '0.75rem 1.5rem',
            background: submitting ? '#666' : 'rgb(202, 165, 97)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: submitting ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold'
          }}
        >
          {submitting ? 'Submitting...' : 'Submit to Blockchain'}
        </button>
      )}

      {error && (
        <p style={{ color: "#ff6b6b", marginTop: "1rem", padding: '1rem', background: '#2a1a1a', borderRadius: '6px' }}>
          Error: {error}
        </p>
      )}

      {submitSuccess && (
        <div style={{ 
          color: "#4CAF50", 
          marginTop: "1rem", 
          padding: '1rem', 
          background: '#1a2a1a', 
          borderRadius: '6px',
          border: '1px solid #4CAF50'
        }}>
          Proof successfully submitted to blockchain! The DID is now marked as KYC/AML compliant.
        </div>
      )}

      {/* QR Code Request Modal */}
      {showQRRequest && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#1a1a1a',
            padding: '2rem',
            borderRadius: '12px',
            maxWidth: '500px',
            position: 'relative',
            border: '2px solid #333'
          }}>
            <button
              onClick={() => {
                setShowQRRequest(false);
                setEntitySession(null);
              }}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'transparent',
                border: 'none',
                color: '#888',
                fontSize: '1.5rem',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
            <h3 style={{ marginTop: 0 }}>Scan with Wallet</h3>
            <p style={{ color: '#888', marginBottom: '1.5rem' }}>
              Open your ZeroID Wallet and scan this QR code to share your DID
            </p>
            <div style={{
              background: 'white',
              padding: '1rem',
              borderRadius: '8px',
              display: 'inline-block'
            }}>
              <QRCodeSVG 
                value={entitySession ? JSON.stringify(entitySession.qrPayload) : ''}
                size={256}
              />
            </div>
            <p style={{ color: 'rgb(202, 165, 97)', marginTop: '1rem', fontSize: '0.9rem', fontWeight: 'bold' }}>
              Waiting for wallet response...
            </p>
          </div>
        </div>
      )}

      {zkProof && (
        <div style={{ marginTop: "2rem" }}>
          <h3>✓ Proof Generated</h3>
          <div style={{
            background: '#1a1a1a',
            padding: '1rem',
            borderRadius: '6px',
            marginTop: '1rem'
          }}>
            <h4>Proof:</h4>
            <pre style={{ 
              overflow: "auto", 
              fontSize: "0.8rem",
              background: '#0a0a0a',
              padding: '1rem',
              borderRadius: '4px'
            }}>
              {JSON.stringify(zkProof.proof, null, 2)}
            </pre>

            <h4 style={{ marginTop: '1rem' }}>Public Signals:</h4>
            <pre style={{ 
              overflow: "auto", 
              fontSize: "0.8rem",
              background: '#0a0a0a',
              padding: '1rem',
              borderRadius: '4px'
            }}>
              {JSON.stringify(zkProof.publicSignals, null, 2)}
            </pre>

            <h4 style={{ marginTop: '1rem' }}>Commitment:</h4>
            <pre style={{ 
              overflow: "auto", 
              fontSize: "0.8rem",
              background: '#0a0a0a',
              padding: '1rem',
              borderRadius: '4px'
            }}>
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
  const verificationKey = await import("../verification_key.json");

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
    "/circuit_js/circuit.wasm",
    "/circuit_final.zkey"
  );

  const res = await snarkjs.plonk.verify(verificationKey, publicSignals, proof);

  if (res === true) {
    console.log("Verification OK");
  } else {
    console.log("Invalid proof");
  }

  return { proof, publicSignals, commitment };
}

async function submitProofToContract(userDid: string, zkProof: any, expiryTimestamp: number) {
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

  // Submit to contract
  const tx = await kycContract.submitComplianceProof(
    userDid,
    zkProof.commitment,
    Math.floor(expiryTimestamp),
    proofBytes,
    zkProof.publicSignals
  );

  console.log("Transaction sent:", tx.hash);
  await tx.wait();
  console.log("Proof submitted successfully!");
}
