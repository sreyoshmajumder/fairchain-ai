const hre = require("hardhat");
async function main() {
  const Factory = await hre.ethers.getContractFactory("FairChainAudit");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  const addr = await contract.getAddress();
  console.log("FairChainAudit deployed to:", addr);
  console.log("Add to .env: CONTRACT_ADDRESS=" + addr);
}
main().catch((e) => { console.error(e); process.exitCode = 1; });