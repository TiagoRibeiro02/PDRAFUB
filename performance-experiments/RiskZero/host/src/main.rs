use std::{fs, path::PathBuf, time::Instant};

use methods::{METHOD_ELF, METHOD_ID};
use risc0_zkvm::{default_prover, ExecutorEnv, ProverOpts, Receipt};

fn hex_encode(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(bytes.len() * 2 + 2);
    out.push_str("0x");
    for byte in bytes {
        out.push_str(&format!("{:02x}", byte));
    }
    out
}

fn write_benchmark_artifacts(
    proof_path: &PathBuf,
    public_path: &PathBuf,
    input: u32,
    output: u32,
    receipt: &Receipt,
) {
    let groth16 = receipt.inner.groth16().unwrap();
    let proof_json = serde_json::json!({
        "protocol": "RISC0",
        "receiptKind": "Groth16",
        "sealHex": hex_encode(&groth16.seal),
        "sealSize": groth16.seal_size(),
    });
    fs::write(proof_path, serde_json::to_string_pretty(&proof_json).unwrap()).unwrap();

    let journal_bytes = receipt.journal.bytes.clone();
    let public_json = serde_json::json!({
        "protocol": "RISC0",
        "input": input,
        "output": output,
        "imageIdWords": METHOD_ID,
        "imageId": format!("{:?}", METHOD_ID),
        "journalBytesHex": hex_encode(&journal_bytes),
        "sealSize": receipt.seal_size(),
    });
    fs::write(public_path, serde_json::to_string_pretty(&public_json).unwrap()).unwrap();
}

fn main() {
    let bench_json = std::env::args().any(|arg| arg == "--bench-json");

    // Initialize tracing. In order to view logs, run `RUST_LOG=info cargo run`
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::filter::EnvFilter::from_default_env())
        .init();

    // An executor environment describes the configurations for the zkVM
    // including program inputs.
    // A default ExecutorEnv can be created like so:
    // `let env = ExecutorEnv::builder().build().unwrap();`
    // However, this `env` does not have any inputs.
    //
    // To add guest input to the executor environment, use
    // ExecutorEnvBuilder::write().
    // To access this method, you'll need to use ExecutorEnv::builder(), which
    // creates an ExecutorEnvBuilder. When you're done adding input, call
    // ExecutorEnvBuilder::build().

    // For example:
    let input: u32 = 42;
    let output: u32 = input.saturating_mul(2).saturating_add(1);
    let env = ExecutorEnv::builder()
        .write(&input)
        .unwrap()
        .build()
        .unwrap();

    // Obtain the default prover.
    let prover = default_prover();

    let proof_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../proofs");
    fs::create_dir_all(&proof_dir).unwrap();
    let proof_path = proof_dir.join("proof.bench.json");
    let public_path = proof_dir.join("public.bench.json");

    let proof_start = Instant::now();

    // Proof information by proving the specified ELF binary.
    // This struct contains the receipt along with statistics about execution of the guest
    let prove_info = match prover.prove_with_opts(env, METHOD_ELF, &ProverOpts::groth16()) {
        Ok(info) => info,
        Err(err) => {
            let err_msg = err.to_string();
            let oom_hint = if err_msg.contains("Some(137)") {
                "\nDetected Docker exit code 137 (likely OOM kill). Groth16 proving usually needs significantly more RAM (often ~16GB+)."
            } else {
                ""
            };
            panic!(
                "RISC0 Groth16 proving failed: {err}\n{oom_hint}\n\nHint: ensure Docker is running and your user can run docker commands. \
Try: `docker run --rm hello-world` and then rerun benchmark."
            );
        }
    };

    // extract the receipt.
    let receipt = prove_info.receipt;

    let proof_generation_ms = proof_start.elapsed().as_secs_f64() * 1000.0;

    let decoded_output: u32 = receipt.journal.decode().unwrap();

    let verify_start = Instant::now();
    receipt.verify(METHOD_ID).unwrap();
    let verification_ms = verify_start.elapsed().as_secs_f64() * 1000.0;

    write_benchmark_artifacts(&proof_path, &public_path, input, decoded_output, &receipt);

    if bench_json {
        println!(
            "BENCHMARK_TIMINGS_JSON={{\"protocol\":\"RISC0\",\"proofGenerationMs\":{:.4},\"verificationMs\":{:.4}}}",
            proof_generation_ms, verification_ms
        );
    } else {
        println!("RISC0 proof generated: input={input}, output={output}, decoded_output={decoded_output}");
    }
}
