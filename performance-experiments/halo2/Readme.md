cd performance-experiments/halo2/circuit

cargo test
cargo run --release -- --bench-json
cargo run --release --bin halo2_evm_gas -- --bench-json

o comando cargo run --release --bin halo2_evm_gas usa o circuito definido em src/bin/halo2_evm_gas.rs. Se alterares apenas src/main.rs, isso afeta os testes e o benchmark MockProver, mas não necessariamente os artefactos EVM.