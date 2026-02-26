import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

// Import KYC contract
let kycContractAddress: string | undefined;
let KYCComplianceABI: any;

try {
  const kycDeployment = await import('../contracts/kyc-deployment.json');
  const kycAbi = await import('../contracts/KYCCompliance.json');
  kycContractAddress = kycDeployment.KYCCompliance;
  KYCComplianceABI = kycAbi.abi;
} catch (error) {
  console.warn('KYC contract files not found. Compliance status will not be available.');
}

interface NFTData {
  tokenId: number;
  name: string;
  description: string;
  image: string;
  didOwner: string;
  ownerAddress?: string;
  nationality?: string;
  documentType?: string;
  documentNumber?: string;
  issuer?: string;
  isCompliant?: boolean;
  complianceTimestamp?: number;
  kycExpiryDate?: number;
}

interface NFTGalleryProps {
  userDid: string;
  contractAddress: string;
  contractABI: any;
  onNFTsLoaded?: (count: number) => void;
}

const cardStyle: React.CSSProperties = {
  background: '#1a1a1a',
  borderRadius: '12px',
  padding: 'clamp(1rem, 2vw, 1.5rem)',
  border: '1px solid rgba(202, 165, 97, 0.3)',
  transition: 'all 0.3s ease',
  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
};

const imageStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: '10px',
  marginBottom: '0.75rem',
  aspectRatio: '1',
  objectFit: 'cover',
};

export default function NFTGallery({ userDid, contractAddress, contractABI, onNFTsLoaded }: NFTGalleryProps) {
  const [nfts, setNfts] = useState<NFTData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedNFT, setSelectedNFT] = useState<NFTData | null>(null);

  useEffect(() => {
    loadUserNFTs();
  }, [userDid, contractAddress]);

  const loadUserNFTs = async () => {
    if (!contractAddress || !contractABI || !userDid) {
      if (onNFTsLoaded) onNFTsLoaded(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Connect to the contract (read-only)
      const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
      const contract = new ethers.Contract(contractAddress, contractABI, provider);

      // Get tokens owned by this DID
      const tokenIds = await contract.tokensOfDID(userDid);
      
      if (tokenIds.length === 0) {
        setNfts([]);
        if (onNFTsLoaded) onNFTsLoaded(0);
        setLoading(false);
        return;
      }

      // Load metadata for each token
      const nftData: NFTData[] = [];
      for (const tokenId of tokenIds) {
        try {
          const tokenURI = await contract.tokenURI(tokenId);
          const didOwner = await contract.getDidOwner(tokenId);
          const ownerAddress = await contract.ownerOf(tokenId);
          
          // Parse metadata (handle both IPFS and data URIs)
          let metadata;
          if (tokenURI.startsWith('data:application/json')) {
            const base64Data = tokenURI.split(',')[1];
            const jsonString = atob(base64Data);
            metadata = JSON.parse(jsonString);
          } else {
            // For IPFS or HTTP URLs
            const response = await fetch(tokenURI);
            metadata = await response.json();
          }

          // Parse attributes from metadata
          const attributes = metadata.attributes || [];
          const getAttribute = (traitType: string) => {
            const attr = attributes.find((a: any) => a.trait_type === traitType);
            return attr ? attr.value : undefined;
          };

          // Check KYC compliance if available
          let isCompliant = false;
          let complianceTimestamp = 0;
          let kycExpiryDate = 0;

          if (kycContractAddress && KYCComplianceABI && didOwner) {
            try {
              const kycContract = new ethers.Contract(kycContractAddress, KYCComplianceABI, provider);
              const [isComp, timestamp, expiryDate] = await kycContract.checkCompliance(didOwner);
              isCompliant = isComp;
              complianceTimestamp = Number(timestamp);
              kycExpiryDate = Number(expiryDate);
            } catch (err) {
              console.warn(`Could not check KYC for DID ${didOwner}:`, err);
            }
          }

          nftData.push({
            tokenId: Number(tokenId),
            name: metadata.name || `NFT #${tokenId}`,
            description: metadata.description || '',
            image: metadata.image || '',
            didOwner,
            ownerAddress,
            nationality: getAttribute('Nationality'),
            documentType: getAttribute('Document Type'),
            documentNumber: getAttribute('Document Number'),
            issuer: getAttribute('Issuer'),
            isCompliant: isCompliant,
            complianceTimestamp: complianceTimestamp > 0 ? complianceTimestamp : undefined,
            kycExpiryDate: kycExpiryDate > 0 ? kycExpiryDate : undefined,
          });
        } catch (err) {
          console.error(`Error loading NFT #${tokenId}:`, err);
        }
      }

      setNfts(nftData);
      if (onNFTsLoaded) onNFTsLoaded(nftData.length);
    } catch (err: any) {
      console.error('Error loading NFTs:', err);
      setError(err.message || 'Failed to load NFTs');
      if (onNFTsLoaded) onNFTsLoaded(0);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ color: '#888', fontSize: 'clamp(0.95rem, 1.5vw, 1.1rem)' }}>Loading your NFTs...</div>;
  }

  if (error) {
    return <div style={{ color: '#ff6b6b', fontSize: 'clamp(0.95rem, 1.5vw, 1.1rem)' }}>Error: {error}</div>;
  }

  if (nfts.length === 0) {
    return (
      <div style={{ 
        color: '#888', 
        textAlign: 'center', 
        padding: 'clamp(2rem, 4vw, 3rem)',
        fontSize: 'clamp(0.95rem, 1.5vw, 1.1rem)',
      }}>
        <p>You don't own any NFTs yet.</p>
      </div>
    );
  }

  return (
    <div>
      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          
          @media (max-width: 968px) {
            .nft-gallery-container {
              flex-direction: column !important;
            }
            .nft-grid-container {
              flex: 0 0 auto !important;
              max-height: 50vh !important;
            }
            .detail-panel-container {
              flex: 1 !important;
              border-top: 1px solid rgba(202, 165, 97, 0.3) !important;
              animation: slideInBottom 0.3s ease !important;
            }
          }
          
          @keyframes slideInBottom {
            from {
              transform: translateY(100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}
      </style>
      
      <h3 style={{ 
        marginBottom: 'clamp(1rem, 2vw, 1.5rem)',
        fontSize: 'clamp(1.2rem, 2.2vw, 1.6rem)',
      }}>Your Asset Collection ({nfts.length})</h3>
      
      <div className="nft-gallery-container" style={{ display: 'flex', gap: '1.5rem', overflow: 'hidden' }}>
        {/* NFT Grid Container */}
        <div className="nft-grid-container" style={{ 
          flex: selectedNFT ? '0 0 70%' : '1',
          transition: 'flex 0.3s ease',
          overflow: 'auto',
        }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', 
            gap: 'clamp(1rem, 2vw, 1.75rem)',
          }}>
            {nfts.map((nft) => (
              <div 
                key={nft.tokenId} 
                style={{
                  ...cardStyle, 
                  cursor: 'pointer',
                  border: selectedNFT?.tokenId === nft.tokenId 
                    ? '2px solid rgb(202, 165, 97)' 
                    : '1px solid rgba(202, 165, 97, 0.3)',
                }}
                onClick={() => setSelectedNFT(nft)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(202, 165, 97, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
                }}
              >
                {nft.image && <img src={nft.image} alt={nft.name} style={imageStyle} />}
                <h4 style={{ 
                  margin: '0 0 0.75rem 0',
                  fontSize: 'clamp(1rem, 1.8vw, 1.25rem)',
                }}>{nft.name}</h4>
                <p style={{ 
                  color: '#aaa', 
                  fontSize: 'clamp(0.85rem, 1.3vw, 0.95rem)', 
                  margin: '0 0 0.75rem 0',
                  lineHeight: '1.5',
                }}>
                  {nft.description}
                </p>
                <div style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.85rem)', color: '#666' }}>
                  <div style={{ marginBottom: '0.25rem' }}>Token ID: #{nft.tokenId}</div>
                  <div style={{ wordBreak: 'break-all', marginTop: '0.25rem', lineHeight: '1.4' }}>
                    Owner: {nft.didOwner}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail Panel */}
        {selectedNFT && (
          <div className="detail-panel-container" style={{
            background: '#1a1a1a',
            borderRadius: '16px',
            border: '1px solid rgba(202, 165, 97, 0.3)',
            overflow: 'hidden',
            animation: 'slideIn 0.3s ease',
            maxHeight: 'calc(100vh - 70px)',
          }}>
            <style>
              {`
                @keyframes slideIn {
                  from {
                    transform: translateX(100%);
                    opacity: 0;
                  }
                  to {
                    transform: translateX(0);
                    opacity: 1;
                  }
                }
              `}
            </style>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1.5rem',
              borderBottom: '2px solid rgba(202, 165, 97, 0.2)',
              position: 'sticky',
              top: 0,
              background: '#1a1a1a',
              zIndex: 1,
            }}>
              <h2 style={{ 
                margin: 0,
                fontSize: 'clamp(1.3rem, 2vw, 1.5rem)',
                color: 'rgb(202, 165, 97)',
              }}>
                NFT Details
              </h2>
              <button
                onClick={() => setSelectedNFT(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#999',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  lineHeight: 1,
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.color = 'rgb(202, 165, 97)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.color = '#999';
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ 
              overflowY: 'auto',
              maxHeight: 'calc(100vh - 170px)',
            }}>
              {selectedNFT.image && (
                <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                  <img 
                    src={selectedNFT.image} 
                    alt={selectedNFT.name}
                    style={{ 
                      maxWidth: '100%', 
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    }}
                  />
                </div>
              )}

              <div style={{ padding: '0 1.5rem 1.5rem 1.5rem' }}>
              <h3 style={{ 
                margin: '0 0 1rem 0',
                fontSize: 'clamp(1.2rem, 2vw, 1.4rem)',
                color: '#fff',
              }}>
                {selectedNFT.name}
              </h3>

              {/* Description Section */}
              {selectedNFT.description && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ 
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: 'rgb(202, 165, 97)',
                    marginBottom: '0.5rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    Description
                  </h4>
                  <p style={{ 
                    color: '#ccc',
                    lineHeight: '1.6',
                    margin: 0,
                    fontSize: '0.95rem',
                  }}>
                    {selectedNFT.description}
                  </p>
                </div>
              )}

              {/* Identity Information Section */}
              {(selectedNFT.nationality || selectedNFT.didOwner) && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ 
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: 'rgb(202, 165, 97)',
                    marginBottom: '0.8rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    Identity Information
                  </h4>
                  {selectedNFT.nationality && (
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ 
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: '#888',
                        marginBottom: '0.3rem',
                      }}>
                        Nationality
                      </div>
                      <div style={{ 
                        fontSize: '0.95rem',
                        color: '#fff',
                        background: '#0a0a0a',
                        padding: '0.5rem',
                        borderRadius: '4px',
                      }}>
                        {selectedNFT.nationality}
                      </div>
                    </div>
                  )}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ 
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#888',
                      marginBottom: '0.3rem',
                    }}>
                      Owner DID
                    </div>
                    <div style={{ 
                      fontSize: '0.85rem',
                      color: '#fff',
                      wordBreak: 'break-all',
                      fontFamily: 'monospace',
                      background: '#0a0a0a',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      lineHeight: '1.5',
                    }}>
                      {selectedNFT.didOwner}
                    </div>
                  </div>
                </div>
              )}

              {/* Document Information Section */}
              {(selectedNFT.documentType || selectedNFT.documentNumber || selectedNFT.issuer) && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ 
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: 'rgb(202, 165, 97)',
                    marginBottom: '0.8rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    Document Information
                  </h4>
                  {selectedNFT.documentType && (
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ 
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: '#888',
                        marginBottom: '0.3rem',
                      }}>
                        Document Type
                      </div>
                      <div style={{ 
                        fontSize: '0.95rem',
                        color: '#fff',
                        background: '#0a0a0a',
                        padding: '0.5rem',
                        borderRadius: '4px',
                      }}>
                        {selectedNFT.documentType}
                      </div>
                    </div>
                  )}
                  {selectedNFT.documentNumber && (
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ 
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: '#888',
                        marginBottom: '0.3rem',
                      }}>
                        Document Number
                      </div>
                      <div style={{ 
                        fontSize: '0.95rem',
                        color: '#fff',
                        fontFamily: 'monospace',
                        background: '#0a0a0a',
                        padding: '0.5rem',
                        borderRadius: '4px',
                      }}>
                        {selectedNFT.documentNumber}
                      </div>
                    </div>
                  )}
                  {selectedNFT.issuer && (
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ 
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: '#888',
                        marginBottom: '0.3rem',
                      }}>
                        Issuer
                      </div>
                      <div style={{ 
                        fontSize: '0.95rem',
                        color: '#fff',
                        background: '#0a0a0a',
                        padding: '0.5rem',
                        borderRadius: '4px',
                      }}>
                        {selectedNFT.issuer}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* NFT Details Section */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ 
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'rgb(202, 165, 97)',
                  marginBottom: '0.8rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  NFT Details
                </h4>
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ 
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#888',
                    marginBottom: '0.3rem',
                  }}>
                    Token ID
                  </div>
                  <div style={{ 
                    fontSize: '0.95rem',
                    color: '#fff',
                    fontFamily: 'monospace',
                    background: '#0a0a0a',
                    padding: '0.5rem',
                    borderRadius: '4px',
                  }}>
                    #{selectedNFT.tokenId}
                  </div>
                </div>
                {selectedNFT.ownerAddress && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ 
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#888',
                      marginBottom: '0.3rem',
                    }}>
                      Owner Address
                    </div>
                    <div style={{ 
                      fontSize: '0.85rem',
                      color: '#fff',
                      wordBreak: 'break-all',
                      fontFamily: 'monospace',
                      background: '#0a0a0a',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      lineHeight: '1.5',
                    }}>
                      {selectedNFT.ownerAddress}
                    </div>
                  </div>
                )}
                {selectedNFT.isCompliant !== undefined && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ 
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#888',
                      marginBottom: '0.3rem',
                    }}>
                      KYC/AML Compliance Status
                    </div>
                    <div style={{ 
                      fontSize: '0.95rem',
                      color: selectedNFT.isCompliant ? '#4CAF50' : '#ff6b6b',
                      background: '#0a0a0a',
                      padding: '0.5rem',
                      borderRadius: '4px',
                    }}>
                      {selectedNFT.isCompliant ? 'Verified and Compliant' : 'Not Verified'}
                    </div>
                  </div>
                )}
                {selectedNFT.complianceTimestamp && selectedNFT.complianceTimestamp > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ 
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#888',
                      marginBottom: '0.3rem',
                    }}>
                      KYC Date
                    </div>
                    <div style={{ 
                      fontSize: '0.95rem',
                      color: '#fff',
                      background: '#0a0a0a',
                      padding: '0.5rem',
                      borderRadius: '4px',
                    }}>
                      {new Date(selectedNFT.complianceTimestamp * 1000).toLocaleString()}
                    </div>
                  </div>
                )}
                {selectedNFT.kycExpiryDate && selectedNFT.kycExpiryDate > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ 
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#888',
                      marginBottom: '0.3rem',
                    }}>
                      KYC Expiry Date
                    </div>
                    <div style={{ 
                      fontSize: '0.95rem',
                      color: '#fff',
                      background: '#0a0a0a',
                      padding: '0.5rem',
                      borderRadius: '4px',
                    }}>
                      {new Date(selectedNFT.kycExpiryDate * 1000).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>

              {/* Ownership Badge */}
              <div style={{
                background: 'rgba(76, 175, 80, 0.15)',
                border: '1px solid #4CAF50',
                borderRadius: '8px',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}>
                <div style={{ fontSize: '1.5rem' }}>✓</div>
                <div>
                  <div style={{ 
                    fontSize: '0.95rem',
                    fontWeight: 'bold',
                    color: '#4CAF50',
                    marginBottom: '0.15rem',
                  }}>
                    You Own This NFT
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#aaa' }}>
                    This asset is securely stored in your wallet
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
