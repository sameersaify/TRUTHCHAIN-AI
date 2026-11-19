import { ethers, network } from "hardhat";
import * as fs from "fs";

async function main() {
  const [deployer] = await ethers.getSigners();
  const admin = process.env.ADMIN_ADDRESS || deployer.address;
  console.log("Network:", network.name, "| deployer:", deployer.address, "| admin:", admin);

  const reg = await ethers.deployContract("TruthChainRegistry", [admin]);
  await reg.waitForDeployment();
  const address = await reg.getAddress();
  console.log("TruthChainRegistry deployed at:", address);

  // Granting the registrar role works only if the deployer IS the admin.
  if (process.env.REGISTRAR_ADDRESS && admin.toLowerCase() === deployer.address.toLowerCase()) {
    const tx = await reg.grantRole(await reg.REGISTRAR_ROLE(), process.env.REGISTRAR_ADDRESS);
    await tx.wait();
    console.log("REGISTRAR_ROLE granted to", process.env.REGISTRAR_ADDRESS);
  } else {
    console.log("Next: have the admin call grantRole(REGISTRAR_ROLE, <backend registrar address>).");
  }

  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  fs.mkdirSync("deployments", { recursive: true });
  fs.writeFileSync(`deployments/${network.name}.json`,
    JSON.stringify({ address, chainId, admin, deployedAt: new Date().toISOString() }, null, 2));
  console.log("Saved deployments/" + network.name + ".json. Put the address in backend/.env as CONTRACT_ADDRESS.");
}

main().catch((e) => { console.error(e); process.exit(1); });
