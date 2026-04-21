// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IRisc0Verifier {
    function verify(bytes calldata seal, bytes32 imageId, bytes32 journalDigest) external view;
}

/**
 * @dev Adapter that keeps the same verifyProof(bytes,uint[]) shape expected by KYCCompliance.
 * proof is abi.encode(bytes seal, bytes32 imageId, bytes32 journalDigest).
 */
contract Risc0VerifierAdapter {
    IRisc0Verifier public immutable verifier;

    constructor(address verifierAddress) {
        require(verifierAddress != address(0), "invalid verifier");
        verifier = IRisc0Verifier(verifierAddress);
    }

    function verifyProof(bytes memory proof, uint[] memory) public view returns (bool) {
        (bytes memory seal, bytes32 imageId, bytes32 journalDigest) = abi.decode(
            proof,
            (bytes, bytes32, bytes32)
        );
        verifier.verify(seal, imageId, journalDigest);
        return true;
    }

    function verifyProofTx(bytes memory proof, uint[] memory publicSignals) external view returns (bool) {
        return verifyProof(proof, publicSignals);
    }
}
