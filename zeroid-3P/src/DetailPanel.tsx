import React from 'react';
import { NFTData } from './types';

interface DetailPanelProps {
  nft: NFTData;
  onClose: () => void;
}

const DetailPanel: React.FC<DetailPanelProps> = ({ nft, onClose }) => {
  const imageUrl = nft.metadata?.image || '';
  const complianceTimestamp = nft.metadata?.complianceTimestamp as number | undefined;
  
  return (
    <div className="detail-panel">
      <div className="detail-panel-header">
        <h2 className="detail-panel-title">NFT Details</h2>
        <button className="close-button" onClick={onClose}>x</button>
      </div>

      {imageUrl && (
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <img 
            src={imageUrl} 
            alt={nft.name}
            style={{ 
              maxWidth: '100%', 
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
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
      </div>

      <div className="detail-section">
        <h3>Document Information</h3>
        <div className="detail-field">
          <div className="detail-label">Document Type</div>
          <div className="detail-value">{nft.documentType}</div>
        </div>
        <div className="detail-field">
          <div className="detail-label">Document Number</div>
          <div className="detail-value">{nft.documentNumber}</div>
        </div>
        <div className="detail-field">
          <div className="detail-label">Issuer</div>
          <div className="detail-value">{nft.issuer}</div>
        </div>
      </div>

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
          <div className="detail-value">
            {nft.isActive ? 'Verified and Compliant' : 'Not Verified'}
          </div>
        </div>
        {complianceTimestamp && complianceTimestamp > 0 && (
          <div className="detail-field">
            <div className="detail-label">Compliance Verified On</div>
            <div className="detail-value">
              {new Date(complianceTimestamp * 1000).toLocaleString()}
            </div>
          </div>
        )}
      </div>

      <div className="detail-section">
        <h3>Dates</h3>
        <div className="detail-field">
          <div className="detail-label">Date Issued</div>
          <div className="detail-value">
            {new Date(nft.dateIssued).toLocaleString()}
          </div>
        </div>
        <div className="detail-field">
          <div className="detail-label">Expiration Date</div>
          <div className="detail-value">
            {new Date(nft.expirationDate).toLocaleString()}
          </div>
        </div>
      </div>

      {nft.metadata?.description && (
        <div className="detail-section">
          <h3>Description</h3>
          <div className="detail-field">
            <div className="detail-value">{nft.metadata.description}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailPanel;
