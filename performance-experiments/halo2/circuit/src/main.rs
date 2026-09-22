use std::convert::TryInto;
use std::marker::PhantomData;

use halo2_gadgets::poseidon::{
    Hash,
    Pow5Chip,
    Pow5Config,
    primitives::{ConstantLength, P128Pow5T3 as OrchardNullifier},
};
use halo2_proofs::{
    arithmetic::Field,
    circuit::{Layouter, SimpleFloorPlanner, Value},
    dev::MockProver,
    pasta::Fp,
    plonk::{Circuit, Column, ConstraintSystem, Error, Expression, Instance, Selector},
    poly::Rotation,
};
use std::time::Instant;

const WIDTH: usize = 3;
const RATE: usize = 2;
const L: usize = 9;

#[derive(Clone, Debug)]
struct ComplianceConfig {
    poseidon: Pow5Config<Fp, WIDTH, RATE>,
    state: [Column<halo2_proofs::plonk::Advice>; WIDTH],
    instance: Column<Instance>,
    status_is_one: Selector,
    pep_is_zero: Selector,
    sanctions_is_zero: Selector,
    issuer_is_nonzero: Selector,
    expiry_is_nonzero: Selector,
    issuer_inverse: Column<halo2_proofs::plonk::Advice>,
    expiry_inverse: Column<halo2_proofs::plonk::Advice>,
}

#[derive(Clone, Debug)]
struct ComplianceCircuit {
    did: Value<Fp>,
    status: Value<Fp>,
    issuer: Value<Fp>,
    expiry: Value<Fp>,
    age: Value<Fp>,
    pep_status: Value<Fp>,
    sanctions_status: Value<Fp>,
    risk_level: Value<Fp>,
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
            issuer: Value::unknown(),
            expiry: Value::unknown(),
            age: Value::unknown(),
            pep_status: Value::unknown(),
            sanctions_status: Value::unknown(),
            risk_level: Value::unknown(),
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
        let issuer_inverse = meta.advice_column();
        let expiry_inverse = meta.advice_column();
        meta.enable_equality(issuer_inverse);
        meta.enable_equality(expiry_inverse);

        let status_is_one = meta.selector();
        meta.create_gate("status == 1", |meta| {
            let s = meta.query_selector(status_is_one);
            let status = meta.query_advice(state[1], Rotation::cur());
            vec![s * (status - Expression::Constant(Fp::from(1)))]
        });

        let pep_is_zero = meta.selector();
        meta.create_gate("pep status == 0", |meta| {
            let s = meta.query_selector(pep_is_zero);
            let pep_status = meta.query_advice(state[2], Rotation::cur());
            vec![s * pep_status]
        });

        let sanctions_is_zero = meta.selector();
        meta.create_gate("sanctions status == 0", |meta| {
            let s = meta.query_selector(sanctions_is_zero);
            let sanctions_status = meta.query_advice(state[0], Rotation::cur());
            vec![s * sanctions_status]
        });

        let issuer_is_nonzero = meta.selector();
        meta.create_gate("issuer != 0", |meta| {
            let s = meta.query_selector(issuer_is_nonzero);
            let issuer = meta.query_advice(state[2], Rotation::cur());
            let inverse = meta.query_advice(issuer_inverse, Rotation::cur());
            vec![s * (issuer * inverse - Expression::Constant(Fp::from(1)))]
        });

        let expiry_is_nonzero = meta.selector();
        meta.create_gate("expiry != 0", |meta| {
            let s = meta.query_selector(expiry_is_nonzero);
            let expiry = meta.query_advice(state[0], Rotation::cur());
            let inverse = meta.query_advice(expiry_inverse, Rotation::cur());
            vec![s * (expiry * inverse - Expression::Constant(Fp::from(1)))]
        });

        Self::Config {
            poseidon,
            state,
            instance,
            status_is_one,
            pep_is_zero,
            sanctions_is_zero,
            issuer_is_nonzero,
            expiry_is_nonzero,
            issuer_inverse,
            expiry_inverse,
        }
    }

    fn synthesize(
        &self,
        config: Self::Config,
        mut layouter: impl Layouter<Fp>,
    ) -> Result<(), Error> {
        let [did_cell, status_cell, issuer_cell, expiry_cell, age_cell, pep_cell, sanctions_cell, risk_cell, r_cell] = layouter.assign_region(
            || "load compliance inputs",
            |mut region| {
                config.status_is_one.enable(&mut region, 0)?;
                config.issuer_is_nonzero.enable(&mut region, 0)?;
                config.expiry_is_nonzero.enable(&mut region, 1)?;
                config.pep_is_zero.enable(&mut region, 1)?;
                config.sanctions_is_zero.enable(&mut region, 2)?;

                let did_cell = region.assign_advice(|| "did", config.state[0], 0, || self.did)?;
                let status_cell =
                    region.assign_advice(|| "status", config.state[1], 0, || self.status)?;
                let issuer_cell =
                    region.assign_advice(|| "issuer", config.state[2], 0, || self.issuer)?;
                let expiry_cell =
                    region.assign_advice(|| "expiry", config.state[0], 1, || self.expiry)?;
                let age_cell = region.assign_advice(|| "age", config.state[1], 1, || self.age)?;
                let pep_cell = region.assign_advice(
                    || "pep status",
                    config.state[2],
                    1,
                    || self.pep_status,
                )?;
                let sanctions_cell = region.assign_advice(
                    || "sanctions status",
                    config.state[0],
                    2,
                    || self.sanctions_status,
                )?;
                let risk_cell =
                    region.assign_advice(|| "risk level", config.state[1], 2, || self.risk_level)?;
                let r_cell = region.assign_advice(|| "r", config.state[2], 2, || self.r)?;

                region.assign_advice(
                    || "issuer inverse",
                    config.issuer_inverse,
                    0,
                    || self.issuer.map(|value| value.invert().unwrap_or(Fp::zero())),
                )?;
                region.assign_advice(
                    || "expiry inverse",
                    config.expiry_inverse,
                    1,
                    || self.expiry.map(|value| value.invert().unwrap_or(Fp::zero())),
                )?;

                self.age.map(|value| assert!(value >= Fp::from(18)));
                self.risk_level.map(|value| assert!(value <= Fp::from(100)));

                Ok([
                    did_cell,
                    status_cell,
                    issuer_cell,
                    expiry_cell,
                    age_cell,
                    pep_cell,
                    sanctions_cell,
                    risk_cell,
                    r_cell,
                ])
            },
        )?;

        let message: [_; L] = [
            did_cell.clone(),
            status_cell.clone(),
            issuer_cell.clone(),
            expiry_cell.clone(),
            age_cell,
            pep_cell,
            sanctions_cell,
            risk_cell,
            r_cell,
        ];
        let chip = Pow5Chip::construct(config.poseidon.clone());
        let hasher =
            Hash::<_, _, OrchardNullifier, ConstantLength<L>, WIDTH, RATE>::init(
                chip,
                layouter.namespace(|| "poseidon init"),
            )?;
        let commitment_cell = hasher.hash(layouter.namespace(|| "poseidon hash"), message)?;

        // Public inputs: [did, status, commitment, issuer, expiry]
        layouter.constrain_instance(did_cell.cell(), config.instance, 0)?;
        layouter.constrain_instance(status_cell.cell(), config.instance, 1)?;
        layouter.constrain_instance(commitment_cell.cell(), config.instance, 2)?;
        layouter.constrain_instance(issuer_cell.cell(), config.instance, 3)?;
        layouter.constrain_instance(expiry_cell.cell(), config.instance, 4)
    }
}

fn native_commitment(
    did: Fp,
    status: Fp,
    issuer: Fp,
    expiry: Fp,
    age: Fp,
    pep_status: Fp,
    sanctions_status: Fp,
    risk_level: Fp,
    r: Fp,
) -> Fp {
    halo2_gadgets::poseidon::primitives::Hash::<
        _,
        OrchardNullifier,
        ConstantLength<L>,
        WIDTH,
        RATE,
    >::init()
    .hash([
        did,
        status,
        issuer,
        expiry,
        age,
        pep_status,
        sanctions_status,
        risk_level,
        r,
    ])
}

fn main() {
    let bench_json = std::env::args().any(|arg| arg == "--bench-json");

    let did = Fp::from(12_345);
    let status = Fp::from(1);
    let issuer = Fp::from(111);
    let expiry = Fp::from(1_893_456_000u64);
    let age = Fp::from(25);
    let pep_status = Fp::from(0);
    let sanctions_status = Fp::from(0);
    let risk_level = Fp::from(50);
    let r = Fp::from(6_789);
    let commitment = native_commitment(
        did,
        status,
        issuer,
        expiry,
        age,
        pep_status,
        sanctions_status,
        risk_level,
        r,
    );

    let circuit = ComplianceCircuit {
        did: Value::known(did),
        status: Value::known(status),
        issuer: Value::known(issuer),
        expiry: Value::known(expiry),
        age: Value::known(age),
        pep_status: Value::known(pep_status),
        sanctions_status: Value::known(sanctions_status),
        risk_level: Value::known(risk_level),
        r: Value::known(r),
        _marker: PhantomData,
    };

    let public_inputs = vec![vec![did, status, commitment, issuer, expiry]];
    let prove_start = Instant::now();
    let prover = MockProver::run(10, &circuit, public_inputs).expect("mock prover should run");
    let proof_generation_ms = prove_start.elapsed().as_secs_f64() * 1000.0;

    let verify_start = Instant::now();
    let verify_result = prover.verify();
    let verification_ms = verify_start.elapsed().as_secs_f64() * 1000.0;
    assert_eq!(verify_result, Ok(()));

    if bench_json {
        println!(
            "BENCHMARK_TIMINGS_JSON={{\"protocol\":\"HALO2\",\"proofGenerationMs\":{:.4},\"verificationMs\":{:.4}}}",
            proof_generation_ms,
            verification_ms
        );
        return;
    }

    println!("Halo2 compliance circuit verified successfully.");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_valid_input() {
        let did = Fp::from(111);
        let status = Fp::from(1);
        let issuer = Fp::from(222);
        let expiry = Fp::from(1_893_456_000u64);
        let age = Fp::from(25);
        let pep_status = Fp::from(0);
        let sanctions_status = Fp::from(0);
        let risk_level = Fp::from(50);
        let r = Fp::from(222);
        let commitment = native_commitment(
            did,
            status,
            issuer,
            expiry,
            age,
            pep_status,
            sanctions_status,
            risk_level,
            r,
        );

        let circuit = ComplianceCircuit {
            did: Value::known(did),
            status: Value::known(status),
            issuer: Value::known(issuer),
            expiry: Value::known(expiry),
            age: Value::known(age),
            pep_status: Value::known(pep_status),
            sanctions_status: Value::known(sanctions_status),
            risk_level: Value::known(risk_level),
            r: Value::known(r),
            _marker: PhantomData,
        };

        let prover = MockProver::run(10, &circuit, vec![vec![did, status, commitment, issuer, expiry]])
            .expect("mock prover should run");
        assert_eq!(prover.verify(), Ok(()));
    }

    #[test]
    fn rejects_invalid_status() {
        let did = Fp::from(111);
        let bad_status = Fp::from(0);
        let issuer = Fp::from(222);
        let expiry = Fp::from(1_893_456_000u64);
        let age = Fp::from(25);
        let pep_status = Fp::from(0);
        let sanctions_status = Fp::from(0);
        let risk_level = Fp::from(50);
        let r = Fp::from(222);
        let commitment = native_commitment(
            did,
            bad_status,
            issuer,
            expiry,
            age,
            pep_status,
            sanctions_status,
            risk_level,
            r,
        );

        let circuit = ComplianceCircuit {
            did: Value::known(did),
            status: Value::known(bad_status),
            issuer: Value::known(issuer),
            expiry: Value::known(expiry),
            age: Value::known(age),
            pep_status: Value::known(pep_status),
            sanctions_status: Value::known(sanctions_status),
            risk_level: Value::known(risk_level),
            r: Value::known(r),
            _marker: PhantomData,
        };

        let prover = MockProver::run(10, &circuit, vec![vec![did, bad_status, commitment, issuer, expiry]])
            .expect("mock prover should run");
        assert!(prover.verify().is_err());
    }

    #[test]
    fn rejects_invalid_commitment() {
        let did = Fp::from(111);
        let status = Fp::from(1);
        let issuer = Fp::from(222);
        let expiry = Fp::from(1_893_456_000u64);
        let age = Fp::from(25);
        let pep_status = Fp::from(0);
        let sanctions_status = Fp::from(0);
        let risk_level = Fp::from(50);
        let r = Fp::from(222);
        let wrong_commitment = Fp::from(123_456);

        let circuit = ComplianceCircuit {
            did: Value::known(did),
            status: Value::known(status),
            issuer: Value::known(issuer),
            expiry: Value::known(expiry),
            age: Value::known(age),
            pep_status: Value::known(pep_status),
            sanctions_status: Value::known(sanctions_status),
            risk_level: Value::known(risk_level),
            r: Value::known(r),
            _marker: PhantomData,
        };

        let prover = MockProver::run(10, &circuit, vec![vec![did, status, wrong_commitment, issuer, expiry]])
            .expect("mock prover should run");
        assert!(prover.verify().is_err());
    }
}
