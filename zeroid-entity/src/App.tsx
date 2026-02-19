import { useState, useEffect } from "react";
import BankNFTManager from "./BankNFTManager";
import "./App.css";

// Import contract address and ABI
let contractAddress: string | undefined;
let MyNFTABI: any;

try {
  const addressData = await import('./contracts/contract-address.json');
  const abiData = await import('./contracts/MyNFT.json');
  contractAddress = addressData.MyNFT;
  MyNFTABI = abiData.abi;
} catch (error) {
  console.warn('Contract files not found. Please deploy the contract first.');
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
    background: isActive ? '#4CAF50' : '#333',
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
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white' }}>
      <div style={{ 
        background: '#1a1a1a', 
        padding: '1rem 2rem', 
        borderBottom: '2px solid #333',
        marginBottom: '1rem'
      }}>
        <h1 style={{ margin: '0 0 1rem 0' }}>🏦 Bank Entity - ZeroID System</h1>
        
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
            background: '#e3f2fd',
            padding: '0.75rem',
            borderRadius: '6px',
            color: '#1565c0',
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
            <div style={{ 
              marginTop: '2rem', 
              padding: '1rem', 
              background: '#1a1a1a', 
              borderRadius: '8px',
              maxWidth: '600px',
              margin: '2rem auto',
              textAlign: 'left'
            }}>
              <h3>Setup Instructions:</h3>
              <ol style={{ paddingLeft: '1.5rem' }}>
                <li>Navigate to the nfts project</li>
                <li>Run: <code style={{ background: '#0a0a0a', padding: '0.2rem 0.4rem', borderRadius: '3px' }}>npm run deploy</code></li>
                <li>Wait for deployment to complete</li>
                <li>The contract files will be automatically loaded</li>
                <li>Refresh this page</li>
              </ol>
            </div>
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
  const [zkProof, setZkProof] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Entity - KYC Issuer</h2>
      <p style={{ color: '#888', marginBottom: '1rem' }}>
        Generate zero-knowledge proofs for user DIDs
      </p>

      <input
        placeholder="User DID (e.g., did:zeroid:...)"
        value={did}
        onChange={e => {
          setDid(e.target.value);
          setError(null);
        }}
        style={{ 
          width: "100%", 
          marginBottom: "1rem",
          padding: '0.75rem',
          background: '#1a1a1a',
          border: '1px solid #333',
          color: 'white',
          borderRadius: '6px'
        }}
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
        style={{
          padding: '0.75rem 1.5rem',
          background: did ? '#4CAF50' : '#333',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: did ? 'pointer' : 'not-allowed',
          fontSize: '1rem',
          fontWeight: 'bold'
        }}
      >
        Generate PLONK ZK Proof
      </button>

      {error && (
        <p style={{ color: "#ff6b6b", marginTop: "1rem", padding: '1rem', background: '#2a1a1a', borderRadius: '6px' }}>
          Error: {error}
        </p>
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
