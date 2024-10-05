import "dotenv/config";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

// Публичный RPC
const URL = 'https://mainnet.gateway.tenderly.co';
// Блок перед хаком
const blockNum = 16_817_995;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.27",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 1, // Добавляем chainId на уровне сети hardhat
      forking: {
        url: URL,
        blockNumber: blockNum, // Форк на блоке перед хаком
      },
    },
  },
};

export default config;
