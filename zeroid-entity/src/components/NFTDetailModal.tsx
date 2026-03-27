import type { NFTListing } from '../BankNFTManager';

interface NFTDetailModalProps {
  nft: NFTListing;
  ethEurRate: number | null;
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

export default function NFTDetailModal({ nft, ethEurRate, onClose }: NFTDetailModalProps) {
  const approxEur = ethEurRate !== null
    ? (parseFloat(nft.price) * ethEurRate).toLocaleString('pt-PT', { maximumFractionDigits: 2 })
    : null;
  const isPurchased = Boolean(nft.didOwner);
  const attributes = Array.isArray(nft.metadata?.attributes)
    ? (nft.metadata?.attributes as Array<{ trait_type?: string; value?: unknown }>)
    : [];
  const getAttribute = (traitType: string): string => {
    const attr = attributes.find((a) => a.trait_type === traitType);
    return attr ? String(attr.value ?? '') : '';
  };
  const issuerName = getAttribute('Issuer');
  const documentType = getAttribute('Document Type');
  const documentNumber = getAttribute('Document Number');
  const ownerAddress = getAttribute('Owner Address');

  return (
    <div className="detail-panel detail-panel-modal">
      <div className="detail-panel-header">
        <h2 className="detail-panel-title">NFT Details</h2>
        <button
          className="close-button"
          onClick={onClose}
        >
          x
        </button>
      </div>

        {nft.image && (
          <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
            <img
              src={nft.image}
              alt={nft.name}
              className="detailimage"
            />
          </div>
        )}

        <div className="detail-section">
          <h3>Identity Information</h3>
          <Field label="Name" value={nft.name} />
          <Field label="Owner DID" value={isPurchased ? nft.didOwner : 'Not assigned yet'} />
        </div>

        {(documentType || documentNumber || issuerName) && (
          <div className="detail-section">
            <h3>Document Information</h3>
            {documentType && <Field label="Document Type" value={documentType} />}
            {documentNumber && <Field label="Document Number" value={documentNumber} />}
            {issuerName && <Field label="Issuer" value={issuerName} />}
          </div>
        )}

        <div className="detail-section">
          <h3>NFT Details</h3>
          <Field label="Token ID" value={nft.tokenId} />
          {ownerAddress && <Field label="Owner Address" value={ownerAddress} />}
          <Field label="Price" value={`${nft.price} ETH${approxEur ? ` (≈ €${approxEur})` : ''}`} />
          <Field label="Status" value={isPurchased ? 'Purchased' : 'Available for purchase'} />
          {isPurchased && (
            <>
              <Field
                label="KYC/AML Compliance Status"
                value={nft.isCompliant ? 'Verified and Compliant' : 'Not Verified'}
                valueStyle={{ color: nft.isCompliant ? '#4CAF50' : '#ff6b6b' }}
              />
              {nft.complianceTimestamp && nft.complianceTimestamp > 0 && (
                <Field label="KYC Date" value={new Date(nft.complianceTimestamp * 1000).toLocaleString()} />
              )}
            </>
          )}
        </div>

        {nft.description && (
          <div className="detail-section">
            <h3>Description</h3>
            <div className="detail-field">
              <div className="detail-value">{nft.description}</div>
            </div>
          </div>
        )}

        {attributes.length > 0 && (
          <div className="detail-section">
            <h3>Attributes</h3>
            {attributes.map((attr, index) => (
              <Field
                key={`${String(attr.trait_type ?? 'attribute')}-${index}`}
                label={attr.trait_type || `Attribute ${index + 1}`}
                value={String(attr.value ?? '—')}
              />
            ))}
          </div>
        )}
    </div>
  );
}
