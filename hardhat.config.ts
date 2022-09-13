import * as dotenv from "dotenv";

import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@openzeppelin/hardhat-upgrades";
import "@typechain/hardhat";
import "@typechain/ethers-v5";
import "hardhat-gas-reporter";
import "solidity-coverage";
// import 'solidity-docgen';

dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.4",
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "BRL",
  },
};

export default config;
