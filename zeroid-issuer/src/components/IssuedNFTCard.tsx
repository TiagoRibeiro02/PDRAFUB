import type { NFTItem } from '../IssuerNFTManager';

interface Props {
  nft: NFTItem;
  onClick: () => void;
}

export default function IssuedNFTCard({ nft, onClick }: Props) {
  return (
    <div className="nft-card" onClick={onClick} title="Click to view details">
      {nft.image
        ? <img src={nft.image} alt={nft.name} className="nft-card-img" />
        : <div className="nft-card-img-placeholder">💎</div>
      }

      <div className="nft-card-body">
        <div className="nft-card-name">{nft.name}</div>
        <div className="nft-card-desc">{nft.description}</div>
        <div className="nft-card-id">Token ID: #{nft.tokenId}</div>

        <div className="nft-card-did" title={nft.didOwner}>
          Owner: {nft.didOwner || '—'}
        </div>

        <div
          className={`compliance-badge ${nft.isCompliant ? 'ok' : 'notok'}`}
        >
          {nft.isCompliant ? '✓ KYC/AML Verified' : '✕ Not KYC Verified'}
        </div>

        <div style={{ marginTop: '0.6rem', fontSize: '0.75rem', color: '#555' }}>
          Click to view details →
        </div>
      </div>
    </div>
  );
}
