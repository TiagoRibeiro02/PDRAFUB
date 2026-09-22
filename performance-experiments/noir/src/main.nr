fn main(
    did: pub Field,
    status: pub Field,
    commitment: pub Field,
    issuer: pub Field,
    expiry: pub Field,
    age: u8,
    pep_status: u8,
    sanctions_status: u8,
    risk_level: u8,
    r: Field,
) {
    // KYC/AML status must be compliant.
    assert(status == 1);

    // User must be an adult.
    assert(age >= 18);

    // User must not be a PEP.
    assert(pep_status == 0);

    // User must not have a sanctions match.
    assert(sanctions_status == 0);

    // Issuer must be non-zero.
    assert(issuer != 0);

    // Expiry must be non-zero.
    assert(expiry != 0);

    // Risk level must be between 0 and 100.
    assert(risk_level <= 100);

    // Compute the same Poseidon commitment as Circom.
    let computed_commitment = poseidon::poseidon::bn254::hash_9([
        did,
        status,
        issuer,
        expiry,
        age as Field,
        pep_status as Field,
        sanctions_status as Field,
        risk_level as Field,
        r,
    ]);

    // Enforce equality.
    assert(computed_commitment == commitment);
}
