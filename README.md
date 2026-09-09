# PDRAFUB - Decentralized Identity & NFT System

cd nfts
npm install
cd frontend
npm install
cd ../..

for dir in zeroid-entity zeroid-wallet zeroid-3P zeroid-issuer; do
  cd "$dir"
  npm install
  cd ..
done

./start-all.sh
./stop-all.sh

NFT gas, local
Terminal 1:

cd nfts
npm install
npm run node

Terminal 2:
npm run compile
npm run benchmark:nft-gas:local

NFT gas na Sepolia:
cd performance-experiments
node benchmark-nft-gas.mjs

Benchmark completo de ZKP:
cd performance-experiments/halo2/circuit
cargo build --release
cargo run --release --bin halo2_evm_gas -- --bench-json

cd performance-experiments:
node benchmark-zkp.mjs