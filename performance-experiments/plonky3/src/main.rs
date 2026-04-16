use p3_air::{Air, AirBuilder, BaseAir};
use p3_matrix::Matrix;

pub struct ComplianceAir;

impl<F> BaseAir<F> for ComplianceAir {
    fn width(&self) -> usize {
        4
    }
}

impl<AB: AirBuilder> Air<AB> for ComplianceAir {
    fn eval(&self, builder: &mut AB) {
        let main = builder.main();
        let local = main.row_slice(0);
        let next = main.row_slice(1);

        let did = local[0];
        let status = local[1];
        let r = local[2];
        let commitment = local[3];

        let next_did = next[0];
        let next_status = next[1];
        let next_r = next[2];
        let next_commitment = next[3];

        // 1. status == 1
        builder.assert_eq(status, AB::Expr::from_canonical_u32(1));

        // 2. pseudo-poseidon constraint
        builder.assert_eq(commitment, did + status + r);

        // state transitions
        builder.when_transition().assert_eq(next_did, did);
        builder.when_transition().assert_eq(next_status, status);
        builder.when_transition().assert_eq(next_r, r);
        builder.when_transition().assert_eq(next_commitment, commitment);
    }
}

fn main() {
    tracing::info!("Initializing Plonky3 STARK Verifier");
    println!("Successfully initialized Plonky3 ComplianceAir constraints.");
}
