// ALERTS: on server it may needs cors definition for anu qrng api.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NFTGallery from "./components/NFTGallery";

// Import contract address and ABI
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

type TabType = 'identity' | 'nfts';

const boxStyle: React.CSSProperties = {
  background: "#111",
  color: "#ffff",
  padding: "1rem",
  borderRadius: "6px",
  fontSize: "0.85rem",
  overflowX: "auto"
};

const tabContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  marginBottom: '2rem',
  borderBottom: '2px solid #333',
  paddingBottom: '0.5rem',
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
});

async function getQuantumRandomUUID(): Promise<string> {
  try {
    // Fetch 16 random bytes via Vite proxy
    const response = await fetch(
      "/api/quantum?length=16&type=uint8"
    );
    const data = await response.json();
    
    if (!data.success || !data.data) {
      throw new Error("Failed to get quantum random data");
    }

    // Convert the 16 random bytes to UUID format (8-4-4-4-12)
    const bytes = data.data;
    const hex = bytes.map((b: number) => b.toString(16).padStart(2, "0")).join("");
    //return hex;
    
    // Format as UUID: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${(
      (parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80
    ).toString(16)}${hex.slice(18, 20)}-${hex.slice(20, 32)}`;
  } catch (error) {
    console.error("Failed to get quantum random UUID, falling back to crypto.randomUUID():", error);
    return crypto.randomUUID();
  }
}

async function generateDid(): Promise<any> {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,//exportable
    ["sign", "verify"]
  );

  const publicKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);

  const quantumUUID = await getQuantumRandomUUID();  // Quantum random UUID generation
  const did = `did:zeroid:${quantumUUID}`;

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

  // Generate Ethereum wallet
  const { Wallet } = await import('ethers');
  const ethWallet = Wallet.createRandom();

  return {
    did,
    didDocument,
    publicKeyJwk,
    privateKeyRaw: keyPair.privateKey, // Keep the CryptoKey object for DID
    ethAddress: ethWallet.address,
    ethPrivateKey: ethWallet.privateKey,
  };
}

export default function Wallet() {
  const navigate = useNavigate();
  const [identity, setIdentity] = useState<IdentityData | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>('identity');

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

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const encryptPrivateKey = async (keyData: string, password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(keyData);
    
    // Derive encryption key from password
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encryptionKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      encryptionKey,
      data
    );
    
    // Combine salt + iv + encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);
    
    return arrayBufferToBase64(combined.buffer);
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
          '✓ Decryption successful!\n\n' +
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
            '\n\n⚠️ Copy this now - it will not be shown again!'
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

  const downloadPrivateKey = async (privateKeyRaw: CryptoKey, did: string) => {
    // Ask user if they want to encrypt the key
    const wantsEncryption = window.confirm(
      "Do you want to encrypt your private key with a password?\n\n" +
      "⚠️ RECOMMENDED: Encrypting protects your key if someone gains access to the file.\n" +
      "If you choose 'OK', you'll need this password to use the key later.\n" +
      "If you choose 'Cancel', the key will be stored unencrypted."
    );

    // Export key to PKCS8 format
    const exported = await crypto.subtle.exportKey('pkcs8', privateKeyRaw);
    const exportedBase64 = arrayBufferToBase64(exported);
    
    // Convert to PEM format
    const pemHeader = '-----BEGIN PRIVATE KEY-----\n';
    const pemFooter = '\n-----END PRIVATE KEY-----';
    const pemBody = exportedBase64.match(/.{1,64}/g)?.join('\n') || exportedBase64;
    let pemKey = pemHeader + pemBody + pemFooter;

    let fileContent = pemKey;
    let fileName = `${did}-private.key`;

    if (wantsEncryption) {
      const password = prompt(
        "Enter a strong password to encrypt your private key:\n\n" +
        "⚠️ Remember this password! You'll need it to import your key.\n" +
        "Without it, your private key cannot be recovered."
      );

      if (!password) {
        alert("Encryption cancelled. Key will not be downloaded.");
        return;
      }

      if (password.length < 12) {
        const proceed = window.confirm(
          "⚠️ Your password is short (less than 12 characters).\n" +
          "A longer password is more secure.\n\n" +
          "Continue anyway?"
        );
        if (!proceed) return;
      }

      try {
        fileContent = await encryptPrivateKey(pemKey, password);
        fileName = `${did}-private.key.enc`;
      } catch (err) {
        alert("Encryption failed. Please try again.");
        console.error("Encryption error:", err);
        return;
      }
    }

    // Download the key
    const dataBlob = new Blob([fileContent], { type: "text/plain" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadEthereumPrivateKey = async (privateKey: string, ethAddress: string, did: string) => {
    // Ask user if they want to encrypt the key
    const wantsEncryption = window.confirm(
      "Do you want to encrypt your Ethereum private key with a password?\n\n" +
      "⚠️ RECOMMENDED: Encrypting protects your key if someone gains access to the file.\n" +
      "If you choose 'OK', you'll need this password to import to MetaMask later.\n" +
      "If you choose 'Cancel', the key will be stored unencrypted."
    );

    let fileContent = privateKey;
    let fileName = `${did}-ethereum.key`;

    if (wantsEncryption) {
      const password = prompt(
        "Enter a strong password to encrypt your Ethereum private key:\n\n" +
        "⚠️ Remember this password! You'll need it to import to MetaMask.\n" +
        "Without it, your private key cannot be recovered."
      );

      if (!password) {
        alert("Encryption cancelled. Ethereum key will not be downloaded.");
        return;
      }

      if (password.length < 12) {
        const proceed = window.confirm(
          "⚠️ Your password is short (less than 12 characters).\n" +
          "A longer password is more secure.\n\n" +
          "Continue anyway?"
        );
        if (!proceed) return;
      }

      try {
        fileContent = await encryptPrivateKey(privateKey, password);
        fileName = `${did}-ethereum.key.enc`;
      } catch (err) {
        alert("Encryption failed. Please try again.");
        console.error("Encryption error:", err);
        return;
      }
    }

    // Create file with Ethereum address info
    const keyFileContent = 
      `# Ethereum Wallet for DID: ${did}\n` +
      `# Ethereum Address: ${ethAddress}\n` +
      `# KEEP THIS SAFE - Import to MetaMask to access your NFTs\n` +
      `#\n` +
      (wantsEncryption ? `# This key is ENCRYPTED - you need the password to use it\n#\n` : `# WARNING: This key is UNENCRYPTED\n#\n`) +
      `${fileContent}\n`;

    // Download the key
    const dataBlob = new Blob([keyFileContent], { type: "text/plain" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const createIdentity = async () => {
    if (!user) return;

    setLoading(true);
    setError("");

    try {
      // Generate DID and keys (including Ethereum wallet)
      const id = await generateDid();

      // Store DID, public key, and Ethereum address in database
      const response = await fetch("http://localhost:8000/store-did.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          did: id.did,
          public_key_jwk: id.publicKeyJwk,
          eth_address: id.ethAddress,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.message || "Failed to store DID");
        setLoading(false);
        return;
      }

      // Update local user data with DID, public key, and Ethereum address
      const updatedUser = {
        ...user,
        did: id.did,
        pk: JSON.stringify(id.publicKeyJwk),
        eth_address: id.ethAddress,
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);

      // Set identity (without private keys)
      setIdentity({
        did: id.did,
        didDocument: id.didDocument,
        publicKeyJwk: id.publicKeyJwk,
      });

      // Download DID private key
      downloadPrivateKey(id.privateKeyRaw, id.did);

      // Download Ethereum private key
      downloadEthereumPrivateKey(id.ethPrivateKey, id.ethAddress, id.did);

      alert(
        "✓ Your DID and Ethereum wallet have been created!\n\n" +
        "TWO files have been downloaded:\n" +
        "1. DID private key (.key file)\n" +
        "2. Ethereum private key (.eth.key file)\n\n" +
        "Store both files safely! These are your only copies.\n\n" +
        "Your Ethereum address: " + id.ethAddress + "\n\n" +
        "ℹ️ When the bank purchases NFTs for you, they will automatically:\n" +
        "• Link your DID to the blockchain\n" +
        "• Transfer the NFT to your wallet\n" +
        "• Pay all gas fees\n\n" +
        "You don't need to do anything!"
      );
    } catch (err) {
      setError("Failed to create identity: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
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
        `✓ Successfully linked!\n\n` +
        `Your DID is now linked to:\n${userAddress}\n\n` +
        `When the bank purchases NFTs for you, they will automatically be transferred to your wallet!`
      );
    } catch (err: any) {
      console.error('Link error:', err);
      alert(`Failed to link DID: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      {!identity ? (
        <>
          <h2>ZeroID Wallet</h2>
          {user && <p>Welcome, {user.username}!</p>}
          <p>You don't have a DID yet.</p>
          <button onClick={createIdentity} disabled={loading}>
            {loading ? "Creating DID..." : "Create DID"}
          </button>
        </>
      ) : (
        <>

          <h2>ZeroID Wallet</h2>
          {user && <p>Welcome, {user.username}!</p>}
          
          {/* Tab Navigation */}
          <div style={tabContainerStyle}>
            <button 
              style={tabStyle(activeTab === 'identity')}
              onClick={() => setActiveTab('identity')}
            >
              Identity
            </button>
            <button 
              style={tabStyle(activeTab === 'nfts')}
              onClick={() => setActiveTab('nfts')}
            >
              My NFTs
            </button>

          </div>

          {/* Tab Content */}
          {activeTab === 'identity' && (
            <div>
              <h3>Decentralized Identity</h3>

              <div style={{ marginBottom: "1rem" }}>
                <strong>DID</strong>
                <pre style={boxStyle}>{identity.did}</pre>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <strong>DID Document</strong>
                <pre style={boxStyle}>
                  {JSON.stringify(identity.didDocument, null, 2)}
                </pre>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <strong>Public Key</strong>
                <pre style={boxStyle}>
                  {JSON.stringify(identity.publicKeyJwk, null, 2)}
                </pre>
              </div>

              {user?.eth_address && (
                <div style={{ marginBottom: "1rem" }}>
                  <strong>Ethereum Address (Your Wallet)</strong>
                  <pre style={boxStyle}>{user.eth_address}</pre>
                  <p style={{ fontSize: "0.85rem", color: "#888", marginTop: "0.5rem" }}>
                    💡 Import your Ethereum private key (.eth.key file) to MetaMask to access NFTs at this address
                  </p>
                  <button
                    onClick={decryptEthereumKey}
                    disabled={loading}
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.5rem 1rem',
                      background: loading ? '#6c757d' : '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    Decrypt Ethereum Key File
                  </button>
                </div>
              )}

              <div
                style={{
                  marginTop: "2rem",
                  padding: "1rem",
                  backgroundColor: "#fef3cd",
                  color: "#856404",
                  borderRadius: "4px",
                }}
              >
                <strong>Important:</strong> Your private key was downloaded when you
                created your DID. Keep it safe - it's your responsibility to store it
                securely!
                <strong style={{ display: "block", marginTop: "1rem" }}>Security Notice:</strong>
                <ul style={{ marginTop: "0.5rem", marginBottom: 0 }}>
                  <li>Your <strong>DID private key</strong> was downloaded as a <code>.key</code> file</li>
                  <li>Your <strong>Ethereum private key</strong> was downloaded as a <code>.eth.key</code> file</li>
                  <li>If encrypted, you need the password to use them</li>
                  <li>Store them in a secure location (password manager, hardware wallet, etc.)</li>
                  <li>Never share them with anyone</li>
                  <li>These are your only copies - we cannot recover them</li>
                </ul>
              </div>

              {contractAddress && MyNFTABI && (
                <div
                  style={{
                    marginTop: "2rem",
                    padding: "1rem",
                    backgroundColor: "#d4edda",
                    color: "#155724",
                    borderRadius: "4px",
                  }}
                >
                  <h4 style={{ margin: '0 0 0.5rem 0' }}>🔗 Blockchain Linking (Optional)</h4>
                  <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem' }}>
                    <strong>✓ No action required!</strong> When the bank purchases NFTs for you, they will automatically 
                    link your DID to your Ethereum address on the blockchain and pay all gas fees.
                  </p>
                  <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#666' }}>
                    You can also link it yourself now if you want to verify the connection before purchasing:
                  </p>
                  <ol style={{ fontSize: '0.85rem', margin: '0 0 1rem 0', paddingLeft: '1.5rem' }}>
                    <li>Import your Ethereum private key to MetaMask (downloaded when you created your DID)</li>
                    <li>Click the button below to link your DID on the blockchain (you pay gas)</li>
                  </ol>
                  <button
                    onClick={linkDIDToBlockchain}
                    disabled={loading}
                    style={{
                      padding: '0.5rem 1rem',
                      background: loading ? '#6c757d' : '#20a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    {loading ? 'Processing...' : 'Link Now (Optional)'}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'nfts' && (
            <div>
              {!contractAddress || !MyNFTABI ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>
                  <h3>NFT Contract Not Available</h3>
                  <p style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>
                    Contract files not found. Please ensure the MyNFT.json file is copied to:
                  </p>
                  <code style={{ background: '#1a1a1a', padding: '0.5rem', borderRadius: '4px', display: 'block', margin: '1rem 0' }}>
                    zeroid-wallet/src/contracts/MyNFT.json
                  </code>
                </div>
              ) : (
                <>
                  <div style={{
                    background: '#e3f2fd',
                    padding: '1rem',
                    borderRadius: '8px',
                    marginBottom: '1.5rem',
                    color: '#1565c0'
                  }}>
                    <h3 style={{ margin: '0 0 0.5rem 0' }}>How to Get NFTs</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                      To purchase NFTs, visit your bank and provide them with your DID. 
                      The bank will purchase NFTs on your behalf and link them to your DID.
                      Your NFTs will appear here automatically.
                    </p>
                  </div>
                  <NFTGallery 
                    userDid={identity.did}
                    contractAddress={contractAddress}
                    contractABI={MyNFTABI}
                  />
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}