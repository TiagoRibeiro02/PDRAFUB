import type { NFTListing } from '../BankNFTManager';

interface PurchasedNFTCardProps {
  nft: NFTListing;
}

export default function PurchasedNFTCard({ nft }: PurchasedNFTCardProps) {
  return (
    <div className="cardStyle">
      {nft.image && <img src={nft.image} alt={nft.name} className="imageStyle" />}
      <h4 className='nftName'>{nft.name}</h4>
      <p className='nftDescription'>{nft.description}</p>
      <div className='nftTokenId'>Token ID: #{nft.tokenId}</div>
      <div className='nftOwnedDiv'>
        <div className='nftOwnedBy'>OWNED BY:</div>
        <div className='nftdidOwner'>{nft.didOwner}</div>
      </div>

      {/* KYC Compliance Badge */}
      <div className={`complianceBadge ${nft.isCompliant ? 'compliant' : 'notCompliant'}`}>
        <div className='complianceBadgeInner'>
          <div className={`complianceBadgeTitle ${nft.isCompliant ? 'compliant' : 'notCompliant'}`}>
            {nft.isCompliant ? 'KYC/AML Compliant' : 'Not Verified'}
          </div>
          {nft.isCompliant && nft.complianceTimestamp && (
            <div className='verificationsubmittedtext'>
              Verified: {new Date(nft.complianceTimestamp * 1000).toLocaleDateString()}
            </div>
          )}
          {!nft.isCompliant && (
            <div className='verificationsubmittedtext'>
              Compliance proof not submitted
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
