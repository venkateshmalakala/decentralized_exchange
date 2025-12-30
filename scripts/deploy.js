const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  const tokenA = await MockERC20.deploy("Token A", "TKA");
  await tokenA.waitForDeployment();
  const tokenB = await MockERC20.deploy("Token B", "TKB");
  await tokenB.waitForDeployment();

  const DEX = await hre.ethers.getContractFactory("DEX");
  const dex = await DEX.deploy(tokenA.target, tokenB.target);
  await dex.waitForDeployment();

  console.log(`DEX deployed to: ${dex.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});