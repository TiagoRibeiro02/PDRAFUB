import { useState, useEffect } from 'react';
import './App.css';
import NFTCard from './NFTCard';
import DetailPanel from './DetailPanel';
import { NFTData } from './types';
import { fetchAllNFTs } from './utils/blockchain';

// Import contract address and ABI
let contractAddress: string | undefined;
let MyNFTABI: any;
let kycContractAddress: string | undefined;
let KYCComplianceABI: any;

try {
  const addressData = await import('./contracts/contract-address.json');
  const abiData = await import('./contracts/MyNFT.json');
  contractAddress = addressData.MyNFT;
  MyNFTABI = abiData.abi;
} catch (error) {
  console.warn('Contract files not found. Please deploy the contract first.');
}

try {
  const kycDeployment = await import('./contracts/kyc-deployment.json');
  const kycAbi = await import('./contracts/KYCCompliance.json');
  kycContractAddress = kycDeployment.KYCCompliance;
  KYCComplianceABI = kycAbi.abi;
} catch (error) {
  console.warn('KYC contract files not found.');
}

function App() {
  const [nfts, setNfts] = useState<NFTData[]>([]);
  const [filteredNfts, setFilteredNfts] = useState<NFTData[]>([]);
  const [selectedNFT, setSelectedNFT] = useState<NFTData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load NFTs on mount
  useEffect(() => {
    loadNFTs();
  }, []);

  const loadNFTs = async () => {
    if (!contractAddress || !MyNFTABI) {
      setError('Contract not deployed. Please run the deployment script first.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const fetchedNFTs = await fetchAllNFTs(
        contractAddress,
        MyNFTABI,
        kycContractAddress,
        KYCComplianceABI
      );
      setNfts(fetchedNFTs);
      setFilteredNfts(fetchedNFTs);
    } catch (err) {
      console.error('Error loading NFTs:', err);
      setError('Failed to load NFTs. Make sure the blockchain is running and contracts are deployed.');
    } finally {
      setLoading(false);
    }
  };

  // Filter NFTs based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredNfts(nfts);
    } else {
      const filtered = nfts.filter(nft =>
        nft.did.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nft.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nft.tokenId.toString().includes(searchTerm) ||
        nft.owner.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredNfts(filtered);
      
      // If selected NFT is not in filtered results, clear selection
      if (selectedNFT && !filtered.find(nft => nft.id === selectedNFT.id)) {
        setSelectedNFT(null);
      }
    }
  }, [searchTerm, nfts, selectedNFT]);

  const handleNFTClick = (nft: NFTData) => {
    setSelectedNFT(nft);
  };

  const handleCloseDetail = () => {
    setSelectedNFT(null);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🔐 ZeroID Third Party Viewer</h1>
        <p>View and search identity NFTs - {nfts.length} NFTs total</p>
      </header>

      <div className="search-container">
        <input
          type="text"
          className="search-bar"
          placeholder="Search by DID, name, token ID, or address..."
          value={searchTerm}
          onChange={handleSearchChange}
        />
        <button onClick={loadNFTs} style={{ marginLeft: '1rem' }}>
          🔄 Refresh
        </button>
      </div>

      <div className="main-content">
        <div className={`nft-list-container ${selectedNFT ? 'with-detail' : ''}`}>
          {error ? (
            <div className="empty-state">
              <div className="empty-state-icon">⚠️</div>
              <div className="empty-state-text">{error}</div>
              <button onClick={loadNFTs} style={{ marginTop: '1rem' }}>
                Try Again
              </button>
            </div>
          ) : loading ? (
            <div className="loading">Loading NFTs from blockchain...</div>
          ) : filteredNfts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <div className="empty-state-text">
                {searchTerm ? 'No NFTs found matching your search' : 'No purchased NFTs found'}
              </div>
              {!searchTerm && (
                <p style={{ marginTop: '1rem', color: '#999' }}>
                  NFTs will appear here once they are purchased and linked to a DID
                </p>
              )}
            </div>
          ) : (
            <div className="nft-grid">
              {filteredNfts.map(nft => (
                <NFTCard
                  key={nft.id}
                  nft={nft}
                  isSelected={selectedNFT?.id === nft.id}
                  onClick={() => handleNFTClick(nft)}
                />
              ))}
            </div>
          )}
        </div>

        {selectedNFT && (
          <DetailPanel nft={selectedNFT} onClose={handleCloseDetail} />
        )}
      </div>
    </div>
  );
}

export default App;