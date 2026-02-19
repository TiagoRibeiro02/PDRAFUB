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
}

const cardStyle: React.CSSProperties = {
  background: '#1a1a1a',
  borderRadius: '12px',
  padding: '1rem',
  marginBottom: '1rem',
  border: '1px solid #333',
};

const imageStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: '8px',
  marginBottom: '0.5rem',
};

export default function NFTGallery({ userDid, contractAddress, contractABI }: NFTGalleryProps) {
  const [nfts, setNfts] = useState<NFTData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUserNFTs();
  }, [userDid, contractAddress]);

  const loadUserNFTs = async () => {
    if (!contractAddress || !contractABI || !userDid) {
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
    } catch (err: any) {
      console.error('Error loading NFTs:', err);
      setError(err.message || 'Failed to load NFTs');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ color: '#888' }}>Loading your NFTs...</div>;
  }

  if (error) {
    return <div style={{ color: '#ff6b6b' }}>Error: {error}</div>;
  }

  if (nfts.length === 0) {
    return (
      <div style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>
        <p>You don't own any NFTs yet.</p>
        <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
          Visit the marketplace to purchase NFTs!
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ marginBottom: '1rem' }}>Your NFT Collection ({nfts.length})</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
        {nfts.map((nft) => (
          <div key={nft.tokenId} style={cardStyle}>
            {nft.image && <img src={nft.image} alt={nft.name} style={imageStyle} />}
            <h4 style={{ margin: '0 0 0.5rem 0' }}>{nft.name}</h4>
            <p style={{ color: '#888', fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>
              {nft.description}
            </p>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>
              <div>Token ID: #{nft.tokenId}</div>
              <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>
                Owner: {nft.didOwner}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
