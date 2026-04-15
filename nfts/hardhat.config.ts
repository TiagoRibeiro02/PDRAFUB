import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL || "";
const privateKey = process.env.PRIVATE_KEY || "";
const normalizedPrivateKey = privateKey.trim().replace(/^0x/, "");
const hasValidSepoliaConfig =
  sepoliaRpcUrl.trim().length > 0 && /^[0-9a-fA-F]{64}$/.test(normalizedPrivateKey);

const sepoliaAccounts = hasValidSepoliaConfig
  ? [`0x${normalizedPrivateKey}`]
  : [];

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    hardhat: {
      chainId: 1337,
      blockGasLimit: 60_000_000
    },
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    sepolia: {
      url: sepoliaRpcUrl,
      chainId: 11155111,
      accounts: sepoliaAccounts
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};

export default config;
