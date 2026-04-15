use std::convert::TryInto;
use std::marker::PhantomData;

use halo2_gadgets::poseidon::{
    Hash,
    Pow5Chip,
    Pow5Config,
    primitives::{ConstantLength, P128Pow5T3 as OrchardNullifier},
};
use halo2_proofs::{
    circuit::{Layouter, SimpleFloorPlanner, Value},
    dev::MockProver,
    pasta::Fp,
    plonk::{Circuit, Column, ConstraintSystem, Error, Expression, Instance, Selector},
    poly::Rotation,
};

const WIDTH: usize = 3;
const RATE: usize = 2;
const L: usize = 3;

#[derive(Clone, Debug)]
struct ComplianceConfig {
    poseidon: Pow5Config<Fp, WIDTH, RATE>,
    state: [Column<halo2_proofs::plonk::Advice>; WIDTH],
    instance: Column<Instance>,
    status_is_one: Selector,
}

#[derive(Clone, Debug)]
struct ComplianceCircuit {
    did: Value<Fp>,
    status: Value<Fp>,
    r: Value<Fp>,
    _marker: PhantomData<OrchardNullifier>,
}

impl Circuit<Fp> for ComplianceCircuit {
    type Config = ComplianceConfig;
    type FloorPlanner = SimpleFloorPlanner;

    fn without_witnesses(&self) -> Self {
        Self {
            did: Value::unknown(),
            status: Value::unknown(),
            r: Value::unknown(),
            _marker: PhantomData,
        }
    }

    fn configure(meta: &mut ConstraintSystem<Fp>) -> Self::Config {
        let state = (0..WIDTH).map(|_| meta.advice_column()).collect::<Vec<_>>();
        let state: [Column<halo2_proofs::plonk::Advice>; WIDTH] =
            state.try_into().expect("state width");
        let partial_sbox = meta.advice_column();
        let rc_a = (0..WIDTH).map(|_| meta.fixed_column()).collect::<Vec<_>>();
        let rc_b = (0..WIDTH).map(|_| meta.fixed_column()).collect::<Vec<_>>();
        meta.enable_constant(rc_b[0]);

        let poseidon = Pow5Chip::configure::<OrchardNullifier>(
            meta,
            state,
            partial_sbox,
            rc_a.try_into().expect("rc_a width"),
            rc_b.try_into().expect("rc_b width"),
        );

        let instance = meta.instance_column();
        meta.enable_equality(instance);

        let status_is_one = meta.selector();
        meta.create_gate("status == 1", |meta| {
            let s = meta.query_selector(status_is_one);
            let status = meta.query_advice(state[1], Rotation::cur());
            vec![s * (status - Expression::Constant(Fp::from(1)))]
        });

        Self::Config {
            poseidon,
            state,
            instance,
            status_is_one,
        }
    }

    fn synthesize(
        &self,
        config: Self::Config,
        mut layouter: impl Layouter<Fp>,
    ) -> Result<(), Error> {
        let [did_cell, status_cell, r_cell] = layouter.assign_region(
            || "load compliance inputs",
            |mut region| {
                config.status_is_one.enable(&mut region, 0)?;

                let did_cell = region.assign_advice(|| "did", config.state[0], 0, || self.did)?;
                let status_cell =
                    region.assign_advice(|| "status", config.state[1], 0, || self.status)?;
                let r_cell = region.assign_advice(|| "r", config.state[2], 0, || self.r)?;

                Ok([did_cell, status_cell, r_cell])
            },
        )?;

        let message: [_; L] = [did_cell.clone(), status_cell.clone(), r_cell];
        let chip = Pow5Chip::construct(config.poseidon.clone());
        let hasher =
            Hash::<_, _, OrchardNullifier, ConstantLength<L>, WIDTH, RATE>::init(
                chip,
                layouter.namespace(|| "poseidon init"),
            )?;
        let commitment_cell = hasher.hash(layouter.namespace(|| "poseidon hash"), message)?;

        // Public inputs: [did, status, commitment]
        layouter.constrain_instance(did_cell.cell(), config.instance, 0)?;
        layouter.constrain_instance(status_cell.cell(), config.instance, 1)?;
        layouter.constrain_instance(commitment_cell.cell(), config.instance, 2)
    }
}

fn native_commitment(did: Fp, status: Fp, r: Fp) -> Fp {
    halo2_gadgets::poseidon::primitives::Hash::<
        _,
        OrchardNullifier,
        ConstantLength<L>,
        WIDTH,
        RATE,
    >::init()
    .hash([did, status, r])
}

fn main() {
    let did = Fp::from(12_345);
    let status = Fp::from(1);
    let r = Fp::from(6_789);
    let commitment = native_commitment(did, status, r);

    let circuit = ComplianceCircuit {
        did: Value::known(did),
        status: Value::known(status),
        r: Value::known(r),
        _marker: PhantomData,
    };

    let public_inputs = vec![vec![did, status, commitment]];
    let prover = MockProver::run(9, &circuit, public_inputs).expect("mock prover should run");
    assert_eq!(prover.verify(), Ok(()));

    println!("Halo2 compliance circuit verified successfully.");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_valid_input() {
        let did = Fp::from(111);
        let status = Fp::from(1);
        let r = Fp::from(222);
        let commitment = native_commitment(did, status, r);

        let circuit = ComplianceCircuit {
            did: Value::known(did),
            status: Value::known(status),
            r: Value::known(r),
            _marker: PhantomData,
        };

        let prover = MockProver::run(9, &circuit, vec![vec![did, status, commitment]])
            .expect("mock prover should run");
        assert_eq!(prover.verify(), Ok(()));
    }

    #[test]
    fn rejects_invalid_status() {
        let did = Fp::from(111);
        let bad_status = Fp::from(0);
        let r = Fp::from(222);
        let commitment = native_commitment(did, bad_status, r);

        let circuit = ComplianceCircuit {
            did: Value::known(did),
            status: Value::known(bad_status),
            r: Value::known(r),
            _marker: PhantomData,
        };

        let prover = MockProver::run(9, &circuit, vec![vec![did, bad_status, commitment]])
            .expect("mock prover should run");
        assert!(prover.verify().is_err());
    }

    #[test]
    fn rejects_invalid_commitment() {
        let did = Fp::from(111);
        let status = Fp::from(1);
        let r = Fp::from(222);
        let wrong_commitment = Fp::from(123_456);

        let circuit = ComplianceCircuit {
            did: Value::known(did),
            status: Value::known(status),
            r: Value::known(r),
            _marker: PhantomData,
        };

        let prover = MockProver::run(9, &circuit, vec![vec![did, status, wrong_commitment]])
            .expect("mock prover should run");
        assert!(prover.verify().is_err());
    }
}
