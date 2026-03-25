// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./verifier.sol";

contract Groth16VerifierAdapter {
    Groth16Verifier public grothVerifier;

    event ProofChecked(bool valid);

    constructor() {
        grothVerifier = new Groth16Verifier();
    }

    function verifyProof(bytes memory proof, uint[] memory pubSignals)
        public
        view
        returns (bool)
    {
        require(pubSignals.length == 3, "Invalid number of public signals");
        require(proof.length == 256, "Invalid proof length");

        uint256[8] memory words;
        for (uint256 i = 0; i < 8; i++) {
            bytes32 part;
            assembly {
                part := mload(add(proof, add(32, mul(i, 32))))
            }
            words[i] = uint256(part);
        }

        uint256[2] memory pA;
        uint256[2][2] memory pB;
        uint256[2] memory pC;
        uint256[3] memory pSignals;

        pA[0] = words[0];
        pA[1] = words[1];

        pB[0][0] = words[2];
        pB[0][1] = words[3];
        pB[1][0] = words[4];
        pB[1][1] = words[5];

        pC[0] = words[6];
        pC[1] = words[7];

        pSignals[0] = pubSignals[0];
        pSignals[1] = pubSignals[1];
        pSignals[2] = pubSignals[2];

        return grothVerifier.verifyProof(pA, pB, pC, pSignals);
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
        return address(grothVerifier);
    }
}
