import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface NFTData {
  tokenId: number;
  name: string;
  description: string;
  image: string;
  didOwner: string;
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

          nftData.push({
            tokenId: Number(tokenId),
            name: metadata.name || `NFT #${tokenId}`,
            description: metadata.description || '',
            image: metadata.image || '',
            didOwner
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
      <h3 style={{ 
        marginBottom: 'clamp(1rem, 2vw, 1.5rem)',
        fontSize: 'clamp(1.2rem, 2.2vw, 1.6rem)',
      }}>Your Asset Collection ({nfts.length})</h3>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', 
        gap: 'clamp(1rem, 2vw, 1.75rem)',
      }}>
        {nfts.map((nft) => (
          <div 
            key={nft.tokenId} 
            style={cardStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.border = '1px solid rgba(202, 165, 97, 1)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(202, 165, 97, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.border = '1px solid rgba(202, 165, 97, 0.3)';
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
  );
}
