// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PlonkVerifier.sol";

/**
 * @title PlonkVerifierAdapter  
 * @dev Adapter contract to use the generated PLONK verifier with flexible input types
 */
contract PlonkVerifierAdapter {
    PlonkVerifier public plonkVerifier;
    
    constructor() {
        plonkVerifier = new PlonkVerifier();
    }
    
    /**
     * @dev Verify a PLONK proof with bytes and uint array inputs
     * @param proof The proof as bytes (will be decoded to uint256[24])
     * @param pubSignals The public signals as uint array (must be length 3)
     */
    function verifyProof(bytes memory proof, uint[] memory pubSignals) 
        public 
        view 
        returns (bool) 
    {
        require(pubSignals.length == 3, "Invalid number of public signals");
        require(proof.length == 768, "Invalid proof length"); // 24 * 32 bytes
        
        // Decode proof bytes to uint256[24]
        uint256[24] memory decodedProof;
        for (uint i = 0; i < 24; i++) {
            bytes32 part;
            assembly {
                part := mload(add(proof, add(32, mul(i, 32))))
            }
            decodedProof[i] = uint256(part);
        }
        
        // Convert pubSignals to uint256[3]
        uint256[3] memory convertedPubSignals;
        convertedPubSignals[0] = pubSignals[0];
        convertedPubSignals[1] = pubSignals[1];
        convertedPubSignals[2] = pubSignals[2];
        
        return plonkVerifier.verifyProof(decodedProof, convertedPubSignals);
    }
    
    /**
     * @dev Get the address of the underlying PLONK verifier
     */
    function getVerifierAddress() external view returns (address) {
        return address(plonkVerifier);
    }
}
