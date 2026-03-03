import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5QrcodeScanner } from "html5-qrcode";
import { verifyEntityQR, buildWalletResponse, decryptPrivateKey, importPrivateKeyFromPEM } from "./utils/qrAuth";

// contract address and ABI
let contractAddress: string | undefined;
let MyNFTABI: any;

try {
  const addressData = await import('./contracts/contract-address.json');
  const abiData = await import('./contracts/MyNFT.json');
  contractAddress = addressData.MyNFT;
  MyNFTABI = abiData.abi;
} catch (error) {
  console.warn('Contract files not found. Please copy contract files from nfts/frontend/src/contracts/');
}

type DID = `did:${string}`;

interface UserData {
  id: number;
  username: string;
  did: string | null;
  pk: string | null;
  eth_address: string | null;
  token: number;
}

interface IdentityData {
  did: DID;
  didDocument: object;
  publicKeyJwk: object;
}

const boxStyle: React.CSSProperties = {
  background: "#111",
  color: "#ffff",
  padding: "clamp(0.75rem, 1.5vw, 1.25rem)",
  borderRadius: "8px",
  fontSize: "clamp(0.75rem, 1.2vw, 0.9rem)",
  overflowX: "auto",
  lineHeight: "1.6"
};

export default function Profile() {
  const navigate = useNavigate();
  const [identity, setIdentity] = useState<IdentityData | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDidDocument, setShowDidDocument] = useState(false);
  const [showPublicKey, setShowPublicKey] = useState(false);
  const [linkedAddress, setLinkedAddress] = useState<string | null>(null);
  const [checkingLinkStatus, setCheckingLinkStatus] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);
  const [showShareConfirm, setShowShareConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifyingEntity, setVerifyingEntity] = useState(false);
  const [keyFileContent, setKeyFileContent] = useState<string | null>(null);
  const [keyFileIsEncrypted, setKeyFileIsEncrypted] = useState(false);
  const [keyPassword, setKeyPassword] = useState('');
  const [keyFileLoaded, setKeyFileLoaded] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      navigate("/login");
      return;
    }

    try {
      const userData: UserData = JSON.parse(userStr);
      setUser(userData);

      // If user has DID, load it
      if (userData.did && userData.pk) {
        const publicKeyJwk = JSON.parse(userData.pk);
        const didDocument = {
          "@context": "https://www.w3.org/ns/did/v1",
          id: userData.did,
          verificationMethod: [
            {
              id: `${userData.did}#key-1`,
              type: "JsonWebKey2020",
              controller: userData.did,
              publicKeyJwk,
            },
          ],
          authentication: [`${userData.did}#key-1`],
        };

        setIdentity({
          did: userData.did as DID,
          didDocument,
          publicKeyJwk,
        });
      }
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  // QR Scanner setup
  useEffect(() => {
    if (!showQRScanner) return;

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: 250 },
      false
    );

    scanner.render(
      async (decodedText) => {
        try {
          const data = JSON.parse(decodedText);
          if (data.type === 'did-request') {
            scanner.clear();
            setShowQRScanner(false);

            try {
              setVerifyingEntity(true);
              await verifyEntityQR(data);
              setScannedData(data);
              setShowShareConfirm(true);
            } catch (verifyErr: any) {
              alert(`Security error: ${verifyErr.message}`);
            } finally {
              setVerifyingEntity(false);
            }
          }
        } catch (err) {
          console.error('Invalid QR code:', err);
        }
      },
      (_error) => {
        // Ignore errors (continuous scanning)
      }
    );

    return () => {
      scanner.clear().catch(console.error);
    };
  }, [showQRScanner]);

  const handleShareConfirm = async () => {
    if (!scannedData || !identity || !user) return;

    if (!keyFileLoaded || !keyFileContent) {
      alert('Please select your DID private key file before sharing.');
      return;
    }

    try {
      setSending(true);

      // Resolve PEM (decrypt if encrypted)
      let pemKey: string;
      if (keyFileIsEncrypted) {
        if (!keyPassword) {
          alert('Please enter the password to decrypt your private key.');
          setSending(false);
          return;
        }
        try {
          pemKey = await decryptPrivateKey(keyFileContent, keyPassword);
        } catch {
          alert('Decryption failed. Please check your password and try again.');
          setSending(false);
          return;
        }
      } else {
        pemKey = keyFileContent;
      }

      let privateKey: CryptoKey;
      try {
        privateKey = await importPrivateKeyFromPEM(pemKey);
      } catch {
        alert(
          'Invalid key file. Make sure you selected the correct DID private key file\n' +
          '(the .key or .key.enc file, NOT the Ethereum key).'
        );
        setSending(false);
        return;
      }

      // Phase 3: build signed response including ethAddress + entitySignature (mutual auth)
      const { signedData, signature } = await buildWalletResponse(
        scannedData.challenge,
        scannedData.sessionId,
        scannedData.entitySignature ?? '',
        identity.did,
        user.eth_address ?? '',
        privateKey
      );

      const response = await fetch('http://localhost:8000/qr-relay.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: scannedData.sessionId,
          did: identity.did,
          ethAddress: user.eth_address,
          didDocument: identity.didDocument,
          signature,
          signedData,
        })
      });

      if (response.ok) {
        setShowShareConfirm(false);
        setScannedData(null);
        setKeyFileContent(null);
        setKeyFileLoaded(false);
        setKeyFileIsEncrypted(false);
        setKeyPassword('');
        alert('Identity shared and cryptographically signed!');
      } else {
        alert('Failed to share information. Please try again.');
      }
    } catch (err) {
      console.error('Error sharing:', err);
      alert('Failed to share information. Make sure the backend server is running.');
    } finally {
      setSending(false);
    }
  };

  const handleShareCancel = () => {
    setShowShareConfirm(false);
    setScannedData(null);
    setKeyFileContent(null);
    setKeyFileLoaded(false);
    setKeyFileIsEncrypted(false);
    setKeyPassword('');
  };

  // Check blockchain link status
  useEffect(() => {
    const checkLinkStatus = async () => {
      if (!identity || !contractAddress || !MyNFTABI) return;
      
      try {
        setCheckingLinkStatus(true);
        const { ethers } = await import('ethers');
        const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
        const contract = new ethers.Contract(contractAddress, MyNFTABI, provider);
        
        const currentLinkedAddress = await contract.getAddressForDID(identity.did);
        
        if (currentLinkedAddress !== ethers.ZeroAddress) {
          setLinkedAddress(currentLinkedAddress);
        } else {
          setLinkedAddress(null);
        }
      } catch (err) {
        console.error('Error checking link status:', err);
      } finally {
        setCheckingLinkStatus(false);
      }
    };

    checkLinkStatus();
  }, [identity, contractAddress, MyNFTABI]);

  const downloadPublicKey = () => {
    if (!identity) return;
    
    const publicKeyJson = JSON.stringify(identity.publicKeyJwk, null, 2);
    const blob = new Blob([publicKeyJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${identity.did}-public-key.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const decryptPrivateKey = async (encryptedData: string, password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    // Decode base64
    const combined = new Uint8Array(
      atob(encryptedData)
        .split('')
        .map(c => c.charCodeAt(0))
    );
    
    // Extract salt, iv, and encrypted data
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encrypted = combined.slice(28);
    
    // Derive decryption key from password
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    const decryptionKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    
    try {
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        decryptionKey,
        encrypted
      );
      
      return decoder.decode(decrypted);
    } catch (err) {
      throw new Error('Decryption failed - incorrect password or corrupted file');
    }
  };

  const decryptEthereumKey = async () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.key,.enc,.key.enc';
    
    fileInput.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const text = await file.text();
      
      // Extract the base64 encrypted data (skip comment lines)
      const lines = text.split('\n');
      const encryptedData = lines.find(line => !line.startsWith('#') && line.trim().length > 0);
      
      if (!encryptedData) {
        alert('Could not find encrypted data in file');
        return;
      }
      
      const password = prompt('Enter the password you used to encrypt this key:');
      if (!password) return;
      
      try {
        setLoading(true);
        const decrypted = await decryptPrivateKey(encryptedData, password);
        
        // Show the decrypted key
        const showKey = window.confirm(
          'Decryption successful!\n\n' +
          'Would you like to:\n' +
          'OK = Download decrypted key as file\n' +
          'Cancel = View key in alert (copy manually)'
        );
        
        if (showKey) {
          // Download decrypted key
          const blob = new Blob([decrypted], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = file.name.replace('.enc', '') + '.decrypted.txt';
          link.click();
          URL.revokeObjectURL(url);
          alert('Decrypted key downloaded! Keep it safe.');
        } else {
          // Show in alert
          alert(
            'Your decrypted Ethereum private key:\n\n' +
            decrypted +
            '\n\nCopy this now - it will not be shown again!'
          );
        }
      } catch (err: any) {
        alert('Decryption failed: ' + (err.message || 'Unknown error'));
      } finally {
        setLoading(false);
      }
    };
    
    fileInput.click();
  };

  const linkDIDToBlockchain = async () => {
    if (!identity || !contractAddress || !MyNFTABI) {
      alert('Please ensure you have a DID and contract is available');
      return;
    }

    if (typeof (window as any).ethereum === 'undefined') {
      alert(
        'Please install MetaMask and import your Ethereum private key first!\n\n' +
        'Your Ethereum private key was downloaded when you created your DID.\n' +
        'Import it to MetaMask to continue.'
      );
      return;
    }

    try {
      setLoading(true);

      // Import ethers
      const { ethers } = await import('ethers');

      // Connect to MetaMask
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      const contract = new ethers.Contract(contractAddress, MyNFTABI, signer);

      // Check if already linked
      const currentLinkedAddress = await contract.getAddressForDID(identity.did);
      
      if (currentLinkedAddress !== ethers.ZeroAddress) {
        if (currentLinkedAddress.toLowerCase() === userAddress.toLowerCase()) {
          alert(`Your DID is already linked to this address:\n${userAddress}`);
        } else {
          alert(
            `Your DID is already linked to a different address:\n${currentLinkedAddress}\n\n` +
            `Only the contract owner can update this.`
          );
        }
        setLoading(false);
        return;
      }

      const confirm = window.confirm(
        `Link your DID to the blockchain?\n\n` +
        `DID: ${identity.did}\n` +
        `Will be linked to: ${userAddress}\n\n` +
        `This allows the bank to automatically transfer NFTs to your wallet when they purchase for you.`
      );

      if (!confirm) {
        setLoading(false);
        return;
      }

      console.log('Linking DID to blockchain...');
      const tx = await contract.linkDIDToAddress(identity.did, userAddress);
      console.log('Transaction sent:', tx.hash);
      await tx.wait();
      console.log('Transaction confirmed!');

      alert(
        `Successfully linked!\n\n` +
        `Your DID is now linked to:\n${userAddress}\n\n` +
        `When the bank purchases NFTs for you, they will automatically be transferred to your wallet!`
      );
      
      // Update linked address state
      setLinkedAddress(userAddress);
    } catch (err: any) {
      console.error('Link error:', err);
      alert(`Failed to link DID: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!identity || !user) {
    return (
      <div style={{ 
        padding: "clamp(1rem, 2vw, 2rem)", 
        maxWidth: "1400px", 
        margin: "0 auto",
        width: "100%",
        boxSizing: "border-box"
      }}>
        <h2 style={{ fontSize: "clamp(1.5rem, 2.5vw, 2rem)" }}>Profile</h2>
        <p style={{ fontSize: "clamp(0.95rem, 1.5vw, 1.1rem)" }}>Loading profile...</p>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: "clamp(0.75rem, 2vw, 2rem)", 
      maxWidth: "1400px", 
      margin: "0 auto",
      width: "100%",
      boxSizing: "border-box",
      minHeight: "100vh"
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'clamp(1.5rem, 3vw, 2.5rem)',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <h2 style={{ 
          margin: 0,
          fontSize: 'clamp(1.5rem, 3vw, 2.5rem)'
        }}>Profile</h2>
        <button
          onClick={() => navigate('/wallet')}
          style={{
            padding: 'clamp(0.75rem, 1.5vw, 1rem) clamp(1.25rem, 2vw, 1.75rem)',
            background: 'rgb(202, 165, 97)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: 'clamp(0.95rem, 1.5vw, 1.1rem)',
            fontWeight: 'bold',
            transition: 'all 0.3s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {(e.target as HTMLButtonElement).style.background = 'rgb(180, 145, 77)'}}
          onMouseLeave={(e) => {(e.target as HTMLButtonElement).style.background = 'rgb(202, 165, 97)'}}
        >
          ← Back to Wallet
        </button>
      </div>

      {/* User Info */}
      <div 
        style={{
          padding: 'clamp(1rem, 2vw, 2rem)',
          background: '#1a1a1a',
          borderRadius: '12px',
          marginBottom: 'clamp(1.5rem, 2.5vw, 2rem)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          border: '1px solid rgba(202, 165, 97, 0.3)',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.border = '1px solid rgba(202, 165, 97, 1)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(202, 165, 97, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.border = '1px solid rgba(202, 165, 97, 0.3)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        }}
      >
        <h3 style={{ 
          marginTop: 0, 
          color: 'rgb(202, 165, 97)',
          fontSize: 'clamp(1.2rem, 2vw, 1.6rem)'
        }}>User Information</h3>
        <p style={{ fontSize: 'clamp(0.95rem, 1.5vw, 1.1rem)' }}><strong>Username:</strong> {user.username}</p>
      </div>

      {/* Identity Details */}
      <div 
        style={{
          padding: 'clamp(1rem, 2vw, 2rem)',
          background: '#1a1a1a',
          borderRadius: '12px',
          marginBottom: 'clamp(1.5rem, 2.5vw, 2rem)',
          border: '1px solid rgba(202, 165, 97, 0.3)',
          boxShadow: '0 2px 8px rgba(202, 165, 97, 0.2)',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.border = '1px solid rgba(202, 165, 97, 1)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(202, 165, 97, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.border = '1px solid rgba(202, 165, 97, 0.3)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(202, 165, 97, 0.2)';
        }}
      >
        <h3 style={{ 
          marginTop: 0, 
          color: 'rgb(202, 165, 97)',
          fontSize: 'clamp(1.2rem, 2vw, 1.6rem)'
        }}>Identity Details</h3>
        
        <div style={{ marginBottom: "clamp(1.25rem, 2vw, 1.75rem)" }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <strong style={{ fontSize: 'clamp(1rem, 1.8vw, 1.2rem)' }}>DID</strong>
            <button
              onClick={() => setShowQRScanner(true)}
              style={{
                padding: 'clamp(0.4rem, 0.8vw, 0.6rem) clamp(0.75rem, 1.2vw, 1rem)',
                background: 'rgb(202, 165, 97)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: 'clamp(0.8rem, 1.2vw, 0.9rem)',
                transition: 'all 0.3s',
                fontWeight: 'bold'
              }}
              onMouseEnter={(e) => {(e.target as HTMLButtonElement).style.background = 'rgb(180, 145, 77)'}}
              onMouseLeave={(e) => {(e.target as HTMLButtonElement).style.background = 'rgb(202, 165, 97)'}}
            >
              Share via QR
            </button>
          </div>
          <pre style={boxStyle}>{identity.did}</pre>
        </div>

        <div style={{ marginBottom: "clamp(1.25rem, 2vw, 1.75rem)" }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <strong style={{ fontSize: 'clamp(0.95rem, 1.5vw, 1.1rem)' }}>DID Document</strong>
            <button
              onClick={() => setShowDidDocument(!showDidDocument)}
              style={{
                padding: 'clamp(0.4rem, 0.8vw, 0.6rem) clamp(0.75rem, 1.2vw, 1rem)',
                background: 'rgb(202, 165, 97)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: 'clamp(0.8rem, 1.2vw, 0.9rem)',
                transition: 'all 0.3s',
              }}
              onMouseEnter={(e) => {(e.target as HTMLButtonElement).style.background = 'rgb(180, 145, 77)'}}
              onMouseLeave={(e) => {(e.target as HTMLButtonElement).style.background = 'rgb(202, 165, 97)'}}
            >
              {showDidDocument ? 'Hide' : 'Show'}
            </button>
          </div>
          {showDidDocument && (
            <pre style={boxStyle}>
              {JSON.stringify(identity.didDocument, null, 2)}
            </pre>
          )}
        </div>

        <div style={{ marginBottom: "clamp(1.25rem, 2vw, 1.75rem)" }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <strong style={{ fontSize: 'clamp(0.95rem, 1.5vw, 1.1rem)' }}>Public Key</strong>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowPublicKey(!showPublicKey)}
                style={{
                  padding: 'clamp(0.4rem, 0.8vw, 0.6rem) clamp(0.75rem, 1.2vw, 1rem)',
                  background: 'rgb(202, 165, 97)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: 'clamp(0.8rem, 1.2vw, 0.9rem)',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => {(e.target as HTMLButtonElement).style.background = 'rgb(180, 145, 77)'}}
                onMouseLeave={(e) => {(e.target as HTMLButtonElement).style.background = 'rgb(202, 165, 97)'}}
              >
                {showPublicKey ? 'Hide' : 'Show'}
              </button>
              <button
                onClick={downloadPublicKey}
                style={{
                  padding: 'clamp(0.4rem, 0.8vw, 0.6rem) clamp(0.75rem, 1.2vw, 1rem)',
                  background: 'rgb(202, 165, 97)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: 'clamp(0.8rem, 1.2vw, 0.9rem)',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => {(e.target as HTMLButtonElement).style.background = 'rgb(180, 145, 77)'}}
                onMouseLeave={(e) => {(e.target as HTMLButtonElement).style.background = 'rgb(202, 165, 97)'}}
              >
                Download
              </button>
            </div>
          </div>
          {showPublicKey && (
            <pre style={boxStyle}>
              {JSON.stringify(identity.publicKeyJwk, null, 2)}
            </pre>
          )}
        </div>

        {user?.eth_address && (
          <div style={{ marginBottom: "1rem" }}>
            <strong style={{ fontSize: 'clamp(0.95rem, 1.5vw, 1.1rem)' }}>Ethereum Address (Your Wallet)</strong>
            <pre style={boxStyle}>{user.eth_address}</pre>
            <p style={{ fontSize: "clamp(0.8rem, 1.3vw, 0.9rem)", color: "#aaa", marginTop: "0.75rem", lineHeight: '1.6' }}>
              Import your Ethereum private key (.eth.key file) to MetaMask to access NFTs at this address
            </p>
          </div>
        )}
      </div>

      {/* Private Keys Access */}
      <div 
        style={{
          padding: 'clamp(1rem, 2vw, 2rem)',
          background: '#1a1a1a',
          borderRadius: '12px',
          marginBottom: 'clamp(1.5rem, 2.5vw, 2rem)',
          border: '1px solid rgba(202, 165, 97, 0.3)',
          boxShadow: '0 2px 8px rgba(202, 165, 97, 0.2)',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.border = '1px solid rgba(202, 165, 97, 1)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(202, 165, 97, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.border = '1px solid rgba(202, 165, 97, 0.3)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(202, 165, 97, 0.2)';
        }}
      >
        <h3 style={{ 
          marginTop: 0, 
          color: 'rgb(202, 165, 97)',
          fontSize: 'clamp(1.2rem, 2vw, 1.6rem)'
        }}>Private Keys</h3>
        
        <p style={{ 
          fontSize: 'clamp(0.85rem, 1.3vw, 0.95rem)', 
          color: '#aaa', 
          marginBottom: 'clamp(1rem, 1.5vw, 1.5rem)',
          lineHeight: '1.7'
        }}>
          Use this tool to decrypt and view/download your <strong>DID Private Key</strong> or <strong>Ethereum Private Key</strong> in case you have encrypted them.
          <br />
          <span style={{ color: '#ffc107', fontWeight: 'bold' }}>Note:</span> These keys are <strong>never stored</strong> on our servers. 
          They were downloaded encrypted when you created your DID and only you have access to them.
        </p>

        <button
          onClick={decryptEthereumKey}
          disabled={loading}
          style={{
            padding: 'clamp(0.6rem, 1.2vw, 0.85rem) clamp(1.25rem, 2vw, 1.75rem)',
            background: loading ? '#6c757d' : 'rgb(202, 165, 97)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: 'clamp(0.9rem, 1.4vw, 1rem)',
            fontWeight: 'bold',
            transition: 'all 0.3s',
            width: '100%',
            maxWidth: '400px',
          }}
          onMouseEnter={(e) => {if (!loading) (e.target as HTMLButtonElement).style.background = 'rgb(180, 145, 77)'}}
          onMouseLeave={(e) => {if (!loading) (e.target as HTMLButtonElement).style.background = 'rgb(202, 165, 97)'}}
        >
          {loading ? 'Processing...' : 'Decrypt Private Key File'}
        </button>
        
        <p style={{ 
          fontSize: 'clamp(0.75rem, 1.2vw, 0.85rem)', 
          color: '#888', 
          marginTop: 'clamp(0.75rem, 1.2vw, 1rem)',
          lineHeight: '1.6'
        }}>
          Select your encrypted <code>.key</code> or <code>.key.enc</code> file (DID Private Key or Ethereum Private Key),
          enter your password, and choose to download or view the decrypted key.
        </p>
      </div>

      {/* Blockchain Linking */}
      {contractAddress && MyNFTABI && !linkedAddress && !checkingLinkStatus && (
        <div
          style={{
            padding: "clamp(1rem, 2vw, 1.5rem)",
            backgroundColor: "#1a1a1a",
            borderRadius: '12px',
            marginBottom: 'clamp(1.5rem, 2.5vw, 2rem)',
            border: '1px solid rgba(202, 165, 97, 0.3)',
            boxShadow: '0 2px 8px rgba(202, 165, 97, 0.2)',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.border = '1px solid rgba(202, 165, 97, 1)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(202, 165, 97, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.border = '1px solid rgba(202, 165, 97, 0.3)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(202, 165, 97, 0.2)';
          }}
        >
          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: 'clamp(1rem, 1.8vw, 1.3rem)' }}>Blockchain Linking (Optional)</h4>
          
          <p style={{ margin: '0 0 1rem 0', fontSize: 'clamp(0.85rem, 1.3vw, 0.95rem)', lineHeight: '1.6' }}>
            <strong>No action required!</strong> When the bank purchases NFTs for you, they will automatically 
            link your DID to your Ethereum address on the blockchain and pay all gas fees.
          </p>
          <p style={{ margin: '0 0 1rem 0', fontSize: 'clamp(0.8rem, 1.2vw, 0.9rem)', color: 'rgb(202, 165, 97)', lineHeight: '1.6' }}>
            You can also link it yourself now if you want to verify the connection before purchasing:
          </p>
          <ol style={{ fontSize: 'clamp(0.8rem, 1.2vw, 0.9rem)', margin: '0 0 1rem 0', paddingLeft: '1.5rem', lineHeight: '1.7' }}>
            <li>Import your Ethereum private key to MetaMask (downloaded when you created your DID)</li>
            <li>Click the button below to link your DID on the blockchain (you pay gas)</li>
          </ol>
          <button
            onClick={linkDIDToBlockchain}
            disabled={loading}
            style={{
              padding: 'clamp(0.5rem, 1vw, 0.75rem) clamp(1rem, 1.5vw, 1.5rem)',
              background: loading ? '#6c757d' : 'rgb(202, 165, 97)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 'clamp(0.85rem, 1.3vw, 0.95rem)',
              transition: 'all 0.3s',
            }}
            onMouseEnter={(e) => {if (!loading) (e.target as HTMLButtonElement).style.background = 'rgb(180, 145, 77)'}}
            onMouseLeave={(e) => {if (!loading) (e.target as HTMLButtonElement).style.background = 'rgb(202, 165, 97)'}}
          >
            {loading ? 'Processing...' : 'Link Now (Optional)'}
          </button>
        </div>
      )}
      
      {/* Security Notice */}
      <div
        style={{
          padding: "clamp(1rem, 2vw, 1.5rem)",
          backgroundColor: "#fef3cd",
          color: "#856404",
          borderRadius: "10px",
          marginBottom: 'clamp(1.5rem, 2.5vw, 2rem)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
          border: '1px solid rgba(133, 100, 4, 0.2)',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.border = '1px solid rgba(133, 100, 4, 0.6)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(133, 100, 4, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.border = '1px solid rgba(133, 100, 4, 0.2)';
          e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
        }}
      >
        <strong style={{ fontSize: 'clamp(0.95rem, 1.5vw, 1.1rem)' }}>Important:</strong> <span style={{ fontSize: 'clamp(0.85rem, 1.3vw, 0.95rem)' }}>Your private key was downloaded when you
        created your DID. Keep it safe - it's your responsibility to store it
        securely!</span>
        <strong style={{ display: "block", marginTop: "clamp(0.75rem, 1.5vw, 1rem)", fontSize: 'clamp(0.95rem, 1.5vw, 1.1rem)' }}>Security Notice:</strong>
        <ul style={{ marginTop: "0.75rem", marginBottom: 0, fontSize: 'clamp(0.85rem, 1.3vw, 0.95rem)', lineHeight: '1.7' }}>
          <li>Your <strong>DID private key</strong> was downloaded as a <code>.key</code> file</li>
          <li>Your <strong>Ethereum private key</strong> was downloaded as a <code>.eth.key</code> file</li>
          <li>If encrypted, you need the password to use them</li>
          <li>Store them in a secure location (password manager, hardware wallet, etc.)</li>
          <li>Never share them with anyone</li>
          <li>These are your only copies - we cannot recover them</li>
        </ul>
      </div>

      {/* QR Scanner Modal */}
      {showQRScanner && (
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
            maxWidth: '600px',
            width: '90%',
            position: 'relative',
            border: '2px solid #333'
          }}>
            <button
              onClick={() => setShowQRScanner(false)}
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
            <h3 style={{ marginTop: 0 }}>Scan QR Code</h3>
            <p style={{ color: '#888', marginBottom: '1.5rem' }}>
              Scan a QR code from an entity requesting your DID
            </p>
            <div id="qr-reader" style={{ width: '100%' }}></div>
          </div>
        </div>
      )}

      {/* Share Confirmation Dialog */}
      {showShareConfirm && (
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
          zIndex: 1001
        }}>
          <div style={{
            background: '#1a1a1a',
            padding: '2rem',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%',
            border: '2px solid rgb(202, 165, 97)'
          }}>
            <h3 style={{ marginTop: 0, color: 'rgb(202, 165, 97)' }}>Share Your Identity?</h3>
            <p style={{ color: '#ccc', marginBottom: '1rem' }}>
              Entity verified ✓ — sign with your DID private key to respond.
            </p>
            <div style={{
              background: '#0a0a0a',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              border: '1px solid #333'
            }}>
              <p style={{ margin: '0.5rem 0', color: '#fff', wordBreak: 'break-all' }}>
                <strong>DID:</strong> {identity?.did}
              </p>
              <p style={{ margin: '0.5rem 0', color: '#fff' }}>
                <strong>Ethereum Address:</strong> {user?.eth_address || 'Not available'}
              </p>
            </div>

            {/* Private key loading */}
            <div style={{
              background: '#111', padding: '1rem', borderRadius: '8px',
              marginBottom: '1.5rem',
              border: `1px solid ${keyFileLoaded ? 'rgb(202, 165, 97)' : '#555'}`
            }}>
              <p style={{ margin: '0 0 0.5rem', color: '#ccc', fontSize: '0.9rem' }}>
                🔑 <strong>Load your DID private key to sign</strong>
              </p>
              <input
                type="file" accept=".key,.enc"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const isEnc = file.name.endsWith('.enc');
                  setKeyFileIsEncrypted(isEnc);
                  setKeyPassword('');
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    setKeyFileContent((ev.target?.result as string).trim());
                    setKeyFileLoaded(true);
                  };
                  reader.readAsText(file);
                }}
                disabled={sending}
                style={{
                  width: '100%', padding: '0.5rem', background: '#222',
                  border: '1px solid #444', borderRadius: '4px',
                  color: '#ccc', fontSize: '0.9rem',
                  cursor: sending ? 'not-allowed' : 'pointer', boxSizing: 'border-box',
                }}
              />
              {keyFileLoaded && (
                <p style={{ margin: '0.5rem 0 0', color: 'rgb(100, 220, 100)', fontSize: '0.85rem' }}>
                  ✓ Key file loaded{keyFileIsEncrypted ? ' (encrypted — enter password below)' : ''}
                </p>
              )}
              {keyFileIsEncrypted && keyFileLoaded && (
                <input
                  type="password"
                  value={keyPassword}
                  onChange={e => setKeyPassword(e.target.value)}
                  placeholder="Decryption password"
                  disabled={sending}
                  style={{
                    width: '100%', marginTop: '0.5rem', padding: '0.5rem',
                    background: '#222', border: '1px solid #555',
                    borderRadius: '4px', color: '#fff', fontSize: '0.9rem',
                    boxSizing: 'border-box',
                  }}
                />
              )}
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={handleShareCancel}
                disabled={sending}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#333',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: sending ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  opacity: sending ? 0.5 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleShareConfirm}
                disabled={sending || !keyFileLoaded}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: (sending || !keyFileLoaded) ? '#666' : 'rgb(202, 165, 97)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: (sending || !keyFileLoaded) ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}
              >
                {sending ? 'Signing & Sharing…' : 'Sign & Share'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Entity verification overlay */}
      {verifyingEntity && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1002
        }}>
          <div style={{
            background: '#1a1a1a', padding: '2rem', borderRadius: '12px',
            textAlign: 'center', border: '2px solid rgb(202, 165, 97)'
          }}>
            <p style={{ color: 'rgb(202, 165, 97)', fontSize: '1.1rem', margin: 0 }}>
              🔒 Verifying entity identity…
            </p>
            <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              Checking signature and relay registration
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
