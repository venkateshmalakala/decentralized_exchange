const hre = require("hardhat");

async function main() {
  // 1. Deploy two Mock Tokens first
  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  
  const tokenX = await MockERC20.deploy("Token X", "TKX");
  await tokenX.waitForDeployment();
  console.log(`Token X deployed to: ${await tokenX.getAddress()}`);

  const tokenY = await MockERC20.deploy("Token Y", "TKY");
  await tokenY.waitForDeployment();
  console.log(`Token Y deployed to: ${await tokenY.getAddress()}`);

  // 2. Deploy the DEX
  const DEX = await hre.ethers.getContractFactory("DEX");
  const dex = await DEX.deploy(await tokenX.getAddress(), await tokenY.getAddress());
  await dex.waitForDeployment();
  console.log(`DEX deployed to: ${await dex.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});