cd performance-experiments/noir

nargo compile
nargo execute

bb write_vk `
  -b ./target/kyc_circuit.json `
  -o ./target/vk/vk

bb prove `
  -b ./target/kyc_circuit.json `
  -w ./target/witness.gz `
  -k ./target/vk/vk `
  -o ./target/proof.bench `
  -t evm

bb verify `
  -k ./target/vk/vk `
  -p ./target/proof.bench/proof `
  -i ./target/proof.bench/public_inputs `
  -t evm

node convert-bench-files.js