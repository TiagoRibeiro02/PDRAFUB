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

function Field({ label, value, valueStyle }: { label: string; value: React.ReactNode; valueStyle?: React.CSSProperties }) {
  return (
    <div className="detail-field">
      <div className="detail-label">{label}</div>
      <div className="detail-value" style={valueStyle}>{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="detail-section">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export default function NFTDetailModal({ nft, ethEurRate, kycContractAddress, kycContractABI, onClose }: Props) {
  const [showTransfer, setShowTransfer] = useState(false);
  const isPurchased = Boolean(nft.didOwner);
  const approxEur = ethEurRate !== null
    ? (parseFloat(nft.price) * ethEurRate).toLocaleString('pt-PT', { maximumFractionDigits: 2 })
    : null;
  const attributes = Array.isArray(nft.metadata?.attributes)
    ? (nft.metadata.attributes as Array<{ trait_type?: string; value?: unknown }>)
    : [];
  const getAttribute = (traitType: string): string => {
    const attr = attributes.find((a) => a.trait_type === traitType);
    return attr ? String(attr.value ?? '') : '';
  };
  const documentType = getAttribute('Document Type');
  const documentNumber = getAttribute('Document Number');

  return (
    <>
      <div className="detail-panel detail-panel-modal">
          <div className="detail-panel-header">
            <h2 className="detail-panel-title">Asset Details</h2>
            <button
              className="close-button"
              onClick={onClose}
            >x</button>
          </div>

          {/* Image */}
          {nft.image && (
            <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
              <img src={nft.image} alt={nft.name}
                className="detailimage" />
            </div>
          )}

          <Section title="Identity Information">
            <Field label="Name"        value={nft.name} />
            <Field label="Owner DID" value={isPurchased ? nft.didOwner : 'Not purchased yet'} />
          </Section>

          {(documentType || documentNumber || nft.issuerName || nft.issuer) && (
            <Section title="Document Information">
              {documentType && <Field label="Document Type" value={documentType} />}
              {documentNumber && <Field label="Document Number" value={documentNumber} />}
              {nft.issuerName && <Field label="Issuer" value={nft.issuerName} />}
              {nft.issuer && <Field label="Issuer DID" value={nft.issuer} />}
            </Section>
          )}

          <Section title="NFT Details">
            <Field label="Token ID" value={nft.tokenId} />
            <Field label="Price" value={`${nft.price} ETH${approxEur ? ` (≈ €${approxEur})` : ''}`} />
            <Field label="Status" value={isPurchased ? 'Purchased' : 'Listed for sale in bank inventory'} />
            <Field
              label="KYC/AML Compliance Status"
              value={isPurchased
                ? (nft.isCompliant ? 'Verified and Compliant' : 'Not Verified')
                : 'Not applicable until purchase'}
              valueStyle={{ color: !isPurchased ? '#888' : (nft.isCompliant ? '#4CAF50' : '#ff6b6b') }}
            />
            {isPurchased && nft.complianceTimestamp && nft.complianceTimestamp > 0 && (
              <Field label="KYC Date" value={new Date(nft.complianceTimestamp * 1000).toLocaleString()} />
            )}
            {isPurchased && nft.kycExpiryTimestamp && nft.kycExpiryTimestamp > 0 && (
              <Field label="KYC Expiry Date" value={new Date(nft.kycExpiryTimestamp * 1000).toLocaleString()} />
            )}
            {isPurchased && nft.kycIssuer && <Field label="KYC Issuer" value={nft.kycIssuer} />}
          </Section>

          {nft.description && (
            <Section title="Description">
              <div className="detail-field">
                <div className="detail-value">{nft.description}</div>
              </div>
            </Section>
          )}

          {attributes.length > 0 && (
            <Section title="Attributes">
              {attributes.map((attr, index) => (
                <Field
                  key={`${String(attr.trait_type ?? 'attribute')}-${index}`}
                  label={attr.trait_type || `Attribute ${index + 1}`}
                  value={String(attr.value ?? '—')}
                />
              ))}
            </Section>
          )}

          {/* Physical Transfer button */}
          {isPurchased ? (
            <div className="detail-section" style={{ borderTop: '1px solid #333', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
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
          ) : (
            <div className="detail-section" style={{ borderTop: '1px solid #333', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
              <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: 0 }}>
                Physical transfer actions become available after this asset is purchased and assigned to an owner DID.
              </p>
            </div>
          )}
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
