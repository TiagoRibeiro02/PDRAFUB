cd performance-experiments/halo2/circuit

cargo test
cargo run --release -- --bench-json
cargo run --release --bin halo2_evm_gas -- --bench-json