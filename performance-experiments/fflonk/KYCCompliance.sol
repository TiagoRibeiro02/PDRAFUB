// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IProofVerifier {
    function verifyProof(bytes memory proof, uint[] memory pubSignals) external view returns (bool);
}

contract KYCCompliance {
    IProofVerifier public verifier;
    address public admin;
    address public issuer;
    mapping(address => bool) public authorizedIssuers;

    struct ComplianceStatus {
        bool isCompliant;
        bool exists;
        bool pkParity;
        uint256 timestamp;
        uint256 expiryDate;
        bytes32 pkX;
        string commitment;
        string kycIssuer;
    }

    mapping(bytes32 => ComplianceStatus) public complianceStatuses;

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
        verifier = IProofVerifier(_verifierAddress);
        admin = msg.sender;
        issuer = msg.sender;
        authorizedIssuers[msg.sender] = true;
        emit IssuerAuthorizationUpdated(msg.sender, true);
    }

    function setIssuerAuthorization(address issuerAddress, bool authorized) external onlyAdmin {
        require(issuerAddress != address(0), "Invalid issuer address");
        authorizedIssuers[issuerAddress] = authorized;
        emit IssuerAuthorizationUpdated(issuerAddress, authorized);
    }

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
        complianceStatuses[didHash].exists = true;

        emit PublicKeyRegistered(didHash, did, pkX, pkParity);
    }

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

        bool isValid = verifier.verifyProof(proof, publicSignals);
        require(isValid, "Invalid zero-knowledge proof");

        bytes32 didHash = keccak256(abi.encodePacked(did));

        complianceStatuses[didHash] = ComplianceStatus({
            isCompliant: true,
            exists: true,
            pkParity: pkParity,
            timestamp: block.timestamp,
            expiryDate: expiryDate,
            pkX: pkX,
            commitment: commitment,
            kycIssuer: kycIssuer
        });

        emit ComplianceVerified(didHash, did, true, commitment, block.timestamp, expiryDate);

        if (pkX != bytes32(0)) {
            emit PublicKeyRegistered(didHash, did, pkX, pkParity);
        }
    }

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
        return abi.encodePacked(prefix, status.pkX);
    }

    function compliant(string memory did) external view returns (bool) {
        bytes32 didHash = keccak256(abi.encodePacked(did));
        return complianceStatuses[didHash].exists && complianceStatuses[didHash].isCompliant;
    }

    function revokeCompliance(string memory did) external onlyAuthorizedIssuer {
        bytes32 didHash = keccak256(abi.encodePacked(did));
        require(complianceStatuses[didHash].exists, "DID not found");

        delete complianceStatuses[didHash];

        emit ComplianceVerified(didHash, did, false, "", block.timestamp, 0);
    }
}
