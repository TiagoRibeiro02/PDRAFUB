fn main(
    did: pub Field,
    status: pub Field,
    commitment: pub Field,
    issuer: pub Field,
    expiry: pub Field,
    age: Field,
    pep_status: Field,
    sanctions_status: Field,
    risk_level: Field,
    r: Field,
) {
    // KYC/AML status must be compliant.
    assert(status == 1);

    // Match the compliance rules enforced by the Circom circuits.
    assert(age >= 18);
    assert(pep_status == 0);
    assert(sanctions_status == 0);
    assert(issuer > 0);
    assert(expiry > 0);
    assert(risk_level <= 100);

    // Compute the same Poseidon commitment as PLONK, FFLONK, and Groth16.
    let computed_commitment = poseidon::poseidon::bn254::hash_9([
        did,
        status,
        issuer,
        expiry,
        age,
        pep_status,
        sanctions_status,
        risk_level,
        r,
    ]);

    assert(computed_commitment == commitment);
}
