import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import NFTCard from './NFTCard';
import DetailPanel from './DetailPanel';
import type { NFTData } from './types';
import './NFTGallery.css';

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

interface NFTGalleryProps {
  userDid: string;
  contractAddress: string;
  contractABI: any;
  onNFTsLoaded?: (count: number) => void;
}

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

      const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
      const contract = new ethers.Contract(contractAddress, contractABI, provider);

      const tokenIds = await contract.tokensOfDID(userDid);

      if (tokenIds.length === 0) {
        setNfts([]);
        if (onNFTsLoaded) onNFTsLoaded(0);
        setLoading(false);
        return;
      }

      const nftData: NFTData[] = [];
      for (const tokenId of tokenIds) {
        try {
          const tokenURI     = await contract.tokenURI(tokenId);
          const didOwner     = await contract.getDidOwner(tokenId);
          const ownerAddress = await contract.ownerOf(tokenId);

          let metadata: any;
          if (tokenURI.startsWith('data:application/json')) {
            metadata = JSON.parse(atob(tokenURI.split(',')[1]));
          } else {
            metadata = await (await fetch(tokenURI)).json();
          }

          const attributes = metadata.attributes || [];
          const getAttribute = (traitType: string): string => {
            const attr = attributes.find((a: any) => a.trait_type === traitType);
            return attr ? attr.value : '';
          };

          let isCompliant = false;
          let complianceTimestamp = 0;
          let kycExpiryDate = 0;

          if (kycContractAddress && KYCComplianceABI && didOwner) {
            try {
              const kycContract = new ethers.Contract(kycContractAddress, KYCComplianceABI, provider);
              const [isComp, timestamp, expiryDate] = await kycContract.checkCompliance(didOwner);
              isCompliant         = isComp;
              complianceTimestamp = Number(timestamp);
              kycExpiryDate       = Number(expiryDate);
            } catch (err) {
              console.warn(`Could not check KYC for DID ${didOwner}:`, err);
            }
          }

          nftData.push({
            id:             tokenId.toString(),
            tokenId:        Number(tokenId),
            did:            didOwner,
            owner:          ownerAddress,
            name:           metadata.name || `NFT #${tokenId}`,
            dateIssued:     getAttribute('Date Issued') || new Date().toISOString(),
            expirationDate: kycExpiryDate > 0 ? new Date(kycExpiryDate * 1000).toISOString() : '',
            nationality:    getAttribute('Nationality'),
            documentType:   getAttribute('Document Type'),
            documentNumber: getAttribute('Document Number'),
            issuer:         getAttribute('Issuer'),
            isActive:       isCompliant,
            metadata: {
              image:               metadata.image || '',
              description:         metadata.description || '',
              complianceTimestamp: complianceTimestamp > 0 ? complianceTimestamp : undefined,
              kycExpiryTimestamp:  kycExpiryDate > 0 ? kycExpiryDate : undefined,
            },
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
    return <div className="nft-gallery-loading">Loading your NFTs...</div>;
  }

  if (error) {
    return <div style={{ color: '#ff6b6b', fontSize: '1rem' }}>Error: {error}</div>;
  }

  if (nfts.length === 0) {
    return (
      <div className="nft-gallery-empty">
        <p>You don't own any NFTs yet.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{
        marginBottom: 'clamp(1rem, 2vw, 1.5rem)',
        fontSize: 'clamp(1.2rem, 2.2vw, 1.6rem)',
      }}>
        Your Asset Collection ({nfts.length})
      </h3>

      <div className="nft-gallery-main">
        <div className={`nft-list-container ${selectedNFT ? 'with-detail' : ''}`}>
          <div className="nft-grid">
            {nfts.map((nft) => (
              <NFTCard
                key={nft.id}
                nft={nft}
                isSelected={selectedNFT?.id === nft.id}
                onClick={() => setSelectedNFT(nft)}
              />
            ))}
          </div>
        </div>

        {selectedNFT && (
          <DetailPanel nft={selectedNFT} onClose={() => setSelectedNFT(null)} />
        )}
      </div>
    </div>
  );
}
