// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IPlonkVerifier {
    function verifyProof(bytes memory proof, uint[] memory pubSignals) external view returns (bool);
}

/**
 * @title KYCCompliance
 * @dev Stores KYC/AML compliance status verified through zero-knowledge proofs.
 *      Public keys are stored on-chain as compressed secp256k1 keys (33 bytes):
 *      prefix parity (bool) packed with other bools in one storage slot +
 *      x-coordinate (bytes32) in a dedicated slot — minimising gas cost.
 */
contract KYCCompliance {
    IPlonkVerifier public verifier;
    address public admin;
    address public issuer;
    mapping(address => bool) public authorizedIssuers;

    /**
     * Storage layout (slots per entry):
     *   slot 0 – isCompliant (bool, 1 B) | exists (bool, 1 B) | pkParity (bool, 1 B)
     *   slot 1 – timestamp  (uint256, 32 B)
     *   slot 2 – expiryDate (uint256, 32 B)
     *   slot 3 – pkX        (bytes32, 32 B)  ← compressed-key x-coordinate
     *   slot 4+ – commitment (string, dynamic)
     *
     * Compressed public key reconstruction: prefix = pkParity ? 0x03 : 0x02
     *   fullKey = abi.encodePacked(prefix, pkX)  →  33 bytes
     */
    struct ComplianceStatus {
        bool isCompliant; // } packed together
        bool exists;      // } in one 32-byte
        bool pkParity;    // } storage slot
        uint256 timestamp;
        uint256 expiryDate;
        bytes32 pkX;          // x-coordinate of the compressed public key
        string commitment;    // zero-knowledge proof commitment
        string kycIssuer;     // DID/name of the entity that issued the KYC
    }

    // Mapping from DID hash to compliance status
    mapping(bytes32 => ComplianceStatus) public complianceStatuses;

    // Events
    event ComplianceVerified(
        bytes32 indexed didHash,
        string did,
        bool isCompliant,
        string commitment,
        uint256 timestamp,
        uint256 expiryDate
    );

    event PublicKeyRegistered(
        bytes32 indexed didHash,
        string did,
        bytes32 pkX,
        bool pkParity
    );

    event IssuerUpdated(address indexed oldIssuer, address indexed newIssuer);
    event IssuerAuthorizationUpdated(address indexed issuerAddress, bool authorized);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }
    
    modifier onlyAuthorizedIssuer() {
        require(authorizedIssuers[msg.sender], "Only authorized issuer can call this function");
        _;
    }
    
    constructor(address _verifierAddress) {
        verifier = IPlonkVerifier(_verifierAddress);
        admin = msg.sender;
        issuer = msg.sender;
        authorizedIssuers[msg.sender] = true;
        emit IssuerAuthorizationUpdated(msg.sender, true);
    }

    /**
     * @dev Authorize or revoke issuer wallets (entity addresses).
     */
    function setIssuerAuthorization(address issuerAddress, bool authorized) external onlyAdmin {
        require(issuerAddress != address(0), "Invalid issuer address");
        authorizedIssuers[issuerAddress] = authorized;
        emit IssuerAuthorizationUpdated(issuerAddress, authorized);
    }
    
    /**
     * @dev Update the issuer address
     */
    function updateIssuer(address newIssuer) external onlyAdmin {
        require(newIssuer != address(0), "Invalid issuer address");
        address oldIssuer = issuer;
        authorizedIssuers[oldIssuer] = false;
        emit IssuerAuthorizationUpdated(oldIssuer, false);

        issuer = newIssuer;
        authorizedIssuers[newIssuer] = true;
        emit IssuerAuthorizationUpdated(newIssuer, true);

        emit IssuerUpdated(oldIssuer, newIssuer);
    }
    
    /**
     * @dev Register or update an entity's compressed public key on-chain.
     *      Gas-efficient: the 33-byte compressed key is split into
     *      pkX (bytes32, 32 B x-coordinate) and pkParity (bool, 1 B prefix parity).
     *      Both are packed inside ComplianceStatus so no extra storage slot is used
     *      for the parity bit (it shares a slot with isCompliant and exists).
     * @param did   The entity's DID
     * @param pkX   The 32-byte x-coordinate of the compressed secp256k1 public key
     * @param pkParity  true → prefix 0x03 (odd y), false → prefix 0x02 (even y)
     */
    function registerPublicKey(
        string memory did,
        bytes32 pkX,
        bool pkParity
    ) external onlyAuthorizedIssuer {
        require(bytes(did).length > 0, "DID cannot be empty");
        require(pkX != bytes32(0), "Invalid public key");

        bytes32 didHash = keccak256(abi.encodePacked(did));
        complianceStatuses[didHash].pkX = pkX;
        complianceStatuses[didHash].pkParity = pkParity;
        // Mark as existing even if KYC has not been submitted yet
        complianceStatuses[didHash].exists = true;

        emit PublicKeyRegistered(didHash, did, pkX, pkParity);
    }

    /**
     * @dev Submit a zero-knowledge proof to verify KYC/AML compliance.
     *      Optionally binds a compressed public key (33 bytes) to the DID in the
     *      same transaction — pass pkX = bytes32(0) to skip key registration.
     * @param did          The user's DID (Decentralized Identifier)
     * @param commitment   The commitment from the zero-knowledge proof
     * @param kycIssuer    The DID or name of the entity issuing the KYC (e.g. did:zeroid:bank1)
     * @param expiryDate   Unix timestamp when this KYC verification expires
     * @param pkX          x-coordinate of compressed secp256k1 public key (0 to skip)
     * @param pkParity     true = prefix 0x03, false = prefix 0x02
     * @param proof        The PLONK proof data
     * @param publicSignals The public signals from the proof
     */
    function submitComplianceProof(
        string memory did,
        string memory commitment,
        string memory kycIssuer,
        uint256 expiryDate,
        bytes32 pkX,
        bool pkParity,
        bytes memory proof,
        uint[] memory publicSignals
    ) external onlyAuthorizedIssuer {
        require(bytes(did).length > 0, "DID cannot be empty");
        require(expiryDate > block.timestamp, "Expiry date must be in the future");

        // Verify the zero-knowledge proof
        bool isValid = verifier.verifyProof(proof, publicSignals);
        require(isValid, "Invalid zero-knowledge proof");

        bytes32 didHash = keccak256(abi.encodePacked(did));

        // Store compliance status (bools packed into one storage slot)
        complianceStatuses[didHash] = ComplianceStatus({
            isCompliant: true,
            exists:      true,
            pkParity:    pkParity,
            timestamp:   block.timestamp,
            expiryDate:  expiryDate,
            pkX:         pkX,
            commitment:  commitment,
            kycIssuer:   kycIssuer
        });

        emit ComplianceVerified(didHash, did, true, commitment, block.timestamp, expiryDate);

        if (pkX != bytes32(0)) {
            emit PublicKeyRegistered(didHash, did, pkX, pkParity);
        }
    }
    
    /**
     * @dev Check if a DID is KYC/AML compliant
     * @param did The DID to check
     * @return isCompliant Whether the DID is compliant
     * @return timestamp When the compliance was verified
     * @return expiryDate When the compliance expires
     * @return commitment The proof commitment
     * @return kycIssuer  The entity that issued the KYC
     */
    function checkCompliance(string memory did)
        external
        view
        returns (bool isCompliant, uint256 timestamp, uint256 expiryDate, string memory commitment, string memory kycIssuer)
    {
        bytes32 didHash = keccak256(abi.encodePacked(did));
        ComplianceStatus memory status = complianceStatuses[didHash];

        if (!status.exists) {
            return (false, 0, 0, "", "");
        }

        return (status.isCompliant, status.timestamp, status.expiryDate, status.commitment, status.kycIssuer);
    }

    /**
     * @dev Retrieve the compressed 33-byte public key associated with a DID.
     *      The key is reconstructed from the stored pkX (bytes32) and pkParity (bool).
     * @param did The DID to look up
     * @return pubKey 33-byte compressed secp256k1 public key, or empty bytes if not set
     */
    function getPublicKey(string memory did)
        external
        view
        returns (bytes memory pubKey)
    {
        bytes32 didHash = keccak256(abi.encodePacked(did));
        ComplianceStatus memory status = complianceStatuses[didHash];

        if (!status.exists || status.pkX == bytes32(0)) {
            return bytes("");
        }

        bytes1 prefix = status.pkParity ? bytes1(0x03) : bytes1(0x02);
        return abi.encodePacked(prefix, status.pkX); // 1 B + 32 B = 33 bytes
    }
    
    /**
     * @dev Check if a DID is compliant (simple boolean)
     * @param did The DID to check
     */
    function compliant(string memory did) external view returns (bool) {
        bytes32 didHash = keccak256(abi.encodePacked(did));
        return complianceStatuses[didHash].exists && complianceStatuses[didHash].isCompliant;
    }
    
    /**
     * @dev Revoke compliance status (in case of issues)
     * @param did The DID to revoke
     */
    function revokeCompliance(string memory did) external onlyAuthorizedIssuer {
        bytes32 didHash = keccak256(abi.encodePacked(did));
        require(complianceStatuses[didHash].exists, "DID not found");
        
        delete complianceStatuses[didHash];
        
        emit ComplianceVerified(didHash, did, false, "", block.timestamp, 0);
    }
}
