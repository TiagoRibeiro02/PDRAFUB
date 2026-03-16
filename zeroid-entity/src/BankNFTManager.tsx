import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

import { generateEntityQRSession, registerEntitySession, verifyWalletResponse, jwkToCompressed, getOnChainPublicKey, type EntityQRSession } from './utils/qrAuth';
import './BankNFTManager.css';
import AvailableNFTCard from './components/AvailableNFTCard';
import PurchasedNFTCard from './components/PurchasedNFTCard';
import QRModal from './components/QRModal';
import { type BankUser } from './components/UserPicker';


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

export interface NFTListing {
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
  const entityUser = JSON.parse(localStorage.getItem('entity_user') || 'null');
  const bankApiUrl: string = entityUser?.entity_api ?? 'http://localhost:8002/bank1_api.php';

  const [available, setAvailable] = useState<NFTListing[]>([]);
  const [purchased, setPurchased] = useState<NFTListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [account, setAccount] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [entityEthAddress, setEntityEthAddress] = useState('');
  const [complianceStatuses, setComplianceStatuses] = useState<{[did: string]: {isCompliant: boolean, timestamp: number, commitment: string}}>();
  const [showQRRequest, setShowQRRequest] = useState(false);
  const [entitySession, setEntitySession] = useState<EntityQRSession | null>(null);
  const [ethEurRate, setEthEurRate] = useState<number | null>(null);
  const [purchasingTokenId, setPurchasingTokenId] = useState<number | null>(null);
  const [purchasingPrice, setPurchasingPrice] = useState<bigint | null>(null);
  const [manualDID, setManualDID] = useState('');
  const [manualEthAddress, setManualEthAddress] = useState('');
  const [selectedBankUser, setSelectedBankUser] = useState<BankUser | null>(null);
  // Compressed public key (pkX + pkParity) verified against blockchain during QR scan
  const [compressedPk, setCompressedPk] = useState<{ pkX: string; pkParity: boolean } | null>(null);

  useEffect(() => {
    const entityUser = JSON.parse(localStorage.getItem('entity_user') || 'null');
    const entityAddress = (entityUser?.entity_eth_address || '').toLowerCase();
    setEntityEthAddress(entityAddress);

    checkWallet();
    
    fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHEUR')
      .then(r => r.json())
      .then(d => setEthEurRate(parseFloat(d.price)))
  }, []);

  useEffect(() => {
    if (account) {
      loadNFTs();
    }
  }, [account, contractAddress, contractABI, entityEthAddress]);

  // Poll relay server for QR code response
  useEffect(() => {
    if (!entitySession || purchasingTokenId === null || purchasingPrice === null) return;
    const { sessionId, challenge } = entitySession.qrPayload;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:8000/qr-relay.php?sessionId=${sessionId}`);
        const result   = await response.json();

        if (result.success && result.data) {
          try {
            const { did, ethAddress, publicKey } = await verifyWalletResponse(
              result.data, sessionId, challenge,
              entitySession.secretKey
            );

            // ── Blockchain public-key check ─────────────────────────────────
            let compressed: { pkX: string; pkParity: boolean } | null = null;
            if (publicKey && kycContractAddress && KYCComplianceABI) {
              try {
                compressed = jwkToCompressed(JSON.parse(publicKey) as JsonWebKey);
                const onChainHex = await getOnChainPublicKey(did, kycContractAddress, KYCComplianceABI);
                if (onChainHex && onChainHex !== '0x') {
                  const onChainParity = onChainHex.slice(2, 4) === '03';
                  const onChainX     = onChainHex.slice(4).toLowerCase();
                  if (
                    onChainX !== compressed.pkX.slice(2).toLowerCase() ||
                    onChainParity !== compressed.pkParity
                  ) {
                    alert(
                      'Security error: the public key from the wallet does not match ' +
                      'the key registered on the blockchain for this DID.\n\n' +
                      'Possible key substitution attack — request rejected.'
                    );
                    setShowQRRequest(false);
                    setEntitySession(null);
                    return;
                  }
                  console.log('On-chain PK verified ✓');
                } else {
                  console.log('No on-chain PK yet — will be registered on first KYC submission.');
                }
              } catch (pkErr: any) {
                console.warn('Blockchain PK check skipped:', pkErr.message);
              }
            }

            // Fill the fields so the entity can review and pick a bank user
            setManualDID(did);
            setManualEthAddress(ethAddress);
            if (compressed) setCompressedPk(compressed);
            // Keep modal open — entity still needs to select a bank user
          } catch (verifyErr: any) {
            console.error('QR mutual-auth verification failed:', verifyErr);
            alert(`Security error: ${verifyErr.message}\n\n Request rejected.`);
          }
        }
      } catch (err) {
        console.error('Error polling for response:', err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [entitySession, purchasingTokenId, purchasingPrice]);

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

      // Check if connected account matches logged-in entity wallet
      setIsOwner(!!entityEthAddress && entityEthAddress === account.toLowerCase());

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
    try {
      const session = await generateEntityQRSession();
      await registerEntitySession(session.relayRegistration);
      setPurchasingTokenId(tokenId);
      setPurchasingPrice(priceWei);
      setEntitySession(session);
      setManualDID('');
      setManualEthAddress('');
      setCompressedPk(null);
      setSelectedBankUser(null);
      setShowQRRequest(true);
    } catch (err: any) {
      alert('Failed to create QR session: ' + (err?.message ?? err));
    }
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

    if (!manualEthAddress.trim()) {
      alert('Please enter an Ethereum address');
      return;
    }

    if (!manualEthAddress.startsWith('0x') || manualEthAddress.length !== 42) {
      alert('Invalid Ethereum address format. Must be 42 characters starting with 0x');
      return;
    }

    if (!selectedBankUser) {
      alert('Please select a bank user to assign this NFT to');
      return;
    }

    if (purchasingTokenId !== null && purchasingPrice !== null) {
      setShowQRRequest(false);
      setEntitySession(null);

      // PK was already verified against the blockchain during QR scan.
      await executePurchase(purchasingTokenId, purchasingPrice, manualDID, manualEthAddress);
      console.log('Compressed PK for this DID (to register on-chain if needed):', compressedPk);
      setPurchasingTokenId(null);
      setPurchasingPrice(null);
      setManualDID('');
      setManualEthAddress('');
      setCompressedPk(null);
      setSelectedBankUser(null);
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
        <button onClick={connectWallet} className="ui-btn ui-btn-gold noacc">
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
          Connected wallet is not the wallet registered for your entity.
        </p>
        {entityEthAddress && (
          <p className='smaller'>
            Expected: {entityEthAddress.slice(0, 6)}...{entityEthAddress.slice(-4)}
          </p>
        )}
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
      {/* Info bar */}
      <div className="issuer-info-bar">
        <span><strong>Contract:</strong> {contractAddress.slice(0, 8)}…{contractAddress.slice(-4)}</span>
        <span><strong>Network:</strong> Localhost:8545</span>
        <span className="wallet-chip">Wallet: {account.slice(0, 6)}…{account.slice(-4)}</span>
      </div>

      <div className='refreshDiv'>
        <div>
          <h1 className='titleStyle'>Bank NFT Management</h1>
        </div>
        <button onClick={loadNFTs} className="ui-btn ui-btn-gold refresh">
          Refresh
        </button>
      </div>

      {error && (
        <div className='error'>
          {error}
        </div>
      )}

      <div className='summaryDiv'>
        <h3 className='summarytitle'>Inventory Summary</h3>
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
              <AvailableNFTCard
                key={nft.tokenId}
                nft={nft}
                loading={loading}
                ethEurRate={ethEurRate}
                onPurchase={purchaseForUser}
              />
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
              <PurchasedNFTCard key={nft.tokenId} nft={nft} />
            ))}
          </div>
        )}
      </section>

      {/* QR Code Request Modal */}
      {showQRRequest && (
        <QRModal
          qrPayload={entitySession?.qrPayload ?? null}
          purchasingTokenId={purchasingTokenId}
          purchasingPrice={purchasingPrice}
          bankApiUrl={bankApiUrl}
          manualDID={manualDID}
          manualEthAddress={manualEthAddress}
          selectedBankUser={selectedBankUser}
          onClose={() => {
            setShowQRRequest(false);
            setEntitySession(null);
            setPurchasingTokenId(null);
            setPurchasingPrice(null);
            setManualDID('');
            setManualEthAddress('');
            setCompressedPk(null);
            setSelectedBankUser(null);
          }}
          onManualDIDChange={setManualDID}
          onManualEthAddressChange={setManualEthAddress}
          onBankUserSelect={setSelectedBankUser}
          onManualSubmit={handleManualSubmit}
        />
      )}
    </div>
  );
}
