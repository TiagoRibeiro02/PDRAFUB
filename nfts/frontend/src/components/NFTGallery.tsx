import React from 'react'

interface NFTData {
  tokenId: number
  name: string
  description: string
  image: string
  owner: string
}

interface NFTGalleryProps {
  nfts: NFTData[]
}

const NFTGallery: React.FC<NFTGalleryProps> = ({ nfts }) => {
  if (nfts.length === 0) {
    return (
      <div className="empty-state">
        <h2>No NFTs Found</h2>
        <p>You don't own any NFTs from this collection yet.</p>
        <p>Run <code>npm run mint</code> to mint some NFTs to your address.</p>
      </div>
    )
  }

  return (
    <div className="nft-grid">
      {nfts.map((nft) => (
        <div key={nft.tokenId} className="nft-card">
          <img 
            src={nft.image} 
            alt={nft.name}
            className="nft-image"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/cccccc/666666?text=NFT'
            }}
          />
          <div className="nft-details">
            <h3 className="nft-name">{nft.name}</h3>
            {nft.description && (
              <p className="nft-description">{nft.description}</p>
            )}
            <div className="nft-token-id">Token ID: #{nft.tokenId}</div>
            <div className="nft-owner">Owner: {nft.owner.slice(0, 6)}...{nft.owner.slice(-4)}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default NFTGallery
