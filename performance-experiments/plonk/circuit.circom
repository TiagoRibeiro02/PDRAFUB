pragma circom 2.0.0;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";

template ComplianceProof() {

    // Public inputs
    signal input DID;
    signal input status;
    signal input commitment;
    signal input issuer;
    signal input expiry;

    // Private inputs
    signal input age;
    signal input pepStatus;
    signal input sanctionsStatus;
    signal input riskLevel;
    signal input r;

    // Internal signal
    signal computedCommitment;

    // KYC/AML status must be compliant
    status === 1;

    // User must be an adult
    component adultCheck = GreaterEqThan(8);
    adultCheck.in[0] <== age;
    adultCheck.in[1] <== 18;
    adultCheck.out === 1;

    // User must not be a PEP
    pepStatus === 0;

    // User must not have a sanctions match
    sanctionsStatus === 0;

    // Issuer must be a non-zero address represented as a field element
    component issuerCheck = GreaterThan(160);
    issuerCheck.in[0] <== issuer;
    issuerCheck.in[1] <== 0;
    issuerCheck.out === 1;

    // Expiry must be a non-zero timestamp
    component expiryCheck = GreaterThan(64);
    expiryCheck.in[0] <== expiry;
    expiryCheck.in[1] <== 0;
    expiryCheck.out === 1;

    // Risk level must be between 0 and 100
    component riskLevelCheck = LessEqThan(8);
    riskLevelCheck.in[0] <== riskLevel;
    riskLevelCheck.in[1] <== 100;
    riskLevelCheck.out === 1;

    // Poseidon hash
    component hash = Poseidon(9);
    hash.inputs[0] <== DID;
    hash.inputs[1] <== status;
    hash.inputs[2] <== issuer;
    hash.inputs[3] <== expiry;
    hash.inputs[4] <== age;
    hash.inputs[5] <== pepStatus;
    hash.inputs[6] <== sanctionsStatus;
    hash.inputs[7] <== riskLevel;
    hash.inputs[8] <== r;

    computedCommitment <== hash.out;

    // Enforce equality
    computedCommitment === commitment;
}

component main {public [DID, status, commitment, issuer, expiry]} = ComplianceProof();
