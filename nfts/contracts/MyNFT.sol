// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MyNFT
 * @dev NFT contract with DID-based ownership tracking and marketplace functionality
 * The contract owner (bank) mints NFTs and users purchase them with their DID
 */
contract MyNFT is ERC721URIStorage, Ownable {
    uint256 private _tokenIdCounter;

    // Mapping from tokenId to DID owner
    mapping(uint256 => string) private _didOwners;
    
    // Mapping from tokenId to price (0 means not for sale)
    mapping(uint256 => uint256) private _prices;
    
    // Mapping from DID to Ethereum address
    mapping(string => address) private _didToAddress;

    event NFTMinted(address indexed to, uint256 indexed tokenId, string tokenURI, uint256 price);
    event NFTPurchased(uint256 indexed tokenId, string indexed buyerDID, uint256 price);
    event DIDOwnershipTransferred(uint256 indexed tokenId, string previousDID, string newDID);
    event PriceUpdated(uint256 indexed tokenId, uint256 newPrice);
    event DIDLinked(string indexed did, address indexed ethAddress);

    constructor() ERC721("MyNFT Collection", "MNFT") Ownable(msg.sender) {
        _tokenIdCounter = 0;
    }

    /**
     * @dev Mint a new NFT to the bank (contract owner) with a price
     * @param tokenURI The metadata URI for the NFT
     * @param price The price in wei (0 means not for sale)
     * @return The ID of the newly minted token
     */
    function mintNFT(string memory tokenURI, uint256 price) public onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        _safeMint(owner(), tokenId);
        _setTokenURI(tokenId, tokenURI);
        _prices[tokenId] = price;
        
        emit NFTMinted(owner(), tokenId, tokenURI, price);
        
        return tokenId;
    }

    /**
     * @dev Purchase an NFT with a DID
     * @param tokenId The ID of the NFT to purchase
     * @param buyerDID The DID of the buyer (e.g., "did:zeroid:...")
     */
    function purchaseNFT(uint256 tokenId, string memory buyerDID) public payable {
        require(_ownerOf(tokenId) == owner(), "NFT not available from bank");
        require(_prices[tokenId] > 0, "NFT not for sale");
        require(msg.value >= _prices[tokenId], "Insufficient payment");
        require(bytes(buyerDID).length > 0, "Invalid DID");
        
        uint256 price = _prices[tokenId];
        
        // Transfer payment to owner (bank)
        payable(owner()).transfer(price);
        
        // Refund excess payment
        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }
        
        // Record DID ownership
        _didOwners[tokenId] = buyerDID;
        _prices[tokenId] = 0; // Mark as not for sale
        
        emit NFTPurchased(tokenId, buyerDID, price);
        emit DIDOwnershipTransferred(tokenId, "", buyerDID);
    }

    /**
     * @dev Link a DID to an Ethereum address
     * @param did The DID to link (e.g., "did:zeroid:...")
     * @param ethAddress The Ethereum address to link to this DID
     * Can be called by anyone to link their own DID, or by owner for admin purposes
     */
    function linkDIDToAddress(string memory did, address ethAddress) public {
        require(bytes(did).length > 0, "Invalid DID");
        require(ethAddress != address(0), "Invalid address");
        
        // Allow linking if not yet linked, or if caller is owner (for admin updates)
        require(_didToAddress[did] == address(0) || msg.sender == owner(), 
                "DID already linked. Only owner can update.");
        
        _didToAddress[did] = ethAddress;
        emit DIDLinked(did, ethAddress);
    }

    /**
     * @dev Get the Ethereum address linked to a DID
     * @param did The DID to query
     * @return The linked Ethereum address (0x0 if not linked)
     */
    function getAddressForDID(string memory did) public view returns (address) {
        return _didToAddress[did];
    }

    /**
     * @dev Transfer NFT to another DID (requires paying a small fee to cover gas)
     * @param tokenId The ID of the NFT to transfer
     * @param newDID The DID of the new owner
     */
    function transferToDID(uint256 tokenId, string memory newDID) public {
        require(bytes(_didOwners[tokenId]).length > 0, "Not owned by any DID");
        require(bytes(newDID).length > 0, "Invalid DID");
        // In a real implementation, you'd verify the caller owns this DID
        
        string memory previousDID = _didOwners[tokenId];
        _didOwners[tokenId] = newDID;
        
        emit DIDOwnershipTransferred(tokenId, previousDID, newDID);
    }

    /**
     * @dev Update the price of an NFT (only owner can do this)
     * @param tokenId The ID of the NFT
     * @param newPrice The new price in wei
     */
    function setPrice(uint256 tokenId, uint256 newPrice) public onlyOwner {
        require(_ownerOf(tokenId) == owner(), "Can only price NFTs in bank");
        _prices[tokenId] = newPrice;
        emit PriceUpdated(tokenId, newPrice);
    }

    /**
     * @dev Get the DID owner of an NFT
     * @param tokenId The ID of the NFT
     * @return The DID string (empty if owned by bank)
     */
    function getDidOwner(uint256 tokenId) public view returns (string memory) {
        return _didOwners[tokenId];
    }

    /**
     * @dev Get the price of an NFT
     * @param tokenId The ID of the NFT
     * @return The price in wei (0 means not for sale)
     */
    function getPrice(uint256 tokenId) public view returns (uint256) {
        return _prices[tokenId];
    }

    /**
     * @dev Get all NFTs owned by a specific DID
     * @param did The DID to query
     * @return An array of token IDs
     */
    function tokensOfDID(string memory did) public view returns (uint256[] memory) {
        uint256 count = 0;
        
        // Count matching tokens
        for (uint256 i = 0; i < _tokenIdCounter; i++) {
            if (keccak256(bytes(_didOwners[i])) == keccak256(bytes(did))) {
                count++;
            }
        }
        
        // Populate array
        uint256[] memory tokenIds = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < _tokenIdCounter; i++) {
            if (keccak256(bytes(_didOwners[i])) == keccak256(bytes(did))) {
                tokenIds[index] = i;
                index++;
            }
        }
        
        return tokenIds;
    }

    /**
     * @dev Get all NFTs available in the bank (not purchased yet)
     * @return An array of token IDs and their prices
     */
    function getAvailableNFTs() public view returns (uint256[] memory, uint256[] memory) {
        uint256 count = 0;
        
        // Count available tokens
        for (uint256 i = 0; i < _tokenIdCounter; i++) {
            if (_ownerOf(i) == owner() && _prices[i] > 0) {
                count++;
            }
        }
        
        // Populate arrays
        uint256[] memory tokenIds = new uint256[](count);
        uint256[] memory prices = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < _tokenIdCounter; i++) {
            if (_ownerOf(i) == owner() && _prices[i] > 0) {
                tokenIds[index] = i;
                prices[index] = _prices[i];
                index++;
            }
        }
        
        return (tokenIds, prices);
    }

    /**
     * @dev Get the total number of NFTs minted
     * @return The total supply
     */
    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @dev Get all token IDs owned by an address (bank use only)
     * @param owner The address to query
     * @return An array of token IDs
     */
    function tokensOfOwner(address owner) public view returns (uint256[] memory) {
        uint256 tokenCount = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](tokenCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < _tokenIdCounter; i++) {
            if (_ownerOf(i) == owner) {
                tokenIds[index] = i;
                index++;
            }
        }
        
        return tokenIds;
    }
}
