pragma circom 2.0.0;

include "circomlib/circuits/poseidon.circom";

template ComplianceProof() {

    // Public inputs
    signal input DID;          // user DID (hashed or numeric)
    signal input status;       // must be 1 (is compliant)
    signal input commitment;   // on-chain commitment (C=Poseidon(DID,status,r))

    // Private input
    signal input r;             // institution secret

    // Internal signal
    signal computedCommitment;

    // Enforce status == 1
    status === 1;

    // Poseidon hash
    component hash = Poseidon(3);
    hash.inputs[0] <== DID;
    hash.inputs[1] <== status;
    hash.inputs[2] <== r;

    computedCommitment <== hash.out;

    // Enforce equality
    computedCommitment === commitment;
}

component main {public [DID, status, commitment]} = ComplianceProof();
