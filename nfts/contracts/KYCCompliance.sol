// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IPlonkVerifier {
    function verifyProof(bytes memory proof, uint[] memory pubSignals) external view returns (bool);
}

/**
 * @title KYCCompliance
 * @dev Stores KYC/AML compliance status verified through zero-knowledge proofs
 */
contract KYCCompliance {
    IPlonkVerifier public verifier;
    address public issuer;
    
    struct ComplianceStatus {
        bool isCompliant;
        uint256 timestamp;
        string commitment; // The zero-knowledge proof commitment
        bool exists;
    }
    
    // Mapping from DID hash to compliance status
    mapping(bytes32 => ComplianceStatus) public complianceStatuses;
    
    // Events
    event ComplianceVerified(
        bytes32 indexed didHash,
        string did,
        bool isCompliant,
        string commitment,
        uint256 timestamp
    );
    
    event IssuerUpdated(address indexed oldIssuer, address indexed newIssuer);
    
    modifier onlyIssuer() {
        require(msg.sender == issuer, "Only issuer can call this function");
        _;
    }
    
    constructor(address _verifierAddress) {
        verifier = IPlonkVerifier(_verifierAddress);
        issuer = msg.sender;
    }
    
    /**
     * @dev Update the issuer address
     */
    function updateIssuer(address newIssuer) external onlyIssuer {
        require(newIssuer != address(0), "Invalid issuer address");
        address oldIssuer = issuer;
        issuer = newIssuer;
        emit IssuerUpdated(oldIssuer, newIssuer);
    }
    
    /**
     * @dev Submit a zero-knowledge proof to verify KYC/AML compliance
     * @param did The user's DID (Decentralized Identifier)
     * @param commitment The commitment from the zero-knowledge proof
     * @param proof The PLONK proof data
     * @param publicSignals The public signals from the proof
     */
    function submitComplianceProof(
        string memory did,
        string memory commitment,
        bytes memory proof,
        uint[] memory publicSignals
    ) external onlyIssuer {
        require(bytes(did).length > 0, "DID cannot be empty");
        
        // Verify the zero-knowledge proof
        bool isValid = verifier.verifyProof(proof, publicSignals);
        require(isValid, "Invalid zero-knowledge proof");
        
        // Create DID hash for storage key
        bytes32 didHash = keccak256(abi.encodePacked(did));
        
        // Store compliance status
        complianceStatuses[didHash] = ComplianceStatus({
            isCompliant: true,
            timestamp: block.timestamp,
            commitment: commitment,
            exists: true
        });
        
        emit ComplianceVerified(didHash, did, true, commitment, block.timestamp);
    }
    
    /**
     * @dev Check if a DID is KYC/AML compliant
     * @param did The DID to check
     * @return isCompliant Whether the DID is compliant
     * @return timestamp When the compliance was verified
     * @return commitment The proof commitment
     */
    function checkCompliance(string memory did) 
        external 
        view 
        returns (bool isCompliant, uint256 timestamp, string memory commitment) 
    {
        bytes32 didHash = keccak256(abi.encodePacked(did));
        ComplianceStatus memory status = complianceStatuses[didHash];
        
        if (!status.exists) {
            return (false, 0, "");
        }
        
        return (status.isCompliant, status.timestamp, status.commitment);
    }
    
    /**
     * @dev Check if a DID is compliant (simple boolean)
     * @param did The DID to check
     */
    function isCompliant(string memory did) external view returns (bool) {
        bytes32 didHash = keccak256(abi.encodePacked(did));
        return complianceStatuses[didHash].exists && complianceStatuses[didHash].isCompliant;
    }
    
    /**
     * @dev Revoke compliance status (in case of issues)
     * @param did The DID to revoke
     */
    function revokeCompliance(string memory did) external onlyIssuer {
        bytes32 didHash = keccak256(abi.encodePacked(did));
        require(complianceStatuses[didHash].exists, "DID not found");
        
        delete complianceStatuses[didHash];
        
        emit ComplianceVerified(didHash, did, false, "", block.timestamp);
    }
}
