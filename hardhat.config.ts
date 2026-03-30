import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { defineConfig } from "hardhat/config";
import {
  getHardhatNetworkConfig,
  HardhatGasReporterConfig,
  HardhatSolidityConfig,
} from "./SmartContractProjectConfig/config";

let networks = getHardhatNetworkConfig();
let solidity = HardhatSolidityConfig;
solidity.version = "0.8.24";
const gasReporter = HardhatGasReporterConfig;

const config = defineConfig({
  plugins: [hardhatToolboxMochaEthers],
  networks,
  solidity,
  gasReporter,
  typechain: {
    outDir: "types",
    target: "ethers-v6",
    alwaysGenerateOverloads: false,
  },
});

export default config;
