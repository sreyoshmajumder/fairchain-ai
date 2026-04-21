require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    amoy: {
      url: process.env.POLYGON_RPC_URL || "https://rpc-amoy.polygon.technology/",
      accounts: process.env.SIGNER_PRIVATE_KEY ? [process.env.SIGNER_PRIVATE_KEY] : [],
      chainId: 80002
    }
  }
};