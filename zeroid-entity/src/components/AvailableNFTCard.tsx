import type { NFTListing } from '../BankNFTManager';

interface AvailableNFTCardProps {
  nft: NFTListing;
  loading: boolean;
  ethEurRate: number | null;
  onPurchase: (tokenId: number, priceWei: bigint) => void;
  onViewDetails: (nft: NFTListing) => void;
}

export default function AvailableNFTCard({ nft, loading, ethEurRate, onPurchase, onViewDetails }: AvailableNFTCardProps) {
  const eurPrice = ethEurRate !== null
    ? (parseFloat(nft.price) * ethEurRate).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : null;

  return (
    <div className="cardStyle" onClick={() => onViewDetails(nft)} title="Click to view details" style={{ cursor: 'pointer' }}>
      {nft.image && <img src={nft.image} alt={nft.name} className="imageStyle" />}
      <h4 className='nftName'>{nft.name}</h4>
      <p className='nftDescription'>{nft.description}</p>
      <div className='nftTokenId'>Token ID: #{nft.tokenId}</div>
      <div className='nftPrice'>
        {nft.price} ETH
        {eurPrice !== null && (
          <span className='ethPrice'>
            ≈ {eurPrice} €
          </span>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onPurchase(nft.tokenId, nft.priceWei);
        }}
        disabled={loading}
        className="ui-btn ui-btn-gold purchase"
      >
        Purchase for User
      </button>
    </div>
  );
}
