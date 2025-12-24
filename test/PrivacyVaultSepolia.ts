import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { PrivacyVault } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  alice: HardhatEthersSigner;
};

describe("PrivacyVaultSepolia", function () {
  let signers: Signers;
  let vault: PrivacyVault;
  let vaultAddress: string;
  let step: number;
  let steps: number;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const deployment = await deployments.get("PrivacyVault");
      vaultAddress = deployment.address;
      vault = await ethers.getContractAt("PrivacyVault", deployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[0] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("creates a database and decrypts the key", async function () {
    steps = 9;
    this.timeout(4 * 40000);

    const dbName = `vault-${Date.now()}`;
    const keyValue = 123456789;

    progress("Encrypting key...");
    const encryptedKey = await fhevm
      .createEncryptedInput(vaultAddress, signers.alice.address)
      .add32(keyValue)
      .encrypt();

    progress(`Creating database ${dbName}...`);
    let tx = await vault
      .connect(signers.alice)
      .createDatabase(dbName, encryptedKey.handles[0], encryptedKey.inputProof);
    await tx.wait();

    progress(`Reading encrypted key...`);
    const keyHandle = await vault.getDatabaseKey(signers.alice.address, dbName);
    expect(keyHandle).to.not.eq(ethers.ZeroHash);

    progress(`Decrypting key...`);
    const clearKey = await fhevm.userDecryptEuint(FhevmType.euint32, keyHandle, vaultAddress, signers.alice);
    expect(clearKey).to.eq(keyValue);

    progress("Adding encrypted entry...");
    tx = await vault.connect(signers.alice).addEntry(dbName, "ciphertext-sepolia");
    await tx.wait();

    progress("Reading entries...");
    const entries = await vault.getEntries(signers.alice.address, dbName);
    expect(entries.length).to.eq(1);
  });
});
