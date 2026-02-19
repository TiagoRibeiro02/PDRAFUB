import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface NFTListing {
  tokenId: number;
  name: string;
  description: string;
  image: string;
  price: string;
  priceWei: bigint;
}

interface NFTMarketplaceProps {
  userDid: string;
  contractAddress: string;
  contractABI: any;
  onPurchaseSuccess?: () => void;
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

const buttonStyle: React.CSSProperties = {
  background: '#4CAF50',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  padding: '0.75rem 1rem',
  cursor: 'pointer',
  width: '100%',
  fontSize: '1rem',
  fontWeight: 'bold',
  marginTop: '0.5rem',
};

export default function NFTMarketplace({ userDid, contractAddress, contractABI, onPurchaseSuccess }: NFTMarketplaceProps) {
  const [listings, setListings] = useState<NFTListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [purchasing, setPurchasing] = useState<number | null>(null);

  useEffect(() => {
    loadMarketplace();
  }, [contractAddress, contractABI]);

  const loadMarketplace = async () => {
    if (!contractAddress || !contractABI) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
      const contract = new ethers.Contract(contractAddress, contractABI, provider);

      const [tokenIds, prices] = await contract.getAvailableNFTs();
      
      if (tokenIds.length === 0) {
        setListings([]);
        setLoading(false);
        return;
      }

      const listingData: NFTListing[] = [];
      for (let i = 0; i < tokenIds.length; i++) {
        const tokenId = tokenIds[i];
        const price = prices[i];
        
        try {
          const tokenURI = await contract.tokenURI(tokenId);
          
          let metadata;
          if (tokenURI.startsWith('data:application/json')) {
            const base64Data = tokenURI.split(',')[1];
            const jsonString = atob(base64Data);
            metadata = JSON.parse(jsonString);
          } else {
            const response = await fetch(tokenURI);
            metadata = await response.json();
          }

          listingData.push({
            tokenId: Number(tokenId),
            name: metadata.name || `NFT #${tokenId}`,
            description: metadata.description || '',
            image: metadata.image || '',
            price: ethers.formatEther(price),
            priceWei: price
          });
        } catch (err) {
          console.error(`Error loading listing #${tokenId}:`, err);
        }
      }

      setListings(listingData);
    } catch (err: any) {
      console.error('Error loading marketplace:', err);
      setError(err.message || 'Failed to load marketplace');
    } finally {
      setLoading(false);
    }
  };

  const purchaseNFT = async (tokenId: number, priceWei: bigint) => {
    if (!window.ethereum) {
      alert('Please install MetaMask to purchase NFTs!');
      return;
    }

    try {
      setPurchasing(tokenId);
      setError('');

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);

      console.log(`Purchasing NFT #${tokenId} for DID: ${userDid}`);
      
      const tx = await contract.purchaseNFT(tokenId, userDid, { value: priceWei });
      console.log('Transaction sent:', tx.hash);
      
      await tx.wait();
      console.log('Transaction confirmed!');
      
      alert(`Successfully purchased NFT #${tokenId}! It's now owned by your DID.`);
      
      // Reload marketplace and trigger success callback
      await loadMarketplace();
      if (onPurchaseSuccess) {
        onPurchaseSuccess();
      }
    } catch (err: any) {
      console.error('Purchase error:', err);
      const errorMessage = err.reason || err.message || 'Purchase failed';
      setError(errorMessage);
      alert(`Purchase failed: ${errorMessage}`);
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return <div style={{ color: '#888' }}>Loading marketplace...</div>;
  }

  if (error && listings.length === 0) {
    return <div style={{ color: '#ff6b6b' }}>Error: {error}</div>;
  }

  if (listings.length === 0) {
    return (
      <div style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>
        <p>No NFTs available for sale.</p>
        <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
          The bank has no NFTs in stock.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ marginBottom: '1rem' }}>NFT Marketplace ({listings.length} available)</h3>
      {error && (
        <div style={{ color: '#ff6b6b', marginBottom: '1rem', padding: '0.75rem', background: '#2a1a1a', borderRadius: '6px' }}>
          {error}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
        {listings.map((listing) => (
          <div key={listing.tokenId} style={cardStyle}>
            {listing.image && <img src={listing.image} alt={listing.name} style={imageStyle} />}
            <h4 style={{ margin: '0 0 0.5rem 0' }}>{listing.name}</h4>
            <p style={{ color: '#888', fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>
              {listing.description}
            </p>
            <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.5rem' }}>
              Token ID: #{listing.tokenId}
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#4CAF50', marginBottom: '0.5rem' }}>
              {listing.price} ETH
            </div>
            <button
              style={{
                ...buttonStyle,
                opacity: purchasing === listing.tokenId ? 0.6 : 1,
                cursor: purchasing === listing.tokenId ? 'not-allowed' : 'pointer'
              }}
              onClick={() => purchaseNFT(listing.tokenId, listing.priceWei)}
              disabled={purchasing === listing.tokenId}
            >
              {purchasing === listing.tokenId ? 'Purchasing...' : 'Buy Now'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
