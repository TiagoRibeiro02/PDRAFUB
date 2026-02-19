# NFT Display Example

## Setup

### 1. Install Dependencies

Install Hardhat dependencies:
```bash
npm install
```

Install frontend dependencies:
```bash
cd frontend
npm install
cd ..
```

### 2. Start Local Blockchain

Start a Hardhat local node (keep this running in a separate terminal):
```bash
npm run node
```

This will start a local Ethereum network at `http://127.0.0.1:8545` and display 20 test accounts with private keys.

### 3. Deploy Smart Contract

In a new terminal, deploy the NFT contract:
```bash
npm run deploy
```

This will:
- Deploy the MyNFT contract to the local network
- Save the contract address to `frontend/src/contracts/contract-address.json`
- Save the contract ABI to `frontend/src/contracts/MyNFT.json`

### 4. Mint Sample NFTs

Mint some sample NFTs to the first test account:
```bash
npm run mint
```

This will mint 5 different NFTs with sample metadata.

### 5. Configure MetaMask

1. Open MetaMask and add a new network:
   - **Network Name:** Localhost 8545
   - **RPC URL:** http://127.0.0.1:8545
   - **Chain ID:** 1337
   - **Currency Symbol:** ETH

2. Import one of the test accounts from the Hardhat node output:
   - Click "Import Account"
   - Paste one of the private keys shown when you started the node
   - This account will have test ETH and the minted NFTs

### 6. Start Frontend

```bash
npm run dev
```

The React app will open at `http://localhost:3000`

## Usage

1. Click "Connect Wallet" to connect MetaMask
2. Approve the connection in MetaMask
3. Your NFTs will automatically load and display in the gallery
4. Hover over NFT cards to see the animation effect


## Development Scripts

- `npm run compile` - Compile smart contracts
- `npm run deploy` - Deploy to local network
- `npm run mint` - Mint sample NFTs
- `npm run node` - Start local Hardhat node
- `npm run test` - Run smart contract tests
- `npm run dev` - Start React development server

## License

MIT
