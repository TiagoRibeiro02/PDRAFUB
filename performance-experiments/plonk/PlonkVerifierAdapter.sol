// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Verifier.sol";

contract PlonkVerifierAdapter {
    PlonkVerifier public plonkVerifier;

    event ProofChecked(bool valid);

    constructor() {
        plonkVerifier = new PlonkVerifier();
    }

    function verifyProof(bytes memory proof, uint[] memory pubSignals)
        public
        view
        returns (bool)
    {
        require(pubSignals.length == 5, "Invalid number of public signals");
        require(proof.length == 768, "Invalid proof length");

        uint256[24] memory decodedProof;
        for (uint256 i = 0; i < 24; i++) {
            bytes32 part;
            assembly {
                part := mload(add(proof, add(32, mul(i, 32))))
            }
            decodedProof[i] = uint256(part);
        }

        uint256[5] memory convertedPubSignals;
        for (uint256 i = 0; i < 5; i++) {
            convertedPubSignals[i] = pubSignals[i];
        }

        return plonkVerifier.verifyProof(decodedProof, convertedPubSignals);
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
        return address(plonkVerifier);
    }
}
