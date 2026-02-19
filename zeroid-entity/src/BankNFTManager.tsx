import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface NFTListing {
  tokenId: number;
  name: string;
  description: string;
  image: string;
  price: string;
  priceWei: bigint;
  didOwner: string;
}

interface BankNFTManagerProps {
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

export default function BankNFTManager({ contractAddress, contractABI }: BankNFTManagerProps) {
  const [available, setAvailable] = useState<NFTListing[]>([]);
  const [purchased, setPurchased] = useState<NFTListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [account, setAccount] = useState('');
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    checkWallet();
  }, []);

  useEffect(() => {
    if (account) {
      loadNFTs();
    }
  }, [account, contractAddress, contractABI]);

  const checkWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      setError('Please install MetaMask');
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        setAccount(accounts[0]);
      }
    } catch (err) {
      console.error('Error checking wallet:', err);
    }
  };

  const connectWallet = async () => {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
    } catch (err: any) {
      setError('Failed to connect wallet: ' + err.message);
    }
  };

  const loadNFTs = async () => {
    if (!contractAddress || !contractABI) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, contractABI, provider);

      // Check if connected account is owner
      const owner = await contract.owner();
      setIsOwner(owner.toLowerCase() === account.toLowerCase());

      // Get available NFTs (for sale)
      const [availableIds, prices] = await contract.getAvailableNFTs();

      const availableData: NFTListing[] = [];
      for (let i = 0; i < availableIds.length; i++) {
        const tokenId = availableIds[i];
        const price = prices[i];
        
        try {
          const tokenURI = await contract.tokenURI(tokenId);
          const didOwner = await contract.getDidOwner(tokenId);
          
          let metadata;
          if (tokenURI.startsWith('data:application/json')) {
            const base64Data = tokenURI.split(',')[1];
            const jsonString = atob(base64Data);
            metadata = JSON.parse(jsonString);
          } else {
            const response = await fetch(tokenURI);
            metadata = await response.json();
          }

          availableData.push({
            tokenId: Number(tokenId),
            name: metadata.name || `NFT #${tokenId}`,
            description: metadata.description || '',
            image: metadata.image || '',
            price: ethers.formatEther(price),
            priceWei: price,
            didOwner
          });
        } catch (err) {
          console.error(`Error loading NFT #${tokenId}:`, err);
        }
      }

      setAvailable(availableData);

      // Get all NFTs and filter purchased ones (have DID)
      const totalSupply = await contract.totalSupply();
      const purchasedData: NFTListing[] = [];

      for (let i = 0; i < totalSupply; i++) {
        try {
          const didOwner = await contract.getDidOwner(i);
          
          // Only include if it has a DID owner
          if (didOwner && didOwner !== '') {
            const tokenURI = await contract.tokenURI(i);
            const price = await contract.getPrice(i);
            
            let metadata;
            if (tokenURI.startsWith('data:application/json')) {
              const base64Data = tokenURI.split(',')[1];
              const jsonString = atob(base64Data);
              metadata = JSON.parse(jsonString);
            } else {
              const response = await fetch(tokenURI);
              metadata = await response.json();
            }

            purchasedData.push({
              tokenId: i,
              name: metadata.name || `NFT #${i}`,
              description: metadata.description || '',
              image: metadata.image || '',
              price: ethers.formatEther(price),
              priceWei: price,
              didOwner
            });
          }
        } catch (err) {
          console.error(`Error loading NFT #${i}:`, err);
        }
      }

      setPurchased(purchasedData);
    } catch (err: any) {
      console.error('Error loading NFTs:', err);
      setError(err.message || 'Failed to load NFTs');
    } finally {
      setLoading(false);
    }
  };

  const purchaseForUser = async (tokenId: number, priceWei: bigint) => {
    const userDID = prompt(
      `Enter the user's DID to purchase NFT #${tokenId}:\n\n` +
      `Example: did:zeroid:12345678-1234-1234-1234-123456789abc`
    );

    if (!userDID || !userDID.trim()) {
      alert('Purchase cancelled - no DID provided');
      return;
    }

    if (!userDID.startsWith('did:')) {
      alert('Invalid DID format. Must start with "did:"');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);

      // Get the Ethereum address linked to this DID
      console.log('Looking up Ethereum address for DID...');
      const userEthAddress = await contract.getAddressForDID(userDID);
      
      if (userEthAddress === ethers.ZeroAddress) {
        alert(
          `This DID is not linked to an Ethereum address yet.\n\n` +
          `Please ask the user to:\n` +
          `1. Open their ZeroID Wallet\n` +
          `2. Go to Identity tab\n` +
          `3. Click "Link DID to Blockchain"\n\n` +
          `Then try purchasing again.`
        );
        setLoading(false);
        return;
      }

      console.log(`DID is linked to: ${userEthAddress}`);

      const confirm = window.confirm(
        `Confirm purchase:\n\n` +
        `NFT: #${tokenId}\n` +
        `For User DID: ${userDID}\n` +
        `To Address: ${userEthAddress}\n` +
        `Price: ${ethers.formatEther(priceWei)} ETH\n\n` +
        `The bank will purchase and transfer this NFT to the user's wallet.`
      );

      if (!confirm) {
        setLoading(false);
        return;
      }

      console.log(`Purchasing NFT #${tokenId} for DID: ${userDID}`);
      const purchaseTx = await contract.purchaseNFT(tokenId, userDID, { value: priceWei });
      console.log('Purchase transaction sent:', purchaseTx.hash);
      await purchaseTx.wait();
      console.log('Purchase confirmed!');
      
      console.log(`Transferring NFT to user's wallet...`);
      const bankAddress = await signer.getAddress();
      const transferTx = await contract.transferFrom(bankAddress, userEthAddress, tokenId);
      console.log('Transfer transaction sent:', transferTx.hash);
      await transferTx.wait();
      console.log('Transfer confirmed!');
      
      alert(
        `✓ Purchase and transfer successful!\n\n` +
        `NFT #${tokenId} has been:\n` +
        `1. Assigned to DID: ${userDID}\n` +
        `2. Transferred to: ${userEthAddress}\n\n` +
        `The user now has full custody of the NFT!`
      );
      
      // Reload NFTs
      await loadNFTs();
    } catch (err: any) {
      console.error('Purchase/transfer error:', err);
      const errorMessage = err.reason || err.message || 'Operation failed';
      setError(errorMessage);
      alert(`Operation failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const setPrice = async (tokenId: number) => {
    const priceInEth = prompt(`Enter new price in ETH for NFT #${tokenId}:\n(Enter 0 to remove from sale)`);
    if (priceInEth === null) return;

    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);

      const tx = await contract.setPrice(tokenId, ethers.parseEther(priceInEth));
      await tx.wait();

      alert(`Price updated for NFT #${tokenId}!`);
      await loadNFTs();
    } catch (err: any) {
      alert(`Failed to set price: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>🏦 Bank NFT Management</h2>
        <p style={{ color: '#888', marginBottom: '2rem' }}>Connect your bank wallet to manage NFTs</p>
        <button onClick={connectWallet} style={buttonStyle}>
          Connect MetaMask
        </button>
      </div>
    );
  }

  if (!isOwner && account) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p style={{ color: '#ff6b6b' }}>
          You are not the bank owner. Only the contract owner can manage NFTs.
        </p>
        <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '1rem' }}>
          Connected: {account.slice(0, 6)}...{account.slice(-4)}
        </p>
      </div>
    );
  }

  if (loading && available.length === 0 && purchased.length === 0) {
    return <div style={{ padding: '2rem', color: '#888' }}>Loading NFT inventory...</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0 }}>🏦 Bank NFT Management</h1>
          <p style={{ color: '#888', margin: '0.5rem 0' }}>
            Connected: {account.slice(0, 6)}...{account.slice(-4)}
          </p>
        </div>
        <button onClick={loadNFTs} style={{ ...buttonStyle, width: 'auto', padding: '0.5rem 1rem' }}>
          Refresh
        </button>
      </div>

      {error && (
        <div style={{ 
          color: '#ff6b6b', 
          marginBottom: '1rem', 
          padding: '1rem', 
          background: '#2a1a1a', 
          borderRadius: '6px' 
        }}>
          {error}
        </div>
      )}

      <div style={{
        background: '#e3f2fd',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '2rem',
        color: '#1565c0'
      }}>
        <h3 style={{ margin: '0 0 0.5rem 0' }}>Inventory Summary</h3>
        <p style={{ margin: 0 }}>
          Available for purchase: {available.length} | Already purchased: {purchased.length}
        </p>
      </div>

      {/* Available NFTs */}
      <section style={{ marginBottom: '3rem' }}>
        <h2>📢 Available NFTs ({available.length})</h2>
        <p style={{ color: '#888', marginBottom: '1rem' }}>
          Purchase these NFTs for users by entering their DID. The bank pays with MetaMask.
        </p>
        {available.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#888', background: '#1a1a1a', borderRadius: '8px' }}>
            No NFTs available. Set prices on NFTs to make them available.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {available.map(nft => (
              <div key={nft.tokenId} style={{ ...cardStyle, border: '2px solid #4CAF50' }}>
                {nft.image && <img src={nft.image} alt={nft.name} style={imageStyle} />}
                <h4 style={{ margin: '0 0 0.5rem 0' }}>{nft.name}</h4>
                <p style={{ color: '#888', fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>
                  {nft.description}
                </p>
                <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.5rem' }}>
                  Token ID: #{nft.tokenId}
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#4CAF50', marginBottom: '0.5rem' }}>
                  {nft.price} ETH
                </div>
                <button
                  onClick={() => purchaseForUser(nft.tokenId, nft.priceWei)}
                  disabled={loading}
                  style={{
                    ...buttonStyle,
                    opacity: loading ? 0.6 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  Purchase for User
                </button>
                <button
                  onClick={() => setPrice(nft.tokenId)}
                  style={{
                    ...buttonStyle,
                    background: '#333',
                    marginTop: '0.5rem'
                  }}
                >
                  Update Price
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Purchased NFTs */}
      <section>
        <h2>✅ Purchased NFTs ({purchased.length})</h2>
        <p style={{ color: '#888', marginBottom: '1rem' }}>
          NFTs that have been purchased and assigned to user DIDs.
        </p>
        {purchased.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#888', background: '#1a1a1a', borderRadius: '8px' }}>
            No NFTs have been purchased yet.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {purchased.map(nft => (
              <div key={nft.tokenId} style={{ ...cardStyle, border: '1px solid #666' }}>
                {nft.image && <img src={nft.image} alt={nft.name} style={imageStyle} />}
                <h4 style={{ margin: '0 0 0.5rem 0' }}>{nft.name}</h4>
                <p style={{ color: '#888', fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>
                  {nft.description}
                </p>
                <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.5rem' }}>
                  Token ID: #{nft.tokenId}
                </div>
                <div style={{
                  background: '#4CAF5020',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  marginTop: '0.5rem'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#4CAF50', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                    OWNED BY:
                  </div>
                  <div style={{ 
                    fontSize: '0.7rem', 
                    color: '#4CAF50', 
                    wordBreak: 'break-all',
                    fontFamily: 'monospace'
                  }}>
                    {nft.didOwner}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

declare global {
  interface Window {
    ethereum?: any;
  }
}
