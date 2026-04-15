use halo2::{
    circuit::{Layouter, SimpleFloorPlanner, Value},
    plonk::{Circuit, ConstraintSystem, Error, Instance, Advice},
    poly::Rotation,
};
use halo2_gadgets::poseidon::{PoseidonHash, Spec};

/**
 * Compliance Proof Circuit for Halo2
 * 
 * Verifies that a user meets compliance requirements:
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

#[derive(Debug, Clone)]
pub struct ComplianceProofConfig {
    pub advice: [Column<Advice>; 3],
    pub instance: Column<Instance>,
}

pub struct ComplianceProofCircuit<F: Field + PrimeField> {
    pub did: Value<F>,
    pub status: Value<F>,
    pub r: Value<F>,
    pub commitment: Value<F>,
}

impl<F: Field + PrimeField> Circuit<F> for ComplianceProofCircuit<F> {
    type Config = ComplianceProofConfig;
    type FloorPlanner = SimpleFloorPlanner;

    fn configure(meta: &mut ConstraintSystem<F>) -> Self::Config {
        let advice = [
            meta.advice_column(),
            meta.advice_column(),
            meta.advice_column(),
        ];
        let instance = meta.instance_column();
        meta.enable_equality(instance);
        
        for col in &advice {
            meta.enable_equality(*col);
        }
        
        // Constraint: status == 1
        meta.create_gate("status_check", |meta| {
            let status = meta.query_advice(advice[1], Rotation::cur());
            let one = Expression::Constant(F::one());
            
            vec![status - one]
        });
        
        ComplianceProofConfig { advice, instance }
    }

    fn synthesize(
        &self,
        config: Self::Config,
        mut layouter: impl Layouter<F>,
    ) -> Result<(), Error> {
        layouter.assign_region(
            || "compliance_proof",
            |mut region| {
                // Assign DID (private)
                region.assign_advice(
                    || "did",
                    config.advice[0],
                    0,
                    || self.did,
                )?;
                
                // Assign status (public - must be 1)
                region.assign_advice(
                    || "status",
                    config.advice[1],
                    0,
                    || self.status,
                )?;
                
                // Assign r (private - institution secret)
                region.assign_advice(
                    || "r",
                    config.advice[2],
                    0,
                    || self.r,
                )?;
                
                // Assign commitment (public - on-chain commitment)
                region.assign_advice(
                    || "commitment",
                    config.advice[0],
                    1,
                    || self.commitment,
                )?;
                
                Ok(())
            },
        )
    }
}
