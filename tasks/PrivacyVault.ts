import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

/**
 * Example:
 *   - npx hardhat --network localhost task:address
 *   - npx hardhat --network sepolia task:address
 */
task("task:address", "Prints the PrivacyVault address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;

  const privacyVault = await deployments.get("PrivacyVault");

  console.log("PrivacyVault address is " + privacyVault.address);
});

/**
 * Example:
 *   - npx hardhat --network localhost task:create-db --name demo --key 123456789
 *   - npx hardhat --network sepolia task:create-db --name demo --key 123456789
 */
task("task:create-db", "Creates a database with encrypted key")
  .addParam("name", "Database name")
  .addParam("key", "Plaintext 9-digit key")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const keyValue = parseInt(taskArguments.key);
    if (!Number.isInteger(keyValue)) {
      throw new Error(`Argument --key is not an integer`);
    }

    await fhevm.initializeCLIApi();

    const deployment = await deployments.get("PrivacyVault");
    console.log(`PrivacyVault: ${deployment.address}`);

    const signers = await ethers.getSigners();
    const vault = await ethers.getContractAt("PrivacyVault", deployment.address);

    const encryptedInput = await fhevm
      .createEncryptedInput(deployment.address, signers[0].address)
      .add32(keyValue)
      .encrypt();

    const tx = await vault
      .connect(signers[0])
      .createDatabase(taskArguments.name, encryptedInput.handles[0], encryptedInput.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:decrypt-key --name demo
 *   - npx hardhat --network sepolia task:decrypt-key --name demo
 */
task("task:decrypt-key", "Decrypts the database key")
  .addParam("name", "Database name")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const deployment = await deployments.get("PrivacyVault");
    console.log(`PrivacyVault: ${deployment.address}`);

    const signers = await ethers.getSigners();
    const vault = await ethers.getContractAt("PrivacyVault", deployment.address);

    const encryptedKey = await vault.getDatabaseKey(signers[0].address, taskArguments.name);
    if (encryptedKey === ethers.ZeroHash) {
      console.log(`encrypted key: ${encryptedKey}`);
      console.log("clear key    : 0");
      return;
    }

    const clearKey = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedKey,
      deployment.address,
      signers[0],
    );
    console.log(`Encrypted key: ${encryptedKey}`);
    console.log(`Clear key    : ${clearKey}`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:add-entry --name demo --ciphertext "0xabc"
 */
task("task:add-entry", "Adds an encrypted entry to the database")
  .addParam("name", "Database name")
  .addParam("ciphertext", "Encrypted payload (string)")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const deployment = await deployments.get("PrivacyVault");
    console.log(`PrivacyVault: ${deployment.address}`);

    const signers = await ethers.getSigners();
    const vault = await ethers.getContractAt("PrivacyVault", deployment.address);

    const tx = await vault.connect(signers[0]).addEntry(taskArguments.name, taskArguments.ciphertext);
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:get-entries --name demo
 */
task("task:get-entries", "Reads encrypted entries from the database")
  .addParam("name", "Database name")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const deployment = await deployments.get("PrivacyVault");
    console.log(`PrivacyVault: ${deployment.address}`);

    const vault = await ethers.getContractAt("PrivacyVault", deployment.address);
    const signers = await ethers.getSigners();
    const entries = await vault.getEntries(signers[0].address, taskArguments.name);
    console.log(`Entries (${entries.length})`);
    for (const entry of entries) {
      console.log(entry);
    }
  });
