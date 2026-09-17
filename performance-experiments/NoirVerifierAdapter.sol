// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "./Verifier.sol";

contract NoirVerifierAdapter {
    HonkVerifier public honkVerifier;

    event ProofChecked(bool valid);

    constructor(address verifierAddress) {
        require(verifierAddress != address(0), "Invalid verifier address");
        honkVerifier = HonkVerifier(verifierAddress);
    }

    function verifyProof(bytes memory proof, uint[] memory pubSignals)
        public
        view
        returns (bool)
    {
        require(pubSignals.length == 3, "Invalid number of public signals (expected 3 for Noir)");

        // Convert uint[] to bytes32[]
        bytes32[] memory publicInputs = new bytes32[](pubSignals.length);
        for (uint256 i = 0; i < pubSignals.length; i++) {
            publicInputs[i] = bytes32(pubSignals[i]);
        }

        return honkVerifier.verify(proof, publicInputs);
    }

    function verifyProofTx(bytes memory proof, uint[] memory pubSignals)
        external
        returns (bool)
    {
        bool valid = verifyProof(proof, pubSignals);
        emit ProofChecked(valid);
        return valid;
    }

    function getVerifierAddress() external view returns (address) {
        return address(honkVerifier);
    }
}
