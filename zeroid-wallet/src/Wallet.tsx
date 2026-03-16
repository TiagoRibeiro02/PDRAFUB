// ALERTS: on server it may needs cors definition for anu qrng api.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5QrcodeScanner } from "html5-qrcode";
import NFTGallery from "./components/NFTGallery";
import { verifyEntityQR, encryptWalletData, signWalletPayload } from "./utils/qrAuth";

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

async function getQuantumRandomUUID(): Promise<string> {
  let timeoutId: number | undefined;

  try {
    // Fetch 16 random bytes via Vite proxy with timeout fallback
    const controller = new AbortController();
    timeoutId = window.setTimeout(() => controller.abort(), 6000);

    const response = await fetch("/api/quantum?length=16&type=uint8", {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`QRNG request failed (${response.status} ${response.statusText})`);
    }

    const data = await response.json();

    if (!data?.success || !Array.isArray(data.data) || data.data.length < 16) {
      throw new Error("Failed to get quantum random data");
    }

    // Convert the 16 random bytes to UUID format (8-4-4-4-12)
    const bytes = data.data;
    const hex = bytes.map((b: number) => b.toString(16).padStart(2, "0")).join("");
    
    // Format as UUID: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${(
      (parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80
    ).toString(16)}${hex.slice(18, 20)}-${hex.slice(20, 32)}`;
  } catch (error) {
    console.warn("Failed to get quantum random UUID, falling back to crypto.randomUUID():", error);
    return crypto.randomUUID();
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
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
    privateKeyRaw: keyPair.privateKey,
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
  const [nftCount, setNftCount] = useState<number | null>(null);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);
  const [showShareConfirm, setShowShareConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifyingEntity, setVerifyingEntity] = useState(false);
  const [keyFileContent, setKeyFileContent] = useState<string | null>(null);
  const [keyIsEncrypted, setKeyIsEncrypted] = useState(false);
  const [keyPassword, setKeyPassword] = useState('');

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

    // html5-qrcode fires console.error on every frame it doesn't find a code.
    // Suppress that specific noise while the scanner is active.
    const _origError = console.error.bind(console);
    console.error = (...args: any[]) => {
      if (typeof args[0] === 'string' && args[0].includes('NotFoundException')) return;
      _origError(...args);
    };

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
            // Stop scanner immediately to prevent duplicate scans
            scanner.clear();
            setShowQRScanner(false);

            // Phase 2: verify entity identity before showing share dialog
            try {
              setVerifyingEntity(true);
              await verifyEntityQR(data);  // throws with user-visible message on any failure
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
      console.error = _origError;
      scanner.clear().catch(_origError);
    };
  }, [showQRScanner]);

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

  const downloadPrivateKey = async (privateKeyRaw: CryptoKey, did: string) => {
    // Ask user if they want to encrypt the key
    const wantsEncryption = window.confirm(
      "Do you want to encrypt your private key with a password?\n\n" +
      "RECOMMENDED: Encrypting protects your key if someone gains access to the file.\n" +
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
        "Remember this password! You'll need it to import your key.\n" +
        "Without it, your private key cannot be recovered."
      );

      if (!password) {
        alert("Encryption cancelled. Key will not be downloaded.");
        return;
      }

      if (password.length < 12) {
        const proceed = window.confirm(
          "Your password is short (less than 12 characters).\n" +
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

  const handleKeyFileLoad = (content: string) => {
    const trimmed = content.trim();
    setKeyFileContent(trimmed);
    setKeyIsEncrypted(!trimmed.startsWith('-----BEGIN PRIVATE KEY-----'));
    setKeyPassword('');
  };

  const handleKeyFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => handleKeyFileLoad(ev.target?.result as string);
    reader.readAsText(file);
  };

  const handleKeyFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => handleKeyFileLoad(ev.target?.result as string);
    reader.readAsText(file);
  };

  const handleShareConfirm = async () => {
    if (!scannedData || !identity || !user) return;

    if (!scannedData.secret) {
      alert('Entity QR is missing the encryption secret. Please ask the entity to update their application.');
      return;
    }

    if (!keyFileContent) {
      alert('Please drop your DID private key file to sign this request.');
      return;
    }

    if (keyIsEncrypted && !keyPassword) {
      alert('Please enter your key password.');
      return;
    }

    try {
      setSending(true);

      const walletTimestamp = Date.now();
      const canonicalData = `${identity.did}|${scannedData.challenge}|${scannedData.sessionId}|${walletTimestamp}`;

      let signature: string;
      try {
        signature = await signWalletPayload(keyFileContent, keyIsEncrypted ? keyPassword : null, canonicalData);
      } catch (signErr: any) {
        alert('Failed to sign payload: ' + signErr.message);
        setSending(false);
        return;
      }

      // Encrypt identity data with the symmetric secret from the QR
      const encrypted = await encryptWalletData(scannedData.secret, {
        did:             identity.did,
        ethAddress:      user.eth_address ?? '',
        publicKey:       JSON.stringify(identity.publicKeyJwk),
        signature,
        challenge:       scannedData.challenge,
        sessionId:       scannedData.sessionId,
        walletTimestamp,
      });

      // Post only the encrypted blob — no plaintext fields, no signatures
      const response = await fetch('http://localhost:8000/qr-relay.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: scannedData.sessionId,
          encrypted,
        })
      });

      if (response.ok) {
        setShowShareConfirm(false);
        setScannedData(null);
        setKeyFileContent(null);
        setKeyPassword('');
        setKeyIsEncrypted(false);
        alert('Identity shared successfully!');
      } else if (response.status === 409) {
        alert(
          'Security warning: this session has already received a response.\n\n' +
          'Someone may have scanned the same QR code and submitted credentials before you.\n' +
          'Ask the entity to generate a new QR code and try again.'
        );
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
    setKeyPassword('');
    setKeyIsEncrypted(false);
  };

  const downloadEthereumPrivateKey = async (privateKey: string, ethAddress: string, did: string) => {
    // Ask user if they want to encrypt the key
    const wantsEncryption = window.confirm(
      "Do you want to encrypt your Ethereum private key with a password?\n\n" +
      "RECOMMENDED: Encrypting protects your key if someone gains access to the file.\n" +
      "If you choose 'OK', you'll need this password to import to MetaMask later.\n" +
      "If you choose 'Cancel', the key will be stored unencrypted."
    );

    let fileContent = privateKey;
    let fileName = `${did}-ethereum.key`;

    if (wantsEncryption) {
      const password = prompt(
        "Enter a strong password to encrypt your Ethereum private key:\n\n" +
        "Remember this password! You'll need it to import to MetaMask.\n" +
        "Without it, your private key cannot be recovered."
      );

      if (!password) {
        alert("Encryption cancelled. Ethereum key will not be downloaded.");
        return;
      }

      if (password.length < 12) {
        const proceed = window.confirm(
          "Your password is short (less than 12 characters).\n" +
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

      // Clear loading immediately after successful persistence/state update.
      // Any dialogs/download prompts below should not keep the button in "Creating DID...".
      setLoading(false);

      // Download DID private key
      downloadPrivateKey(id.privateKeyRaw, id.did);

      // Download Ethereum private key
      downloadEthereumPrivateKey(id.ethPrivateKey, id.ethAddress, id.did);

      alert(
        "Your DID and Ethereum wallet have been created!\n\n" +
        "TWO files have been downloaded:\n" +
        "1. DID private key (.key file)\n" +
        "2. Ethereum private key (.eth.key file)\n\n" +
        "Store both files safely! These are your only copies.\n\n" +
        "Your Ethereum address: " + id.ethAddress + "\n\n" +
        "When the bank purchases NFTs for you, they will automatically:\n" +
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

  return (
    <div style={{ 
      padding: "clamp(0.75rem, 2vw, 1.5rem)", 
      maxWidth: "1600px", 
      margin: "0 auto",
      width: "100%",
      boxSizing: "border-box",
      minHeight: "100vh",
    }}>
      {!identity ? (
        <div 
          style={{
            margin: '0 auto',
            padding: 'clamp(1.5rem, 3vw, 2.5rem)',
            background: '#1a1a1a',
            borderRadius: '12px',
            textAlign: 'center',
            border: '1px solid rgba(202, 165, 97, 0.3)',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.border = '1px solid rgba(202, 165, 97, 1)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(202, 165, 97, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.border = '1px solid rgba(202, 165, 97, 0.3)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', marginBottom: '1rem', color: "#ffffff" }}>ZeroID Wallet</h1>
          {user && <p style={{ fontSize: 'clamp(1rem, 1.8vw, 1.2rem)', marginBottom: '1rem' }}>Welcome, {user.username}!</p>}
          <p style={{ fontSize: 'clamp(0.95rem, 1.5vw, 1.1rem)', color: '#aaa', marginBottom: '2rem' }}>You don't have a DID yet.</p>
          {error && (
            <div
              style={{
                margin: '0 auto 1rem',
                padding: '0.75rem 1rem',
                maxWidth: '640px',
                background: 'rgba(255, 0, 0, 0.12)',
                border: '1px solid rgba(255, 70, 70, 0.4)',
                borderRadius: '8px',
                color: '#ffb0b0',
                fontSize: '0.95rem',
                wordBreak: 'break-word',
              }}
            >
              {error}
            </div>
          )}
          <button 
            onClick={createIdentity} 
            disabled={loading}
            style={{
              padding: 'clamp(0.75rem, 1.5vw, 1rem) clamp(1.5rem, 3vw, 2.5rem)',
              background: 'rgb(202, 165, 97)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 'clamp(1rem, 1.8vw, 1.2rem)',
              fontWeight: 'bold',
              transition: 'all 0.3s',
              opacity: loading ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {if (!loading) (e.target as HTMLButtonElement).style.background = 'rgb(180, 145, 77)'}}
            onMouseLeave={(e) => {if (!loading) (e.target as HTMLButtonElement).style.background = 'rgb(202, 165, 97)'}}
          >
            {loading ? "Creating DID..." : "Create DID"}
          </button>
        </div>
      ) : (
        <>
          <h1 style={{textAlign:"center", margin: "1rem 0", color: "#ffffff"}}>ZeroID Wallet</h1>
          
          {/* Header with Welcome, DID, and Profile Button */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '2rem',
              padding: 'clamp(1rem, 3vw, 2rem)',
              background: '#1a1a1a',
              borderRadius: '12px',
              flexWrap: 'wrap',
              gap: '1rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              border: '1px solid rgba(202, 165, 97, 0.3)',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.border = '1px solid rgba(202, 165, 97, 1)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(202, 165, 97, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.border = '1px solid rgba(202, 165, 97, 0.3)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            }}
          >
            <div style={{ flex: 1, minWidth: '250px' }}>
              {user && <p style={{ margin: 0, fontSize: 'clamp(1rem, 2vw, 1.3rem)' }}>Welcome, <strong>{user.username}</strong>!</p>}
              <div style={{ marginTop: '0.75rem' }}>
                <strong style={{ fontSize: 'clamp(0.85rem, 1.5vw, 1rem)', color: 'rgb(202, 165, 97)' }}>DID: </strong>
                <span style={{ 
                  fontSize: 'clamp(0.75rem, 1.3vw, 0.95rem)', 
                  fontFamily: 'monospace', 
                  color: '#fff',
                  wordBreak: 'break-all',
                }}>{identity.did}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/profile')}
                style={{
                  padding: 'clamp(0.75rem, 1.5vw, 1rem) clamp(1.25rem, 2.5vw, 2rem)',
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
                View Profile
              </button>
              <button
                onClick={() => setShowQRScanner(true)}
                style={{
                  padding: 'clamp(0.75rem, 1.5vw, 1rem) clamp(1.25rem, 2.5vw, 2rem)',
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
                Share via QR
              </button>
            </div>
          </div>

          {/* NFT Gallery Section */}
          <div style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)' }}>My Assets</h3>
              <div 
                style={{ 
                  position: 'relative',
                  display: 'inline-block',
                }}
                onMouseEnter={() => setShowInfoTooltip(true)}
                onMouseLeave={() => setShowInfoTooltip(false)}
              >
                <button
                  onClick={() => setShowInfoTooltip(!showInfoTooltip)}
                  style={{
                    background: 'rgb(202, 165, 97)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: 'clamp(28px, 3vw, 36px)',
                    height: 'clamp(32px, 3vw, 40px)',
                    fontSize: 'clamp(14px, 1.5vw, 18px)',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s',
                  }}
                  aria-label="Info about getting NFTs"
                  onMouseEnter={(e) => {(e.target as HTMLButtonElement).style.background = 'rgb(180, 145, 77)'}}
                  onMouseLeave={(e) => {(e.target as HTMLButtonElement).style.background = 'rgb(202, 165, 97)'}}
                >
                  !
                </button>
                {showInfoTooltip && (
                  <div style={{
                    position: 'absolute',
                    top: '40px',
                    left: '0',
                    background: '#fef3cd',
                    color: '#856404',
                    padding: 'clamp(0.75rem, 2vw, 1.25rem)',
                    borderRadius: '10px',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.4)',
                    zIndex: 1000,
                    minWidth: '280px',
                    maxWidth: 'min(500px, 90vw)',
                  }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: 'clamp(0.95rem, 1.5vw, 1.1rem)' }}>How to Get Assets</h4>
                    <p style={{ margin: 0, fontSize: 'clamp(0.85rem, 1.3vw, 0.95rem)' }}>
                      To purchase assets, visit your bank and provide them with your DID. 
                      The bank will purchase assets on your behalf and link them to your DID.
                      Your assets will appear here automatically.
                    </p>
                  </div>
                )}
              </div>
            </div>
            {!contractAddress || !MyNFTABI ? (
              <div 
                style={{ 
                  padding: "clamp(1.5rem, 3vw, 2.5rem)", 
                  textAlign: "center", 
                  color: "#888",
                  background: '#1a1a1a',
                  borderRadius: '12px',
                  border: '1px solid rgba(202, 165, 97, 0.3)',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.border = '1px solid rgba(202, 165, 97, 1)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(202, 165, 97, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.border = '1px solid rgba(202, 165, 97, 0.3)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <h4 style={{ fontSize: 'clamp(1.1rem, 2vw, 1.4rem)' }}>NFT Contract Not Available</h4>
                <p style={{ fontSize: 'clamp(0.85rem, 1.3vw, 1rem)', marginTop: "0.75rem" }}>
                  Contract files not found. Please ensure the MyNFT.json file is copied to:
                </p>
                <code style={{ 
                  background: '#0a0a0a', 
                  padding: 'clamp(0.5rem, 1.5vw, 0.75rem)', 
                  borderRadius: '6px', 
                  display: 'block', 
                  margin: '1rem 0',
                  fontSize: 'clamp(0.75rem, 1.2vw, 0.9rem)',
                }}>
                  zeroid-wallet/src/contracts/MyNFT.json
                </code>
              </div>
            ) : (
              <>
                {nftCount === 0 && (
                  <div 
                    style={{
                      background: '#fef3cd',
                      padding: 'clamp(1rem, 2vw, 1.5rem)',
                      borderRadius: '12px',
                      marginBottom: '1.5rem',
                      color: '#856404',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      border: '1px solid rgb(202, 165, 97)',
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.border = '1px solid rgb(180, 145, 77)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgb(202, 165, 97)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.border = '1px solid rgb(202, 165, 97)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                    }}
                  >
                    <h4 style={{ margin: '0 0 0.75rem 0', fontSize: 'clamp(1rem, 1.8vw, 1.2rem)' }}>How to Get Assets</h4>
                    <p style={{ margin: 0, fontSize: 'clamp(0.85rem, 1.3vw, 0.95rem)', lineHeight: '1.6' }}>
                      To purchase Assets, visit your bank and provide them with your DID. 
                      The bank will purchase Assets on your behalf and link them to your DID.
                      Your Assets will appear here automatically.
                    </p>
                  </div>
                )}
                <NFTGallery 
                  userDid={identity.did}
                  contractAddress={contractAddress}
                  contractABI={MyNFTABI}
                  onNFTsLoaded={setNftCount}
                />
              </>
            )}
          </div>
        </>
      )}

      {/* Entity verification loading overlay */}
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
              Verifying entity identity…
            </p>
            <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              Checking signature and relay registration
            </p>
          </div>
        </div>
      )}

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
              An entity is requesting your signed identity. Your DID document will be
              cryptographically signed to prove ownership and prevent replay attacks.
            </p>

            {/* Identity summary */}
            <div style={{
              background: '#0a0a0a',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              border: '1px solid #333'
            }}>
              <p style={{ margin: '0.5rem 0', color: '#fff', wordBreak: 'break-all' }}>
                <strong>DID:</strong> {identity?.did}
              </p>
              <p style={{ margin: '0.5rem 0', color: '#fff' }}>
                <strong>Ethereum Address:</strong> {user?.eth_address || 'Not available'}
              </p>
              {scannedData?.entityName && (
                <p style={{ margin: '0.5rem 0', color: 'rgb(202, 165, 97)' }}>
                  <strong>Requesting entity:</strong> {scannedData.entityName}
                </p>
              )}
            </div>

            {/* Key file drop zone */}
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ color: '#aaa', margin: '0 0 0.5rem', fontSize: '0.85rem' }}>
                Drop your DID private key file to sign:
              </p>
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleKeyFileDrop}
                onClick={() => (document.getElementById('wlt-key-input') as HTMLInputElement)?.click()}
                style={{
                  border: `2px dashed ${keyFileContent ? '#4CAF50' : '#555'}`,
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: keyFileContent ? '#0a2a0a' : '#111',
                  color: keyFileContent ? '#4CAF50' : '#888',
                  fontSize: '0.9rem',
                  userSelect: 'none',
                }}
              >
                {keyFileContent
                  ? `✓ Key loaded${keyIsEncrypted ? ' (encrypted)' : ''}`
                  : 'Drop .key file here or click to browse'}
                <input
                  id="wlt-key-input"
                  type="file"
                  accept=".key,.enc"
                  style={{ display: 'none' }}
                  onChange={handleKeyFileSelect}
                />
              </div>
              {keyIsEncrypted && (
                <input
                  type="password"
                  placeholder="Key password"
                  value={keyPassword}
                  onChange={e => setKeyPassword(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    background: '#1a1a1a',
                    border: '1px solid #555',
                    color: 'white',
                    borderRadius: '6px',
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
                disabled={sending || !keyFileContent || (keyIsEncrypted && !keyPassword)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: (sending || !keyFileContent || (keyIsEncrypted && !keyPassword)) ? '#666' : 'rgb(202, 165, 97)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: (sending || !keyFileContent || (keyIsEncrypted && !keyPassword)) ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}
              >
                {sending ? 'Signing & Sharing...' : 'Sign & Share'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}