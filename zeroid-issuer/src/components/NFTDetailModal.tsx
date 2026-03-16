import { useState } from 'react';
import type { NFTItem } from '../IssuerNFTManager';
import PhysicalTransferModal from './PhysicalTransferModal.tsx';

interface Props {
  nft: NFTItem;
  ethEurRate: number | null;
  kycContractAddress?: string;
  kycContractABI?: unknown;
  onClose: () => void;
}

const OVERLAY: React.CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.85)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, padding: '1rem',
};

const PANEL: React.CSSProperties = {
  background: '#1a1a1a',
  border: '1px solid #333',
  borderRadius: '12px',
  width: '100%',
  maxWidth: '600px',
  maxHeight: '90vh',
  overflowY: 'auto',
  padding: '2rem',
  position: 'relative',
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
        {label}
      </div>
      <div style={{ color: '#ddd', fontSize: '0.9rem', wordBreak: 'break-all' }}>{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ color: 'rgb(202,165,97)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.75rem' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function NFTDetailModal({ nft, ethEurRate, kycContractAddress, kycContractABI, onClose }: Props) {
  const [showTransfer, setShowTransfer] = useState(false);
  const approxEur = ethEurRate !== null
    ? (parseFloat(nft.price) * ethEurRate).toLocaleString('pt-PT', { maximumFractionDigits: 2 })
    : null;

  const metaKeys = Object.keys(nft.metadata).filter(
    k => !['name', 'description', 'image', 'issuer', 'issuer_name'].includes(k)
  );

  return (
    <>
      <div style={OVERLAY} onClick={onClose}>
        <div style={PANEL} onClick={e => e.stopPropagation()}>
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: '1rem', right: '1rem',
              background: 'transparent', border: 'none', color: '#888',
              fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1,
            }}
          >✕</button>

          <h2 style={{ margin: '0 0 1.5rem', color: 'white' }}>Asset Details</h2>

          {/* Image */}
          {nft.image && (
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <img src={nft.image} alt={nft.name}
                style={{ maxWidth: '100%', maxHeight: '220px', objectFit: 'contain', borderRadius: '8px' }} />
            </div>
          )}

          {/* Asset info */}
          <Section title="Asset">
            <Field label="Name"        value={nft.name} />
            <Field label="Description" value={nft.description || '—'} />
            <Field label="Token ID"    value={`#${nft.tokenId}`} />
            <Field label="Price"       value={`${nft.price} ETH`} />
            {approxEur && <Field label="Approx. Value" value={`€${approxEur}`} />}
            {nft.issuerName && <Field label="Issuer" value={nft.issuerName} />}
            {nft.issuer     && <Field label="Issuer DID" value={nft.issuer} />}
          </Section>

          {/* Ownership */}
          <Section title="Ownership">
            <Field label="Owner DID" value={nft.didOwner} />
            <Field label="KYC / AML Status" value={
              <span style={{ color: nft.isCompliant ? '#4CAF50' : '#ff6b6b', fontWeight: 'bold' }}>
                {nft.isCompliant ? '✓ Verified and Compliant' : '✕ Not Verified'}
              </span>
            } />
            {nft.complianceTimestamp && nft.complianceTimestamp > 0 && (
              <Field label="KYC Date" value={new Date(nft.complianceTimestamp * 1000).toLocaleString()} />
            )}
            {nft.kycExpiryTimestamp && nft.kycExpiryTimestamp > 0 && (
              <Field label="KYC Expiry" value={new Date(nft.kycExpiryTimestamp * 1000).toLocaleString()} />
            )}
            {nft.kycIssuer && <Field label="KYC Issuer" value={nft.kycIssuer} />}
          </Section>

          {/* Physical Transfer button */}
          <div style={{ borderTop: '1px solid #333', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
            <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1rem' }}>
              To hand over the physical asset to the owner, you must verify they hold the private key
              corresponding to the DID registered on the blockchain.
            </p>
            <button
              onClick={() => setShowTransfer(true)}
              style={{
                width: '100%', padding: '0.85rem',
                background: 'rgb(202,165,97)', color: 'white',
                border: 'none', borderRadius: '8px',
                cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem',
              }}
            >
              Physical Transfer →
            </button>
          </div>
        </div>
      </div>

      {showTransfer && (
        <PhysicalTransferModal
          nft={nft}
          ethEurRate={ethEurRate}
          kycContractAddress={kycContractAddress}
          kycContractABI={kycContractABI}
          onClose={() => setShowTransfer(false)}
        />
      )}
    </>
  );
}
