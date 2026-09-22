cd performance-experiments/noir

nargo compile
nargo execute

bb prove \
  -b ./target/kyc_circuit.json \
  -w ./target/kyc_circuit.gz \
  --write_vk \
  -o ./target

bb verify \
  -p ./target/proof \
  -k ./target/vk

node convert-bench-files.js