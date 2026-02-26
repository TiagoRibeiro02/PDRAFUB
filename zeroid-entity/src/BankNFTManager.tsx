import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { QRCodeSVG } from 'qrcode.react';

// Import KYC contract
let kycContractAddress: string | undefined;
let KYCComplianceABI: any;

try {
  const kycDeployment = await import('./contracts/kyc-deployment.json');
  const kycAbi = await import('./contracts/KYCCompliance.json');
  kycContractAddress = kycDeployment.KYCCompliance;
  KYCComplianceABI = kycAbi.abi;
} catch (error) {
  console.warn('KYC contract files not found.');
}

interface NFTListing {
  tokenId: number;
  name: string;
  description: string;
  image: string;
  price: string;
  priceWei: bigint;
  didOwner: string;
  isCompliant?: boolean;
  complianceTimestamp?: number;
  complianceCommitment?: string;
}

interface BankNFTManagerProps {
  contractAddress: string;
  contractABI: any;
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

const buttonStyle: React.CSSProperties = {
  background: 'rgb(202, 165, 97)',
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
  const [complianceStatuses, setComplianceStatuses] = useState<{[did: string]: {isCompliant: boolean, timestamp: number, commitment: string}}>();
  const [showQRRequest, setShowQRRequest] = useState(false);
  const [qrSessionId, setQrSessionId] = useState<string>("");
  const [purchasingTokenId, setPurchasingTokenId] = useState<number | null>(null);
  const [purchasingPrice, setPurchasingPrice] = useState<bigint | null>(null);
  const [manualDID, setManualDID] = useState('');
  const [manualEthAddress, setManualEthAddress] = useState('');

  useEffect(() => {
    checkWallet();
  }, []);

  useEffect(() => {
    if (account) {
      loadNFTs();
    }
  }, [account, contractAddress, contractABI]);

  // Poll relay server for QR code response
  useEffect(() => {
    if (!qrSessionId || purchasingTokenId === null || purchasingPrice === null) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:8000/qr-relay.php?sessionId=${qrSessionId}`);
        const result = await response.json();
        
        if (result.success && result.data) {
          const userDID = result.data.did;
          const userEthAddress = result.data.ethAddress;
          
          // Close QR modal
          setShowQRRequest(false);
          setQrSessionId("");
          
          // Proceed with purchase automatically
          await executePurchase(purchasingTokenId, purchasingPrice, userDID, userEthAddress);
          
          // Reset purchasing state
          setPurchasingTokenId(null);
          setPurchasingPrice(null);
        }
      } catch (err) {
        console.error('Error polling for response:', err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [qrSessionId, purchasingTokenId, purchasingPrice]);

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

  const checkComplianceForDIDs = async (dids: string[], nfts: NFTListing[]) => {
    if (!kycContractAddress || !KYCComplianceABI) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const kycContract = new ethers.Contract(
        kycContractAddress,
        KYCComplianceABI,
        provider
      );

      const complianceMap: {[did: string]: {isCompliant: boolean, timestamp: number, commitment: string}} = {};

      for (const did of dids) {
        try {
          const [isCompliant, timestamp, commitment] = await kycContract.checkCompliance(did);
          complianceMap[did] = {
            isCompliant,
            timestamp: Number(timestamp),
            commitment
          };
        } catch (err) {
          console.error(`Error checking compliance for ${did}:`, err);
          complianceMap[did] = { isCompliant: false, timestamp: 0, commitment: '' };
        }
      }

      setComplianceStatuses(complianceMap);

      // Update NFT entries with compliance info
      nfts.forEach(nft => {
        const compliance = complianceMap[nft.didOwner];
        if (compliance) {
          nft.isCompliant = compliance.isCompliant;
          nft.complianceTimestamp = compliance.timestamp;
          nft.complianceCommitment = compliance.commitment;
        }
      });
    } catch (err) {
      console.error('Error checking compliance:', err);
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
      const didsToCheck: string[] = [];

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
            
            didsToCheck.push(didOwner);
          }
        } catch (err) {
          console.error(`Error loading NFT #${i}:`, err);
        }
      }

      // Check KYC compliance for all DIDs
      if (kycContractAddress && KYCComplianceABI && didsToCheck.length > 0) {
        await checkComplianceForDIDs(didsToCheck, purchasedData);
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
    // Open QR code modal
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setPurchasingTokenId(tokenId);
    setPurchasingPrice(priceWei);
    setQrSessionId(sessionId);
    setManualDID('');
    setManualEthAddress('');
    setShowQRRequest(true);
  };

  const handleManualSubmit = async () => {
    if (!manualDID.trim()) {
      alert('Please enter a DID');
      return;
    }
    
    if (!manualDID.startsWith('did:')) {
      alert('Invalid DID format. Must start with "did:"');
      return;
    }

    if (manualDID.trim() && !manualEthAddress.trim()) {
      alert('Please enter an Ethereum address');
      return;
    }

    if (!manualEthAddress.startsWith('0x') || manualEthAddress.length !== 42) {
      alert('Invalid Ethereum address format. Must be 42 characters starting with 0x');
      return;
    }

    if (purchasingTokenId !== null && purchasingPrice !== null) {
      setShowQRRequest(false);
      await executePurchase(purchasingTokenId, purchasingPrice, manualDID, manualEthAddress);
      setPurchasingTokenId(null);
      setPurchasingPrice(null);
      setManualDID('');
      setManualEthAddress('');
    }
  };

  const executePurchase = async (tokenId: number, priceWei: bigint, userDID: string, userEthAddress: string) => {
    if (!userDID || !userDID.trim()) {
      alert('Purchase cancelled - no DID provided');
      return;
    }

    if (!userDID.startsWith('did:')) {
      alert('Invalid DID format. Must start with "did:"');
      return;
    }

    if (!userEthAddress || !userEthAddress.startsWith('0x') || userEthAddress.length !== 42) {
      alert('Invalid Ethereum address received from wallet');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);

      // Check if DID is already linked to an address
      console.log('Looking up Ethereum address for DID...');
      let linkedAddress = await contract.getAddressForDID(userDID);
      
      // If not linked, link it (bank pays gas)
      if (linkedAddress === ethers.ZeroAddress) {
        console.log(`Linking DID to address (bank pays gas)...`);
        const linkTx = await contract.linkDIDToAddress(userDID, userEthAddress);
        console.log('Link transaction sent:', linkTx.hash);
        await linkTx.wait();
        console.log('DID linked successfully - bank paid gas fee');
        linkedAddress = userEthAddress;
      } else {
        console.log(`DID already linked to: ${linkedAddress}`);
        // Verify linked address matches the one from wallet
        if (linkedAddress.toLowerCase() !== userEthAddress.toLowerCase()) {
          alert(
            `Warning: DID is linked to a different address!\n\n` +
            `DID: ${userDID}\n` +
            `Linked to: ${linkedAddress}\n` +
            `Wallet sent: ${userEthAddress}\n\n` +
            `Using the blockchain-linked address.`
          );
          userEthAddress = linkedAddress;
        }
      }

      const confirm = window.confirm(
        `Confirm purchase:\n\n` +
        `NFT: #${tokenId}\n` +
        `For User DID: ${userDID}\n` +
        `To Address: ${userEthAddress}\n` +
        `Price: ${ethers.formatEther(priceWei)} ETH\n` +
        `Gas fees: Paid by bank\n\n` +
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
        `Purchase and transfer successful!\n\n` +
        `NFT #${tokenId} has been:\n` +
        `1. Assigned to DID: ${userDID}\n` +
        `2. Transferred to: ${userEthAddress}\n\n` +
        `The user now has full custody of the NFT!\n` +
        `All gas fees were paid by the bank.`
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
      <div style={{ 
        padding: 'clamp(1.5rem, 3vw, 2rem)', 
        textAlign: 'center',
        maxWidth: '600px',
        margin: '2rem auto',
      }}>
        <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginBottom: 'clamp(0.75rem, 1.5vw, 1rem)' }}>Bank NFT Management</h2>
        <p style={{ color: '#888', marginBottom: 'clamp(1.5rem, 3vw, 2rem)', fontSize: 'clamp(0.9rem, 1.5vw, 1rem)' }}>Connect your bank wallet to manage NFTs</p>
        <button 
          onClick={connectWallet} 
          style={{
            ...buttonStyle,
            fontSize: 'clamp(0.95rem, 1.5vw, 1.1rem)',
            padding: 'clamp(0.75rem, 1.5vw, 1rem) clamp(1.5rem, 3vw, 2rem)',
          }}
          onMouseEnter={(e) => {(e.target as HTMLButtonElement).style.background = 'rgb(180, 145, 77)'}}
          onMouseLeave={(e) => {(e.target as HTMLButtonElement).style.background = 'rgb(202, 165, 97)'}}
        >
          Connect MetaMask
        </button>
      </div>
    );
  }

  if (!isOwner && account) {
    return (
      <div style={{ 
        padding: 'clamp(1.5rem, 3vw, 2rem)', 
        textAlign: 'center',
        maxWidth: '600px',
        margin: '2rem auto',
      }}>
        <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginBottom: 'clamp(0.75rem, 1.5vw, 1rem)' }}>Access Denied</h2>
        <p style={{ color: '#ff6b6b', fontSize: 'clamp(0.9rem, 1.5vw, 1rem)', marginBottom: 'clamp(0.75rem, 1.5vw, 1rem)' }}>
          You are not the bank owner. Only the contract owner can manage NFTs.
        </p>
        <p style={{ color: '#888', fontSize: 'clamp(0.8rem, 1.3vw, 0.9rem)', marginTop: 'clamp(0.75rem, 1.5vw, 1rem)' }}>
          Connected: {account.slice(0, 6)}...{account.slice(-4)}
        </p>
      </div>
    );
  }

  if (loading && available.length === 0 && purchased.length === 0) {
    return <div style={{ 
      padding: 'clamp(1.5rem, 3vw, 2rem)', 
      color: '#888',
      fontSize: 'clamp(0.9rem, 1.5vw, 1rem)',
      textAlign: 'center',
    }}>Loading NFT inventory...</div>;
  }

  return (
    <div style={{ 
      padding: 'clamp(1rem, 2.5vw, 3rem)', 
      width: '100%',
      boxSizing: 'border-box',
      minHeight: '100vh',
    }}>
      <div style={{ 
        marginBottom: 'clamp(1.5rem, 3vw, 2rem)', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.5rem, 3vw, 2.5rem)' }}>Bank NFT Management</h1>
        </div>
        <button 
          onClick={loadNFTs} 
          style={{ ...buttonStyle, width: 'auto', padding: 'clamp(0.5rem, 1.5vw, 0.75rem) clamp(1rem, 2vw, 1.5rem)', fontSize: 'clamp(0.9rem, 1.5vw, 1rem)' }}
          onMouseEnter={(e) => {(e.target as HTMLButtonElement).style.background = 'rgb(180, 145, 77)'}}
          onMouseLeave={(e) => {(e.target as HTMLButtonElement).style.background = 'rgb(202, 165, 97)'}}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div style={{ 
          color: '#ff6b6b', 
          marginBottom: 'clamp(1rem, 2vw, 1.5rem)', 
          padding: 'clamp(0.75rem, 2vw, 1rem)', 
          background: '#2a1a1a', 
          borderRadius: '8px',
          fontSize: 'clamp(0.85rem, 1.3vw, 0.95rem)',
        }}>
          {error}
        </div>
      )}

      <div style={{
        background: '#fef3cd',
        padding: 'clamp(0.75rem, 2vw, 1.25rem)',
        borderRadius: '10px',
        marginBottom: 'clamp(1.5rem, 3vw, 2rem)',
        color: '#856404',
        border: '1px solid rgb(202, 165, 97)',
        transition: 'all 0.3s ease',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.border = '1px solid rgb(180, 145, 77)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(202, 165, 97, 0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.border = '1px solid rgb(202, 165, 97)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
      }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: 'clamp(1rem, 1.8vw, 1.2rem)' }}>Inventory Summary</h3>
        <p style={{ margin: 0, fontSize: 'clamp(0.85rem, 1.3vw, 0.95rem)' }}>
          Available for purchase: {available.length} | Already purchased: {purchased.length}
        </p>
      </div>

      {/* Available NFTs */}
      <section style={{ marginBottom: 'clamp(2rem, 4vw, 3rem)' }}>
        <h2 style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)', marginBottom: 'clamp(0.75rem, 1.5vw, 1rem)' }}>Available NFTs ({available.length})</h2>
        <p style={{ color: '#888', marginBottom: 'clamp(1rem, 2vw, 1.5rem)', fontSize: 'clamp(0.85rem, 1.3vw, 0.95rem)' }}>
          Purchase these NFTs for users by entering their DID. The bank pays with MetaMask.
        </p>
        {available.length === 0 ? (
          <div style={{ 
            padding: 'clamp(1.5rem, 3vw, 2.5rem)', 
            textAlign: 'center', 
            color: '#888', 
            background: '#1a1a1a', 
            borderRadius: '12px',
            fontSize: 'clamp(0.85rem, 1.3vw, 0.95rem)',
          }}>
            No NFTs available. Set prices on NFTs to make them available.
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', 
            gap: 'clamp(1rem, 2vw, 1.75rem)'
          }}>
            {available.map(nft => (
              <div 
                key={nft.tokenId} 
                style={{ ...cardStyle}}
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
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: 'clamp(1rem, 1.8vw, 1.25rem)' }}>{nft.name}</h4>
                <p style={{ color: '#aaa', fontSize: 'clamp(0.85rem, 1.3vw, 0.95rem)', margin: '0 0 0.75rem 0', lineHeight: '1.5' }}>
                  {nft.description}
                </p>
                <div style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.85rem)', color: '#666', marginBottom: '0.75rem' }}>
                  Token ID: #{nft.tokenId}
                </div>
                <div style={{ fontSize: 'clamp(1.1rem, 2vw, 1.3rem)', fontWeight: 'bold', color: '#926f06', marginBottom: '0.75rem' }}>
                  {nft.price} ETH
                </div>
                <button
                  onClick={() => purchaseForUser(nft.tokenId, nft.priceWei)}
                  disabled={loading}
                  style={{
                    ...buttonStyle,
                    opacity: loading ? 0.6 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: 'clamp(0.85rem, 1.5vw, 1rem)',
                    padding: 'clamp(0.6rem, 1.5vw, 0.75rem) clamp(0.8rem, 2vw, 1rem)',
                  }}
                  onMouseEnter={(e) => {if (!loading) (e.target as HTMLButtonElement).style.background = 'rgb(180, 145, 77)'}}
                  onMouseLeave={(e) => {if (!loading) (e.target as HTMLButtonElement).style.background = 'rgb(202, 165, 97)'}}
                >
                  Purchase for User
                </button>
                <button
                  onClick={() => setPrice(nft.tokenId)}
                  style={{
                    ...buttonStyle,
                    background: '#333',
                    marginTop: '0.5rem',
                    fontSize: 'clamp(0.85rem, 1.5vw, 1rem)',
                    padding: 'clamp(0.6rem, 1.5vw, 0.75rem) clamp(0.8rem, 2vw, 1rem)',
                  }}
                  onMouseEnter={(e) => {(e.target as HTMLButtonElement).style.background = '#555'}}
                  onMouseLeave={(e) => {(e.target as HTMLButtonElement).style.background = '#333'}}
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
        <h2 style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)', marginBottom: 'clamp(0.75rem, 1.5vw, 1rem)' }}>Purchased NFTs ({purchased.length})</h2>
        <p style={{ color: '#888', marginBottom: 'clamp(1rem, 2vw, 1.5rem)', fontSize: 'clamp(0.85rem, 1.3vw, 0.95rem)' }}>
          NFTs that have been purchased and assigned to user DIDs.
        </p>
        {purchased.length === 0 ? (
          <div style={{ 
            padding: 'clamp(1.5rem, 3vw, 2.5rem)', 
            textAlign: 'center', 
            color: '#888', 
            background: '#1a1a1a', 
            borderRadius: '12px',
            fontSize: 'clamp(0.85rem, 1.3vw, 0.95rem)',
          }}>
            No NFTs have been purchased yet.
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', 
            gap: 'clamp(1rem, 2vw, 1.75rem)'
          }}>
            {purchased.map(nft => (
              <div 
                key={nft.tokenId} 
                style={{ ...cardStyle, border: '1px solid rgb(202, 165, 97)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.border = '1px solid rgba(202, 165, 97, 1)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(202, 165, 97, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.border = '1px solid rgb(202, 165, 97)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
                }}
              >
                {nft.image && <img src={nft.image} alt={nft.name} style={imageStyle} />}
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: 'clamp(1rem, 1.8vw, 1.25rem)' }}>{nft.name}</h4>
                <p style={{ color: '#aaa', fontSize: 'clamp(0.85rem, 1.3vw, 0.95rem)', margin: '0 0 0.75rem 0', lineHeight: '1.5' }}>
                  {nft.description}
                </p>
                <div style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.85rem)', color: '#666', marginBottom: '0.75rem' }}>
                  Token ID: #{nft.tokenId}
                </div>
                <div style={{
                  background: 'rgba(125, 101, 55, 0.34)',
                  padding: 'clamp(0.6rem, 1.5vw, 0.75rem)',
                  borderRadius: '6px',
                  marginTop: '0.5rem'
                }}>
                  <div style={{ fontSize: 'clamp(0.7rem, 1.2vw, 0.75rem)', color: 'rgb(202, 165, 97)', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                    OWNED BY:
                  </div>
                  <div style={{ 
                    fontSize: 'clamp(0.65rem, 1.1vw, 0.7rem)', 
                    color: 'rgb(202, 165, 97)', 
                    wordBreak: 'break-all',
                    fontFamily: 'monospace',
                    lineHeight: '1.4'
                  }}>
                    {nft.didOwner}
                  </div>
                </div>
                
                {/* KYC Compliance Badge */}
                <div style={{
                  marginTop: '0.75rem',
                  padding: 'clamp(0.5rem, 1.5vw, 0.65rem)',
                  borderRadius: '6px',
                  background: nft.isCompliant ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 107, 107, 0.15)',
                  border: `1px solid ${nft.isCompliant ? '#4CAF50' : '#ff6b6b'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontSize: 'clamp(0.75rem, 1.3vw, 0.85rem)', 
                      fontWeight: 'bold',
                      color: nft.isCompliant ? '#4CAF50' : '#ff6b6b',
                      marginBottom: '0.15rem'
                    }}>
                      {nft.isCompliant ? 'KYC/AML Compliant' : 'Not Verified'}
                    </div>
                    {nft.isCompliant && nft.complianceTimestamp && (
                      <div style={{ 
                        fontSize: 'clamp(0.65rem, 1.1vw, 0.7rem)', 
                        color: '#888',
                      }}>
                        Verified: {new Date(nft.complianceTimestamp * 1000).toLocaleDateString()}
                      </div>
                    )}
                    {!nft.isCompliant && (
                      <div style={{ 
                        fontSize: 'clamp(0.65rem, 1.1vw, 0.7rem)', 
                        color: '#888',
                      }}>
                        Compliance proof not submitted
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* QR Code Request Modal */}
      {showQRRequest && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#1a1a1a',
            padding: '2rem',
            borderRadius: '12px',
            maxWidth: '500px',
            position: 'relative',
            border: '2px solid rgb(202, 165, 97)'
          }}>
            <button
              onClick={() => {
                setShowQRRequest(false);
                setQrSessionId("");
                setPurchasingTokenId(null);
                setPurchasingPrice(null);
                setManualDID('');
                setManualEthAddress('');
              }}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'transparent',
                border: 'none',
                color: '#888',
                fontSize: '1.5rem',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
            <h3 style={{ marginTop: 0, color: 'rgb(202, 165, 97)' }}>Purchase NFT for User</h3>
            <p style={{ color: '#888', marginBottom: '1.5rem' }}>
              Scan with wallet or enter details manually
            </p>
            {purchasingTokenId !== null && (
              <p style={{ 
                color: 'rgb(202, 165, 97)', 
                marginBottom: '1rem',
                padding: '0.75rem',
                background: 'rgba(202, 165, 97, 0.1)',
                borderRadius: '6px',
                border: '1px solid rgba(202, 165, 97, 0.3)'
              }}>
                Purchasing NFT #{purchasingTokenId}
                {purchasingPrice && ` for ${ethers.formatEther(purchasingPrice)} ETH`}
              </p>
            )}
            <div style={{
              background: 'white',
              padding: '1rem',
              borderRadius: '8px',
              display: 'inline-block',
              marginBottom: '1.5rem'
            }}>
              <QRCodeSVG 
                value={JSON.stringify({ type: 'did-request', sessionId: qrSessionId })}
                size={200}
              />
            </div>
            <p style={{ color: 'rgb(202, 165, 97)', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: 'bold' }}>
              Waiting for wallet response...
            </p>
            
            <div style={{
              borderTop: '1px solid #333',
              paddingTop: '1.5rem',
              marginTop: '1.5rem'
            }}>
              <h4 style={{ color: '#888', fontSize: '0.95rem', marginBottom: '1rem' }}>Or enter manually:</h4>
              
              <input
                type="text"
                placeholder="User DID (e.g., did:zeroid:...)" 
                value={manualDID}
                onChange={(e) => setManualDID(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#0a0a0a',
                  border: '1px solid #333',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '0.9rem',
                  marginBottom: '0.75rem',
                  boxSizing: 'border-box'
                }}
              />
              
              {manualDID.trim() && (
                <input
                  type="text"
                  placeholder="Ethereum Address (0x...)" 
                  value={manualEthAddress}
                  onChange={(e) => setManualEthAddress(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#0a0a0a',
                    border: '1px solid #333',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '0.9rem',
                    marginBottom: '0.75rem',
                    boxSizing: 'border-box'
                  }}
                />
              )}
              
              <button
                onClick={handleManualSubmit}
                disabled={!manualDID.trim() || !manualEthAddress.trim()}
                style={{
                  ...buttonStyle,
                  opacity: (!manualDID.trim() || !manualEthAddress.trim()) ? 0.5 : 1,
                  cursor: (!manualDID.trim() || !manualEthAddress.trim()) ? 'not-allowed' : 'pointer',
                  marginTop: '0.5rem',
                  fontSize: '0.9rem'
                }}
                onMouseEnter={(e) => {
                  if (manualDID.trim() && manualEthAddress.trim()) {
                    (e.target as HTMLButtonElement).style.background = 'rgb(180, 145, 77)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (manualDID.trim() && manualEthAddress.trim()) {
                    (e.target as HTMLButtonElement).style.background = 'rgb(202, 165, 97)';
                  }
                }}
              >
                Submit Manual Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

declare global {
  interface Window {
    ethereum?: any;
  }
}
