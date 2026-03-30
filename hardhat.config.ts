import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { defineConfig } from "hardhat/config";
import {
  getHardhatNetworkConfig,
  HardhatGasReporterConfig,
  HardhatSolidityConfig,
} from "./SmartContractProjectConfig/config.js";

let networks = getHardhatNetworkConfig();
let solidity = HardhatSolidityConfig;
solidity.version = "0.8.24";
void HardhatGasReporterConfig;

const config = defineConfig({
  plugins: [hardhatToolboxMochaEthers],
  networks,
  solidity,
  typechain: {
    outDir: "types",
    alwaysGenerateOverloads: false,
  },
});

export default config;
