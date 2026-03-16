import type { NFTItem } from '../IssuerNFTManager';

interface Props {
  nft: NFTItem;
  ethEurRate: number | null;
}

export default function AvailableNFTCard({ nft, ethEurRate }: Props) {
  const eurPrice = ethEurRate !== null
    ? (parseFloat(nft.price) * ethEurRate).toLocaleString('pt-PT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : null;

  return (
    <div className="nft-card" style={{ cursor: 'default' }}>
      {nft.image
        ? <img src={nft.image} alt={nft.name} className="nft-card-img" />
        : <div className="nft-card-img-placeholder">💎</div>
      }

      <div className="nft-card-body">
        <div className="nft-card-name">{nft.name}</div>
        <div className="nft-card-desc">{nft.description}</div>
        <div className="nft-card-id">Token ID: #{nft.tokenId}</div>

        <div className="nft-card-price">
          {nft.price} ETH
          {eurPrice && (
            <span style={{ color: '#888', fontSize: '0.8rem', fontWeight: 'normal', marginLeft: '0.4rem' }}>
              ≈ {eurPrice} €
            </span>
          )}
        </div>

        {(nft.issuerName || nft.issuer) && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#666' }}>
            Issuer: {nft.issuerName || nft.issuer}
          </div>
        )}
      </div>
    </div>
  );
}
