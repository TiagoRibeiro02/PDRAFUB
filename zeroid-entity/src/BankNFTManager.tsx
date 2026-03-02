import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { QRCodeSVG } from 'qrcode.react';
import './BankNFTManager.css';

// Import KYC contract
let kycContractAddress: string | undefined;
let KYCComplianceABI: any;

declare global {
  interface Window {
    ethereum?: any;
  }
}

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

      const complianceMap: {[did: string]: {isCompliant: boolean, timestamp: number, expiryDate: number, commitment: string}} = {};

      for (const did of dids) {
        try {
          const [isCompliant, timestamp, expiryDate, commitment] = await kycContract.checkCompliance(did);
          complianceMap[did] = {
            isCompliant,
            timestamp: Number(timestamp),
            expiryDate: Number(expiryDate),
            commitment
          };
        } catch (err) {
          console.error(`Error checking compliance for ${did}:`, err);
          complianceMap[did] = { isCompliant: false, timestamp: 0, expiryDate: 0, commitment: '' };
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

      const confirm = window.confirm(
        `Confirm purchase:\n\n` +
        `NFT: #${tokenId}\n` +
        `For User DID: ${userDID}\n` +
        `To Address: ${userEthAddress}\n` +
        `Price: ${ethers.formatEther(priceWei)} ETH\n` +
        `Gas fees: Paid by bank\n\n` +
        `The bank will purchase and transfer this NFT to the user's wallet in a single transaction.`
      );

      if (!confirm) {
        setLoading(false);
        return;
      }

      console.log(`Purchasing and transferring NFT #${tokenId} to DID: ${userDID} (${userEthAddress})`);
      const tx = await contract.purchaseAndTransferNFT(tokenId, userDID, userEthAddress, { value: priceWei });
      console.log('Transaction sent:', tx.hash);
      await tx.wait();
      console.log('Transaction confirmed!');

      alert(
        `Purchase and transfer successful!\n\n` +
        `NFT #${tokenId} has been:\n` +
        `1. Assigned to DID: ${userDID}\n` +
        `2. Transferred to: ${userEthAddress}\n\n` +
        `The user now has full custody of the NFT!\n` +
        `All completed in a single transaction. Gas fees were paid by the bank.`
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

  if (!account) {
    return (
      <div className='noAcountStyle'>
        <h2 className='titleStyle2'>Bank NFT Management</h2>
        <p className='normal'>Connect your bank wallet to manage NFTs</p>
        <button onClick={connectWallet} className="buttonStyle noacc">
          Connect MetaMask
        </button>
      </div>
    );
  }

  if (!isOwner && account) {
    return (
      <div className='noAcountStyle'>
        <h2 className='titleStyle2'>Access Denied</h2>
        <p className='notOwnerStyle'>
          You are not a financial instituition worker.
        </p>
        <p className='smaller'>
          Connected: {account.slice(0, 6)}...{account.slice(-4)}
        </p>
      </div>
    );
  }

  if (loading && available.length === 0 && purchased.length === 0) {
    return <div className='loadingStyle'>Loading NFT inventory...</div>;
  }

  return (
    <div className='mainDivStyle'>
      <div className='refreshDiv'>
        <div>
          <h1 className='titleStyle'>Bank NFT Management</h1>
        </div>
        <button onClick={loadNFTs} className="buttonStyle refresh">
          Refresh
        </button>
      </div>

      {error && (
        <div className='error'>
          {error}
        </div>
      )}

      <div className='summaryDiv'>
        <h3 className='titleStyle3'>Inventory Summary</h3>
        <p className='summaryp'>
          Available for purchase: {available.length} | Already purchased: {purchased.length}
        </p>
      </div>

      {/* Available NFTs */}
      <section className='nftSection'>
        <h2 className='titleStyle2smaller'>Available NFTs ({available.length})</h2>
        <p className='medium'>
          Purchase these NFTs for users by entering their DID. The bank pays with MetaMask.
        </p>
        {available.length === 0 ? (
          <div className='notAvailableStyle'>
            No NFTs available.
          </div>
        ) : (
          <div className='purchaseDiv'>
            {available.map(nft => (
              <div key={nft.tokenId} className="cardStyle">
                {nft.image && <img src={nft.image} alt={nft.name} className="imageStyle" />}
                <h4 className='nftName'>{nft.name}</h4>
                <p className='nftDescription'>{nft.description}</p>
                <div className='nftTokenId'>Token ID: #{nft.tokenId}</div>
                <div className='nftPrice'>{nft.price} ETH</div>
                <button
                  onClick={() => purchaseForUser(nft.tokenId, nft.priceWei)}
                  disabled={loading}
                  className="buttonStyle purchase"
                >
                  Purchase for User
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Purchased NFTs */}
      <section>
        <h2 className='titleStyle'>Purchased NFTs ({purchased.length})</h2>
        <p className='medium'>
          NFTs that have been purchased and assigned to user DIDs.
        </p>
        {purchased.length === 0 ? (
          <div className='notAvailableStyle'>
            No NFTs have been purchased yet.
          </div>
        ) : (
          <div className='purchaseDiv'>
            {purchased.map(nft => (
              <div key={nft.tokenId} className="cardStyle">
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
            ))}
          </div>
        )}
      </section>

      {/* QR Code Request Modal */}
      {showQRRequest && (
        <div className='qRequestDiv'>
          <div className='closeButtonDiv'>
            <button
              onClick={() => {
                setShowQRRequest(false);
                setQrSessionId("");
                setPurchasingTokenId(null);
                setPurchasingPrice(null);
                setManualDID('');
                setManualEthAddress('');
              }}
              className='closeButton'
            >
              ✕
            </button>
            <h3 className='titleStyle3Gold'>Purchase NFT for User</h3>
            <p className='scantext'>
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
                className='didInput'
              />
              
              {manualDID.trim() && (
                <input
                  type="text"
                  placeholder="Ethereum Address (0x...)" 
                  value={manualEthAddress}
                  onChange={(e) => setManualEthAddress(e.target.value)}
                  className='didInput'
                />
              )}
              
              <button
                onClick={handleManualSubmit}
                disabled={!manualDID.trim() || !manualEthAddress.trim()}
                className="buttonStyle"
                style={{
                  opacity: (!manualDID.trim() || !manualEthAddress.trim()) ? 0.5 : 1,
                  cursor: (!manualDID.trim() || !manualEthAddress.trim()) ? 'not-allowed' : 'pointer',
                  marginTop: '0.5rem',
                  fontSize: '0.9rem'
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
