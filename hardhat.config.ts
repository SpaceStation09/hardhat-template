import hardhatNetworkHelpers from "@nomicfoundation/hardhat-network-helpers";
import hardhatNodeTestRunner from "@nomicfoundation/hardhat-node-test-runner";
import hardhatViem from "@nomicfoundation/hardhat-viem";
import hardhatViemAssertions from "@nomicfoundation/hardhat-viem-assertions";
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
  plugins: [hardhatViem, hardhatViemAssertions, hardhatNodeTestRunner, hardhatNetworkHelpers],
  networks,
  solidity,
});

export default config;
