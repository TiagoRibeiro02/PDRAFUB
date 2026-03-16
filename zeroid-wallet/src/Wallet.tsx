// ALERTS: on server it may needs cors definition for anu qrng api.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5QrcodeScanner } from "html5-qrcode";
import NFTGallery from "./components/NFTGallery";
import { verifyEntityQR, encryptWalletData, signWalletPayload } from "./utils/qrAuth";
import "./Wallet.css";

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
    <div className="wallet-page">
      {!identity ? (
        <div className="wallet-card">
          <h1 className="wallet-title">ZeroID Wallet</h1>
          {user && <p className="wallet-welcome">Welcome, {user.username}!</p>}
          <p className="wallet-subtitle">You don't have a DID yet.</p>
          {error && (
            <div className="wallet-error">
              {error}
            </div>
          )}
          <button 
            onClick={createIdentity} 
            disabled={loading}
            className="wallet-btn-primary"
          >
            {loading ? "Creating DID..." : "Create DID"}
          </button>
        </div>
      ) : (
        <>
          <h1 className="wallet-main-title">ZeroID Wallet</h1>
          
          {/* Header with Welcome, DID, and Profile Button */}
          <div className="wallet-header">
            <div className="wallet-header-info">
              {user && <p className="wallet-header-welcome">Welcome, <strong>{user.username}</strong>!</p>}
              <div className="wallet-did-row">
                <strong className="wallet-did-label">DID: </strong>
                <span className="wallet-did-value">{identity.did}</span>
              </div>
            </div>
            <div className="wallet-header-actions">
              <button
                onClick={() => navigate('/profile')}
                className="wallet-btn-header"
              >
                View Profile
              </button>
              <button
                onClick={() => setShowQRScanner(true)}
                className="wallet-btn-header"
              >
                Share via QR
              </button>
            </div>
          </div>

          {/* NFT Gallery Section */}
          <div className="wallet-nft-section">
            <div className="wallet-assets-header">
              <h3 className="wallet-assets-title">My Assets</h3>
              <div 
                className="wallet-tooltip-wrap"
                onMouseEnter={() => setShowInfoTooltip(true)}
                onMouseLeave={() => setShowInfoTooltip(false)}
              >
                <button
                  onClick={() => setShowInfoTooltip(!showInfoTooltip)}
                  className="wallet-info-btn"
                  aria-label="Info about getting NFTs"
                >
                  !
                </button>
                {showInfoTooltip && (
                  <div className="wallet-tooltip">
                    <h4 className="wallet-tooltip-title">How to Get Assets</h4>
                    <p className="wallet-tooltip-text">
                      To purchase assets, visit your bank and provide them with your DID. 
                      The bank will purchase assets on your behalf and link them to your DID.
                      Your assets will appear here automatically.
                    </p>
                  </div>
                )}
              </div>
            </div>
            {!contractAddress || !MyNFTABI ? (
              <div className="wallet-contract-box">
                <h4 className="wallet-contract-title">NFT Contract Not Available</h4>
                <p className="wallet-contract-text">
                  Contract files not found. Please ensure the MyNFT.json file is copied to:
                </p>
                <code className="wallet-contract-code">
                  zeroid-wallet/src/contracts/MyNFT.json
                </code>
              </div>
            ) : (
              <>
                {nftCount === 0 && (
                  <div className="wallet-help-box">
                    <h4 className="wallet-help-title">How to Get Assets</h4>
                    <p className="wallet-help-text">
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
        <div className="wallet-overlay wallet-overlay-verify">
          <div className="wallet-verify-box">
            <p className="wallet-verify-title">
              Verifying entity identity…
            </p>
            <p className="wallet-verify-subtitle">
              Checking signature and relay registration
            </p>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <div className="wallet-overlay wallet-overlay-modal">
          <div className="wallet-modal">
            <button
              onClick={() => setShowQRScanner(false)}
              className="wallet-modal-close"
            >
              ✕
            </button>
            <h3 className="wallet-modal-title">Scan QR Code</h3>
            <p className="wallet-modal-subtitle">
              Scan a QR code from an entity requesting your DID
            </p>
            <div id="qr-reader"></div>
          </div>
        </div>
      )}

      {/* Share Confirmation Dialog */}
      {showShareConfirm && (
        <div className="wallet-overlay wallet-overlay-confirm">
          <div className="wallet-confirm-modal">
            <h3 className="wallet-confirm-title">Share Your Identity?</h3>
            <p className="wallet-confirm-text">
              An entity is requesting your signed identity. Your DID document will be
              cryptographically signed to prove ownership and prevent replay attacks.
            </p>

            {/* Identity summary */}
            <div className="wallet-identity-summary">
              <p className="wallet-summary-line wallet-summary-line-break">
                <strong>DID:</strong> {identity?.did}
              </p>
              <p className="wallet-summary-line">
                <strong>Ethereum Address:</strong> {user?.eth_address || 'Not available'}
              </p>
              {scannedData?.entityName && (
                <p className="wallet-summary-line wallet-summary-line-entity">
                  <strong>Requesting entity:</strong> {scannedData.entityName}
                </p>
              )}
            </div>

            {/* Key file drop zone */}
            <div className="wallet-key-block">
              <p className="wallet-key-label">
                Drop your DID private key file to sign:
              </p>
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleKeyFileDrop}
                onClick={() => (document.getElementById('wlt-key-input') as HTMLInputElement)?.click()}
                className={`wallet-key-dropzone ${keyFileContent ? 'loaded' : ''}`}
              >
                {keyFileContent
                  ? `✓ Key loaded${keyIsEncrypted ? ' (encrypted)' : ''}`
                  : 'Drop .key file here or click to browse'}
                <input
                  id="wlt-key-input"
                  type="file"
                  accept=".key,.enc"
                  className="wallet-key-input"
                  onChange={handleKeyFileSelect}
                />
              </div>
              {keyIsEncrypted && (
                <input
                  type="password"
                  placeholder="Key password"
                  value={keyPassword}
                  onChange={e => setKeyPassword(e.target.value)}
                  className="wallet-password-input"
                />
              )}
            </div>

            <div className="wallet-actions-row">
              <button
                onClick={handleShareCancel}
                disabled={sending}
                className="wallet-btn-cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleShareConfirm}
                disabled={sending || !keyFileContent || (keyIsEncrypted && !keyPassword)}
                className="wallet-btn-share"
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