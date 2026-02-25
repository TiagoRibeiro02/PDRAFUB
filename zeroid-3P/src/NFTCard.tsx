import React from 'react';
import { NFTData } from './types';

interface NFTCardProps {
  nft: NFTData;
  isSelected: boolean;
  onClick: () => void;
}

const NFTCard: React.FC<NFTCardProps> = ({ nft, isSelected, onClick }) => {
  const imageUrl = nft.metadata?.image || '';
  
  return (
    <div 
      className={`nft-card ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="nft-card-image">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={nft.name} 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover' 
            }} 
          />
        ) : (
          <div style={{ 
            width: '100%', 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: '4rem'
          }}>
            🪪
          </div>
        )}
      </div>
      <div className="nft-card-content">
        <div className="nft-card-title">{nft.name}</div>
        <div className="nft-card-did">DID: {nft.did.substring(0, 30)}...</div>
        <div className="nft-card-did">Token ID: {nft.tokenId}</div>
        <div className="nft-card-date">
          Issued: {new Date(nft.dateIssued).toLocaleDateString()}
        </div>
        <div className="nft-card-date">
          Status: {nft.isActive ? '✅ Active' : '⚠️ Not Verified'}
        </div>
      </div>
    </div>
  );
};

export default NFTCard;
