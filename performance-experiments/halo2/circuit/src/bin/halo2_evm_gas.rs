use halo2_base::utils::fs::gen_srs;
use snark_verifier_sdk::evm::{encode_calldata, gen_evm_proof_shplonk, gen_evm_verifier_sol_code};
use halo2_base::halo2_proofs::{
    circuit::{Layouter, SimpleFloorPlanner, Value},
    halo2curves::bn256::Fr,
    plonk::{Advice, Circuit, Column, ConstraintSystem, Error, Expression, Instance, Selector},
    poly::Rotation,
};
use snark_verifier_sdk::{CircuitExt, gen_pk};
use std::fs::{create_dir_all, write};
use std::path::Path;

#[derive(Clone, Debug)]
struct ComplianceConfig {
    advice: [Column<Advice>; 4],
    instance: Column<Instance>,
    s_row: Selector,
}

#[derive(Clone, Debug)]
struct ComplianceEvmCircuit {
    did: Fr,
    status: Fr,
    r: Fr,
    commitment: Fr,
}

impl ComplianceEvmCircuit {
    fn with_values(did: Fr, status: Fr, r: Fr, commitment: Fr) -> Self {
        Self {
            did,
            status,
            r,
            commitment,
        }
    }
}

impl Circuit<Fr> for ComplianceEvmCircuit {
    type Config = ComplianceConfig;
    type FloorPlanner = SimpleFloorPlanner;
    type Params = ();

    fn without_witnesses(&self) -> Self {
        Self {
            did: Fr::from(0),
            status: Fr::from(0),
            r: Fr::from(0),
            commitment: Fr::from(0),
        }
    }

    fn configure(meta: &mut ConstraintSystem<Fr>) -> Self::Config {
        let advice = [
            meta.advice_column(),
            meta.advice_column(),
            meta.advice_column(),
            meta.advice_column(),
        ];
        let instance = meta.instance_column();
        let s_row = meta.selector();

        for col in advice {
            meta.enable_equality(col);
        }
        meta.enable_equality(instance);

        // Enforce:
        // 1) status == 1
        // 2) did + status + r - commitment == 0
        meta.create_gate("compliance constraints", |meta| {
            let s = meta.query_selector(s_row);
            let did = meta.query_advice(advice[0], Rotation::cur());
            let status = meta.query_advice(advice[1], Rotation::cur());
            let r = meta.query_advice(advice[2], Rotation::cur());
            let commitment = meta.query_advice(advice[3], Rotation::cur());

            vec![
                s.clone() * (status.clone() - Expression::Constant(Fr::from(1))),
                s * (did + status + r - commitment),
            ]
        });

        ComplianceConfig {
            advice,
            instance,
            s_row,
        }
    }

    fn synthesize(
        &self,
        config: Self::Config,
        mut layouter: impl Layouter<Fr>,
    ) -> Result<(), Error> {
        let (did_cell, status_cell, commitment_cell) = layouter.assign_region(
            || "assign compliance row",
            |mut region| {
                config.s_row.enable(&mut region, 0)?;

                let did_cell = region.assign_advice(config.advice[0], 0, Value::known(self.did));
                let status_cell =
                    region.assign_advice(config.advice[1], 0, Value::known(self.status));
                region.assign_advice(config.advice[2], 0, Value::known(self.r));
                let commitment_cell = region.assign_advice(
                    config.advice[3],
                    0,
                    Value::known(self.commitment),
                );

                Ok((did_cell, status_cell, commitment_cell))
            },
        )?;

        layouter.constrain_instance(did_cell.cell(), config.instance, 0);
        layouter.constrain_instance(status_cell.cell(), config.instance, 1);
        layouter.constrain_instance(commitment_cell.cell(), config.instance, 2);
        Ok(())
    }
}

impl CircuitExt<Fr> for ComplianceEvmCircuit {
    fn num_instance(&self) -> Vec<usize> {
        vec![3]
    }

    fn instances(&self) -> Vec<Vec<Fr>> {
        vec![vec![self.did, self.status, self.commitment]]
    }
}

fn main() {
    let bench_json = std::env::args().any(|arg| arg == "--bench-json");

    let did_u64 = 12_345u64;
    let status_u64 = 1u64;
    let r_u64 = 6_789u64;
    let commitment_u64 = did_u64 + status_u64 + r_u64;

    let did = Fr::from(did_u64);
    let status = Fr::from(status_u64);
    let r = Fr::from(r_u64);
    let commitment = Fr::from(commitment_u64);

    let circuit = ComplianceEvmCircuit::with_values(did, status, r, commitment);
    let instances = circuit.instances();

    // Keep k modest so benchmark runs in practical time.
    let params = gen_srs(12);
    let pk = gen_pk(&params, &circuit, None);

    let proof = gen_evm_proof_shplonk(&params, &pk, circuit.clone(), instances.clone());
    let verifier_sol = gen_evm_verifier_sol_code::<ComplianceEvmCircuit, snark_verifier_sdk::SHPLONK>(
        &params,
        pk.get_vk(),
        vec![3],
    );
    let calldata = encode_calldata(&instances, &proof);

    let artifacts_dir = Path::new("../artifacts");
    create_dir_all(artifacts_dir).expect("failed to create artifacts dir");
    let sol_path = artifacts_dir.join("Halo2ComplianceVerifier.sol");
    write(&sol_path, &verifier_sol).expect("failed to write verifier solidity");

    let sol_abs = sol_path
        .canonicalize()
        .unwrap_or(sol_path.clone())
        .to_string_lossy()
        .to_string();

    let bench_payload = format!(
        "{{\n  \"protocol\": \"HALO2\",\n  \"verifierSolidityPath\": \"{}\",\n  \"publicSignals\": [\"{}\", \"{}\", \"{}\"],\n  \"proofHex\": \"0x{}\",\n  \"calldataHex\": \"0x{}\"\n}}",
        sol_abs,
        did_u64,
        status_u64,
        commitment_u64,
        hex::encode(&proof),
        hex::encode(&calldata)
    );
    let json_path = artifacts_dir.join("halo2-evm-bench.json");
    write(&json_path, &bench_payload).expect("failed to write bench json");

    if bench_json {
        println!("BENCHMARK_HALO2_ARTIFACT_JSON={}", bench_payload.replace('\n', ""));
        return;
    }

    println!(
        "Generated HALO2 EVM artifacts at: {}",
        json_path
            .canonicalize()
            .unwrap_or(json_path)
            .to_string_lossy()
    );
}
