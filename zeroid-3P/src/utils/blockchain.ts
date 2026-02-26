import { ethers } from 'ethers';
import { NFTData } from '../types';

export async function getProvider() {
  if (typeof window.ethereum !== 'undefined') {
    return new ethers.BrowserProvider(window.ethereum);
  }
  // Fallback to read-only provider
  return new ethers.JsonRpcProvider('http://127.0.0.1:8545');
}

export async function fetchAllNFTs(
  contractAddress: string,
  contractABI: any,
  kycContractAddress?: string,
  kycABI?: any
): Promise<NFTData[]> {
  try {
    const provider = await getProvider();
    const contract = new ethers.Contract(contractAddress, contractABI, provider);

    // Get total supply
    const totalSupply = await contract.totalSupply();
    const nfts: NFTData[] = [];

    // Fetch all NFTs that have a DID owner
    for (let i = 0; i < totalSupply; i++) {
      try {
        const didOwner = await contract.getDidOwner(i);
        
        // Only include NFTs that have been purchased (have a DID owner)
        if (didOwner && didOwner !== '') {
          const tokenURI = await contract.tokenURI(i);
          const owner = await contract.ownerOf(i);
          
          // Parse metadata
          let metadata;
          if (tokenURI.startsWith('data:application/json')) {
            const base64Data = tokenURI.split(',')[1];
            const jsonString = atob(base64Data);
            metadata = JSON.parse(jsonString);
          } else {
            const response = await fetch(tokenURI);
            metadata = await response.json();
          }

          // Check KYC compliance if available
          let isCompliant = false;
          let complianceTimestamp = 0;
          let complianceCommitment = '';
          let kycExpiryTimestamp = 0;

          if (kycContractAddress && kycABI) {
            try {
              const kycContract = new ethers.Contract(kycContractAddress, kycABI, provider);
              const [isComp, timestamp, expiryDate, commitment] = await kycContract.checkCompliance(didOwner);
              isCompliant = isComp;
              complianceTimestamp = Number(timestamp);
              kycExpiryTimestamp = Number(expiryDate);
              complianceCommitment = commitment;
            } catch (err) {
              console.warn(`Could not check KYC for DID ${didOwner}:`, err);
            }
          }

          // Parse attributes from metadata
          const attributes = metadata.attributes || [];
          const getAttribute = (traitType: string) => {
            const attr = attributes.find((a: any) => a.trait_type === traitType);
            return attr ? attr.value : '';
          };

          nfts.push({
            id: `${i}`,
            tokenId: i,
            did: didOwner,
            owner: owner,
            name: metadata.name || `NFT #${i}`,
            dateIssued: '',
            expirationDate: '',
            nationality: getAttribute('Nationality') || '',
            documentType: getAttribute('Document Type') || '',
            documentNumber: getAttribute('Document Number') || '',
            issuer: getAttribute('Issuer') || '',
            isActive: isCompliant,
            metadata: {
              description: metadata.description,
              image: metadata.image,
              complianceTimestamp: complianceTimestamp > 0 ? complianceTimestamp : undefined,
              kycExpiryTimestamp: kycExpiryTimestamp > 0 ? kycExpiryTimestamp : undefined,
              complianceCommitment: complianceCommitment || undefined,
            }
          });
        }
      } catch (err) {
        console.error(`Error loading NFT #${i}:`, err);
      }
    }

    return nfts;
  } catch (error) {
    console.error("Error fetching NFTs:", error);
    throw error;
  }
}
