// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./verifier.sol";

contract FflonkVerifierAdapter {
    FflonkVerifier public fflonkVerifier;

    event ProofChecked(bool valid);

    constructor() {
        fflonkVerifier = new FflonkVerifier();
    }

    function verifyProof(bytes memory proof, uint[] memory pubSignals)
        public
        view
        returns (bool)
    {
        require(pubSignals.length == 5, "Invalid number of public signals");
        require(proof.length == 768, "Invalid proof length");

        bytes32[24] memory decodedProof;
        for (uint256 i = 0; i < 24; i++) {
            bytes32 part;
            assembly {
                part := mload(add(proof, add(32, mul(i, 32))))
            }
            decodedProof[i] = part;
        }

        uint256[5] memory convertedPubSignals;
        for (uint256 i = 0; i < 5; i++) {
            convertedPubSignals[i] = pubSignals[i];
        }

        return fflonkVerifier.verifyProof(decodedProof, convertedPubSignals);
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
        return address(fflonkVerifier);
    }
}
