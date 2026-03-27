import React, { useRef, useState } from 'react';
import type { NFTData } from './types';
import { signWalletPayload } from '../utils/qrAuth';

interface DetailPanelProps {
  nft: NFTData;
  onClose: () => void;
}

// ── Sign Ownership Claim modal ────────────────────────────────────────────────
interface SignModalProps {
  nft: NFTData;
  onClose: () => void;
}

function SignOwnershipModal({ nft, onClose }: SignModalProps) {
  const fileRef                     = useRef<HTMLInputElement>(null);
  const [keyContent, setKeyContent] = useState('');
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [password, setPassword]     = useState('');
  const [signing, setSigning]       = useState(false);
  const [error, setError]           = useState('');
  const [done, setDone]             = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const content = (ev.target?.result as string).trim();
      setKeyContent(content);
      setIsEncrypted(!content.startsWith('-----BEGIN PRIVATE KEY-----'));
      setError('');
    };
    reader.readAsText(file);
  };

  const handleSign = async () => {
    if (!keyContent) { setError('Please upload your key file first.'); return; }
    if (isEncrypted && !password) { setError('Enter your key password.'); return; }

    setSigning(true);
    setError('');

    try {
      const userRaw = localStorage.getItem('user');
      const userData = userRaw ? JSON.parse(userRaw) : null;
      const publicKeyJwk = userData?.pk ? JSON.parse(userData.pk) : null;

      const timestamp = Date.now();
      const message = [
        `Physical ownership claim for NFT #${nft.tokenId}`,
        `DID: ${nft.did}`,
        `Timestamp: ${timestamp}`,
      ].join('\n');

      const signature = await signWalletPayload(keyContent, isEncrypted ? password : null, message);

      const claim = {
        did:       nft.did,
        nftId:     nft.tokenId,
        message,
        signature,
        publicKey: JSON.stringify(publicKeyJwk),
        timestamp,
      };

      const blob = new Blob([JSON.stringify(claim, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `claim_nft_${nft.tokenId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSigning(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, padding: '1rem',
    }} onClick={onClose}>
      <div style={{
        background: '#1a1a1a',
        border: '2px solid rgb(202,165,97)',
        borderRadius: '12px',
        width: '100%', maxWidth: '480px',
        padding: '2rem', position: 'relative',
      }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position:'absolute', top:'1rem', right:'1rem', background:'transparent', border:'none', color:'#888', fontSize:'1.3rem', cursor:'pointer' }}>✕</button>

        <h3 style={{ margin:'0 0 0.5rem', color:'rgb(202,165,97)' }}>Sign Ownership Claim</h3>
        <p style={{ color:'#888', fontSize:'0.85rem', margin:'0 0 1.5rem', lineHeight:1.5 }}>
          Create a cryptographic proof that you own this asset.
          Upload your DID private key; the claim file will be downloaded automatically.
        </p>

        <div style={{ marginBottom:'1rem', padding:'0.75rem', background:'#111', borderRadius:'6px', fontSize:'0.8rem', color:'#888' }}>
          <strong style={{ color:'#aaa' }}>Signing for:</strong> NFT #{nft.tokenId} — {nft.name}<br />
          <strong style={{ color:'#aaa' }}>DID:</strong> <span style={{ wordBreak:'break-all' }}>{nft.did}</span>
        </div>

        {!done ? (
          <>
            <div
              style={{ border:'2px dashed #444', borderRadius:'8px', padding:'1.25rem', textAlign:'center', cursor:'pointer', marginBottom:'1rem' }}
              onClick={() => fileRef.current?.click()}
            >
              <div style={{ fontSize:'1.5rem', marginBottom:'0.3rem' }}>🔑</div>
              <div style={{ color:'#888', fontSize:'0.85rem' }}>
                {keyContent
                  ? <span style={{ color:'#4CAF50' }}>✓ Key file loaded{isEncrypted ? ' (encrypted)' : ' (plain PEM)'}</span>
                  : 'Click to upload your private key file (.pem or .key.enc)'}
              </div>
              <input ref={fileRef} type="file" style={{ display:'none' }} onChange={handleFile} />
            </div>

            {isEncrypted && keyContent && (
              <input
                type="password"
                placeholder="Key file password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ width:'100%', padding:'0.65rem', background:'#111', border:'1px solid #444', color:'white', borderRadius:'6px', marginBottom:'1rem', fontSize:'0.9rem' }}
              />
            )}

            {error && (
              <div style={{ color:'#ff6b6b', background:'#2a1a1a', padding:'0.65rem', borderRadius:'6px', fontSize:'0.85rem', marginBottom:'1rem' }}>
                {error}
              </div>
            )}

            <button
              onClick={handleSign}
              disabled={signing || !keyContent}
              style={{ width:'100%', padding:'0.8rem', background: keyContent ? 'rgb(202,165,97)' : '#333', color:'white', border:'none', borderRadius:'8px', cursor: keyContent ? 'pointer' : 'not-allowed', fontWeight:'bold', fontSize:'1rem' }}
            >
              {signing ? 'Signing…' : 'Sign & Download Claim File'}
            </button>
          </>
        ) : (
          <div style={{ textAlign:'center', padding:'1rem' }}>
            <div style={{ fontSize:'2rem', marginBottom:'0.5rem' }}>✅</div>
            <p style={{ color:'#4CAF50', fontWeight:'bold', marginBottom:'0.5rem' }}>claim_nft_{nft.tokenId}.json downloaded!</p>
            <p style={{ color:'#888', fontSize:'0.85rem', marginBottom:'1.5rem' }}>
              Send this file to the issuer to prove ownership and receive your physical asset.
            </p>
            <button onClick={onClose} style={{ padding:'0.6rem 1.5rem', background:'rgb(202,165,97)', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'bold' }}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const DetailPanel: React.FC<DetailPanelProps> = ({ nft, onClose }) => {
  const imageUrl = nft.metadata?.image || '';
  const complianceTimestamp = nft.metadata?.complianceTimestamp as number | undefined;
  const kycExpiryTimestamp = nft.metadata?.kycExpiryTimestamp as number | undefined;
  const kycIssuer = nft.metadata?.kycIssuer as string | undefined;
  const attributes = Array.isArray(nft.metadata?.attributes)
    ? (nft.metadata?.attributes as Array<{ trait_type?: string; value?: unknown }>)
    : [];
  const [showSignModal, setShowSignModal] = useState(false);

  return (
    <div className="detail-panel">
      <div className="detail-panel-header">
        <h2 className="detail-panel-title">NFT Details</h2>
        <button className="close-button" onClick={onClose}>✕</button>
      </div>

      {imageUrl && (
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <img
            src={imageUrl}
            alt={nft.name}
            className="detailimage"
          />
        </div>
      )}

      <div className="detail-section">
        <h3>Identity Information</h3>
        <div className="detail-field">
          <div className="detail-label">Name</div>
          <div className="detail-value">{nft.name}</div>
        </div>
        <div className="detail-field">
          <div className="detail-label">Owner DID</div>
          <div className="detail-value">{nft.did}</div>
        </div>
        {nft.nationality && (
          <div className="detail-field">
            <div className="detail-label">Nationality</div>
            <div className="detail-value">{nft.nationality}</div>
          </div>
        )}
      </div>

      {(nft.documentType || nft.documentNumber || nft.issuer) && (
        <div className="detail-section">
          <h3>Document Information</h3>
          {nft.documentType && (
            <div className="detail-field">
              <div className="detail-label">Document Type</div>
              <div className="detail-value">{nft.documentType}</div>
            </div>
          )}
          {nft.documentNumber && (
            <div className="detail-field">
              <div className="detail-label">Document Number</div>
              <div className="detail-value">{nft.documentNumber}</div>
            </div>
          )}
          {nft.issuer && (
            <div className="detail-field">
              <div className="detail-label">Issuer</div>
              <div className="detail-value">{nft.issuer}</div>
            </div>
          )}
        </div>
      )}

      <div className="detail-section">
        <h3>NFT Details</h3>
        <div className="detail-field">
          <div className="detail-label">Token ID</div>
          <div className="detail-value">{nft.tokenId}</div>
        </div>
        <div className="detail-field">
          <div className="detail-label">Owner Address</div>
          <div className="detail-value">{nft.owner}</div>
        </div>
        <div className="detail-field">
          <div className="detail-label">KYC/AML Compliance Status</div>
          <div className="detail-value" style={{ color: nft.isActive ? '#4CAF50' : '#ff6b6b' }}>
            {nft.isActive ? 'Verified and Compliant' : 'Not Verified'}
          </div>
        </div>
        {complianceTimestamp && complianceTimestamp > 0 && (
          <div className="detail-field">
            <div className="detail-label">KYC Date</div>
            <div className="detail-value">
              {new Date(complianceTimestamp * 1000).toLocaleString()}
            </div>
          </div>
        )}
        {kycExpiryTimestamp && kycExpiryTimestamp > 0 && (
          <div className="detail-field">
            <div className="detail-label">KYC Expiry Date</div>
            <div className="detail-value">
              {new Date(kycExpiryTimestamp * 1000).toLocaleString()}
            </div>
          </div>
        )}
        {kycIssuer && (
          <div className="detail-field">
            <div className="detail-label">KYC Issuer</div>
            <div className="detail-value">{kycIssuer}</div>
          </div>
        )}
      </div>

      {nft.metadata?.description && (
        <div className="detail-section">
          <h3>Description</h3>
          <div className="detail-field">
            <div className="detail-value">{nft.metadata.description}</div>
          </div>
        </div>
      )}

      {attributes.length > 0 && (
        <div className="detail-section">
          <h3>Attributes</h3>
          {attributes.map((attr, index) => (
            <div className="detail-field" key={`${String(attr.trait_type ?? 'attribute')}-${index}`}>
              <div className="detail-label">{attr.trait_type || `Attribute ${index + 1}`}</div>
              <div className="detail-value">{String(attr.value ?? '—')}</div>
            </div>
          ))}
        </div>
      )}

      {/* Physical ownership claim signing */}
      <div className="detail-section" style={{ borderTop: '1px solid #333', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
        <h3>Physical Asset</h3>
        <p style={{ color: '#888', fontSize: '0.82rem', marginBottom: '0.75rem', lineHeight: 1.5 }}>
          If you want to physically collect this asset from the issuer, sign an ownership claim
          they can verify cryptographically.
        </p>
        <button
          onClick={() => setShowSignModal(true)}
          style={{
            width: '100%', padding: '0.75rem',
            background: 'rgb(202,165,97)', color: 'white',
            border: 'none', borderRadius: '8px',
            cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem',
          }}
        >
          Sign Ownership Claim
        </button>
      </div>

      {showSignModal && (
        <SignOwnershipModal nft={nft} onClose={() => setShowSignModal(false)} />
      )}
    </div>
  );
};

export default DetailPanel;
