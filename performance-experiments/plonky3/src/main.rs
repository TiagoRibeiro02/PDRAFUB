use plonky3::circuit::{Circuit, CircuitBuilder};
use plonky3::field::Field;
use plonky3::hash::poseidon::Poseidon;

/**
 * Compliance Proof Circuit - converted from PLONK/FFLONK
 * 
 * This circuit verifies that a user meets compliance requirements:
 * - DID: user's decentralized identifier (public)
 * - status: compliance status, must be 1 (public)
 * - commitment: on-chain commitment C = Poseidon(DID, status, r) (public)
 * - r: institution secret (private)
 * 
 * Constraints:
 * 1. status === 1
 * 2. computedCommitment = Poseidon(DID, status, r)
 * 3. computedCommitment === commitment
 */
fn main() {
    // Create a new circuit
    let mut builder = CircuitBuilder::new();
    
    // Define public inputs
    let did = builder.add_input();           // Public: DID
    let status = builder.add_input();        // Public: status (must be 1)
    let commitment = builder.add_input();    // Public: on-chain commitment
    
    // Define private input
    let r = builder.add_input();             // Private: institution secret
    
    // Constraint 1: Enforce status == 1
    let one = builder.add_constant(Field::from(1));
    builder.assert_equal(status, one);
    
    // Constraint 2: Compute Poseidon hash of [DID, status, r]
    let poseidon = Poseidon::new();
    let mut hash_input = vec![did, status, r];
    let computed_commitment = poseidon.hash(&mut builder, &hash_input);
    
    // Constraint 3: Enforce computed_commitment == commitment
    builder.assert_equal(computed_commitment, commitment);
    
    // Register outputs (optional, for auxiliary information)
    builder.register_output(computed_commitment);
    
    // Build the circuit
    let circuit = builder.build();
    
    // Example: Generate a proof with test inputs
    // DID = 12345 (example user identifier)
    // status = 1 (compliant)
    // r = 6789 (institution secret)
    // commitment = Poseidon(12345, 1, 6789)
    
    let did_value = Field::from(12345u64);
    let status_value = Field::from(1u64);
    let r_value = Field::from(6789u64);
    
    // Compute commitment offline
    let hasher = Poseidon::new();
    let commitment_value = hasher.hash_many(&[did_value, status_value, r_value]);
    
    let inputs = vec![did_value, status_value, commitment_value, r_value];
    let proof = circuit.prove(&inputs);
    
    // Verify the proof
    assert!(circuit.verify(&proof));
    println!("Compliance proof verified successfully!");
    println!("  DID: {}", did_value);
    println!("  Status: {} (compliant)", status_value);
    println!("  Commitment: {}", commitment_value);
}
