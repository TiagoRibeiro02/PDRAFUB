const hre = require("hardhat");
const { ethers } = hre;
const fs = require("fs");
const path = require("path");
const solc = require("solc");

function loadEnvFromNfts() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      continue;
    }

    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['\"]|['\"]$/g, "");
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function ensureTestnetEnv() {
  loadEnvFromNfts();

  if (!process.env.SEPOLIA_RPC_URL || !process.env.PRIVATE_KEY) {
    throw new Error(
      "Missing testnet env vars. Set SEPOLIA_RPC_URL and PRIVATE_KEY before running benchmarks."
    );
  }

  const normalizedKey = process.env.PRIVATE_KEY.trim().replace(/^0x/, "");
  if (!/^[0-9a-fA-F]{64}$/.test(normalizedKey)) {
    throw new Error(
      "Invalid PRIVATE_KEY in nfts/.env. It must be a 32-byte hex key (64 hex chars), optionally prefixed with 0x."
    );
  }
}

function gasOf(txPromise) {
  return txPromise.then((tx) => tx.wait().then((receipt) => receipt.gasUsed));
}

function compileSignedComplianceArtifact() {
  const source = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SignedKYCCompliance {
    address public admin;
    address public issuer;
    mapping(address => bool) public authorizedIssuers;

    struct ComplianceStatus {
        bool isCompliant;
        bool exists;
        uint256 timestamp;
        uint256 expiryDate;
        bytes32 messageHash;
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

    event SignedCredentialVerified(
        bytes32 indexed didHash,
        string did,
        string kycIssuer,
        bytes32 messageHash
    );

    event IssuerUpdated(address indexed oldIssuer, address indexed newIssuer);
    event IssuerAuthorizationUpdated(address indexed issuerAddress, bool authorized);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }

    constructor() {
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

    function verifySignedCredential(
        string memory did,
        string memory commitment,
        string memory kycIssuer,
        uint256 expiryDate,
        bytes32 messageHash,
        bytes memory signature
    ) external {
      _verifySignature(did, expiryDate, messageHash, signature);
        bytes32 didHash = keccak256(bytes(did));
        emit SignedCredentialVerified(didHash, did, kycIssuer, messageHash);
    }

    function submitSignedComplianceCredential(
        string memory did,
        string memory commitment,
        string memory kycIssuer,
        uint256 expiryDate,
        bytes32 messageHash,
        bytes memory signature
    ) external {
        _verifySignature(did, expiryDate, messageHash, signature);

        bytes32 didHash = keccak256(bytes(did));
        complianceStatuses[didHash] = ComplianceStatus({
            isCompliant: true,
            exists: true,
            timestamp: block.timestamp,
            expiryDate: expiryDate,
            messageHash: messageHash,
            commitment: commitment,
            kycIssuer: kycIssuer
        });

        emit ComplianceVerified(didHash, did, true, commitment, block.timestamp, expiryDate);
    }

    function checkCompliance(string memory did)
        external
        view
        returns (bool isCompliant, uint256 timestamp, uint256 expiryDate, string memory commitment, string memory kycIssuer)
    {
        bytes32 didHash = keccak256(bytes(did));
        ComplianceStatus memory status = complianceStatuses[didHash];

        if (!status.exists) {
            return (false, 0, 0, "", "");
        }

        return (status.isCompliant, status.timestamp, status.expiryDate, status.commitment, status.kycIssuer);
    }

    function _verifySignature(
        string memory did,
        uint256 expiryDate,
        bytes32 messageHash,
        bytes memory signature
    ) internal view returns (address recovered) {
        require(bytes(did).length > 0, "DID cannot be empty");
        require(expiryDate > block.timestamp, "Expiry date must be in the future");
        require(signature.length == 65, "Invalid signature length");

        bytes32 digest = _toEthSignedMessageHash(messageHash);
        recovered = _recover(digest, signature);
        require(authorizedIssuers[recovered], "Invalid credential signature");
    }

    function _toEthSignedMessageHash(bytes32 hash) internal pure returns (bytes32) {
      return keccak256(abi.encodePacked(bytes1(0x19), "Ethereum Signed Message:\\n32", hash));
    }

    function _recover(bytes32 digest, bytes memory signature) internal pure returns (address) {
        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 0x20))
            s := mload(add(signature, 0x40))
            v := byte(0, mload(add(signature, 0x60)))
        }

        if (v < 27) {
            v += 27;
        }

        require(v == 27 || v == 28, "Invalid signature v value");
        return ecrecover(digest, v, r, s);
    }
}
`;

  const input = {
    language: "Solidity",
    sources: {
      "SignedKYCCompliance.sol": { content: source },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object"],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  if (output.errors) {
    const errors = output.errors.filter((e) => e.severity === "error");
    if (errors.length > 0) {
      throw new Error(errors.map((e) => e.formattedMessage).join("\n"));
    }
  }

  const artifact = output.contracts?.["SignedKYCCompliance.sol"]?.SignedKYCCompliance;
  if (!artifact) {
    throw new Error("Could not compile SignedKYCCompliance");
  }

  return {
    abi: artifact.abi,
    bytecode: `0x${artifact.evm.bytecode.object}`,
  };
}

async function main() {
  ensureTestnetEnv();

  const signers = await ethers.getSigners();
  const deployer = signers[0];
  if (!deployer) {
    throw new Error("No signer available. Check PRIVATE_KEY and network RPC configuration.");
  }

  const issuerDid = "did:zeroid:issuer-benchmark";
  const did = "did:zeroid:signed-bench";

  const artifact = compileSignedComplianceArtifact();
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer);
  const deployTx = await factory.deploy();
  await deployTx.waitForDeployment();
  const kyc = deployTx;

  const timestamp = Date.now();
  const expiryDate = Math.floor(Date.now() / 1000) + 86400;
  const credentialMessage = [
    "ZeroID signed KYC/AML credential",
    `DID: ${did}`,
    `Issuer: ${issuerDid}`,
    `Timestamp: ${timestamp}`,
    `Expiry: ${expiryDate}`,
  ].join("\n");
  const messageHash = ethers.keccak256(ethers.toUtf8Bytes(credentialMessage));
  const commitment = messageHash;

  const signStart = process.hrtime.bigint();
  const signature = await deployer.signMessage(ethers.getBytes(messageHash));
  const signEnd = process.hrtime.bigint();
  const proofGenerationMs = Number((Number(signEnd - signStart) / 1_000_000).toFixed(2));

  const verifyStart = process.hrtime.bigint();
  const txVerify = await kyc.verifySignedCredential(
    did,
    commitment,
    issuerDid,
    expiryDate,
    messageHash,
    signature
  );
  const rcVerify = await txVerify.wait();
  const verifyEnd = process.hrtime.bigint();
  const verificationMs = Number((Number(verifyEnd - verifyStart) / 1_000_000).toFixed(2));

  const txSubmit = await kyc.submitSignedComplianceCredential(
    did,
    commitment,
    issuerDid,
    expiryDate,
    messageHash,
    signature
  );
  const rcSubmit = await txSubmit.wait();

  const results = {
    generatedAt: new Date().toISOString(),
    network: await ethers.provider.getNetwork().then((n) => n.name),
    timings: {
      protocol: "SIGNED",
      proofGenerationMs,
      verificationMs,
    },
    gas: {
      generatedAt: new Date().toISOString(),
      results: [
        {
          protocol: "SIGNED",
          contract: await kyc.getAddress(),
          issuerDid,
          verifyProofTxGas: rcVerify.gasUsed.toString(),
          submitComplianceProofGas: rcSubmit.gasUsed.toString(),
        },
      ],
    },
  };

  console.log("=== SIGNED CREDENTIAL BENCHMARK ===");
  console.log(JSON.stringify(results, null, 2));
  console.log(`BENCHMARK_TIMINGS_JSON=${JSON.stringify(results.timings)}`);
  console.log(`BENCHMARK_GAS_JSON=${JSON.stringify(results.gas)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});