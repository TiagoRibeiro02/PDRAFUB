import { ethers } from 'ethers';
import { NFTData } from '../components/types';

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
    const soldPriceByTokenId = new Map<number, bigint>();

    // In this contract getPrice(tokenId) becomes 0 after purchase.
    // Recover historical paid price from NFTPurchased events.
    try {
      const purchaseEvents = await contract.queryFilter(contract.filters.NFTPurchased());
      for (const ev of purchaseEvents) {
        const args = (ev as ethers.EventLog).args as { tokenId?: bigint; price?: bigint; [k: number]: unknown };
        const tokenIdRaw = args.tokenId ?? (args[0] as bigint | undefined);
        const priceRaw = args.price ?? (args[2] as bigint | undefined);
        if (typeof tokenIdRaw !== 'undefined' && typeof priceRaw !== 'undefined') {
          soldPriceByTokenId.set(Number(tokenIdRaw), BigInt(priceRaw.toString()));
        }
      }
    } catch (err) {
      console.warn('Could not load NFTPurchased event history:', err);
    }

    // Fetch all NFTs that have a DID owner
    for (let i = 0; i < totalSupply; i++) {
      try {
        const didOwner = await contract.getDidOwner(i);
        
        // Only include NFTs that have been purchased (have a DID owner)
        if (didOwner && didOwner !== '') {
          const tokenURI = await contract.tokenURI(i);
          const priceWeiRaw = await contract.getPrice(i);
          const priceWei = priceWeiRaw > 0n ? priceWeiRaw : (soldPriceByTokenId.get(i) ?? 0n);
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
          let kycIssuer = '';

          if (kycContractAddress && kycABI) {
            try {
              const kycContract = new ethers.Contract(kycContractAddress, kycABI, provider);
              const [isComp, timestamp, expiryDate, commitment, issuerVal] = await kycContract.checkCompliance(didOwner);
              isCompliant = isComp;
              complianceTimestamp = Number(timestamp);
              kycExpiryTimestamp = Number(expiryDate);
              complianceCommitment = commitment;
              kycIssuer = issuerVal || '';
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
            price: ethers.formatEther(priceWei),
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
              attributes: Array.isArray(metadata.attributes) ? metadata.attributes : [],
              complianceTimestamp: complianceTimestamp > 0 ? complianceTimestamp : undefined,
              kycExpiryTimestamp: kycExpiryTimestamp > 0 ? kycExpiryTimestamp : undefined,
              complianceCommitment: complianceCommitment || undefined,
              kycIssuer: kycIssuer || undefined,
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
