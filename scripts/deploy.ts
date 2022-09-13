import { ethers, upgrades } from "hardhat";

async function main() {
  const GameFactory = await ethers.getContractFactory("RPGGame");

  console.log("Deploying The RPGGame...");
  const contract = await upgrades.deployProxy(GameFactory, [], {
    initializer: "initialize",
  });

  await contract.deployed();
  console.log("Contract deployed to:", contract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
