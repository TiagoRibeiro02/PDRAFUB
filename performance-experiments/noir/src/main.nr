fn main(did: pub Field, status: pub Field, commitment: pub Field, r: Field) {
    // Enforce status == 1 (KYC compliant)
    assert(status == 1);
    
    // Compute Poseidon hash of [DID, status, r]
    let computed_commitment = poseidon::poseidon::bn254::hash_3([did, status, r]);
    
    // Enforce equality: computed commitment must match the provided commitment
    assert(computed_commitment == commitment);
}
