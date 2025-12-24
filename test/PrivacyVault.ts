import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { PrivacyVault, PrivacyVault__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("PrivacyVault")) as PrivacyVault__factory;
  const vault = (await factory.deploy()) as PrivacyVault;
  const vaultAddress = await vault.getAddress();

  return { vault, vaultAddress };
}

describe("PrivacyVault", function () {
  let signers: Signers;
  let vault: PrivacyVault;
  let vaultAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ vault, vaultAddress } = await deployFixture());
  });

  it("creates a database and decrypts the key", async function () {
    const dbName = "alpha";
    const key = 123456789;

    const encryptedInput = await fhevm
      .createEncryptedInput(vaultAddress, signers.alice.address)
      .add32(key)
      .encrypt();

    const tx = await vault.connect(signers.alice).createDatabase(dbName, encryptedInput.handles[0], encryptedInput.inputProof);
    await tx.wait();

    const info = await vault.getDatabaseInfo(signers.alice.address, dbName);
    expect(info[0]).to.eq(signers.alice.address);
    expect(info[1]).to.eq(0);
    expect(info[2]).to.eq(true);

    const encryptedKey = await vault.getDatabaseKey(signers.alice.address, dbName);
    const clearKey = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedKey,
      vaultAddress,
      signers.alice,
    );

    expect(clearKey).to.eq(key);
  });

  it("adds an encrypted entry as the owner", async function () {
    const dbName = "beta";
    const key = 987654321;

    const encryptedInput = await fhevm
      .createEncryptedInput(vaultAddress, signers.alice.address)
      .add32(key)
      .encrypt();

    await (await vault.connect(signers.alice).createDatabase(dbName, encryptedInput.handles[0], encryptedInput.inputProof)).wait();

    await (await vault.connect(signers.alice).addEntry(dbName, "ciphertext-1")).wait();

    const entries = await vault.getEntries(signers.alice.address, dbName);
    expect(entries.length).to.eq(1);
    expect(entries[0]).to.eq("ciphertext-1");
  });

  it("rejects entries from non-owners", async function () {
    const dbName = "gamma";
    const key = 111222333;

    const encryptedInput = await fhevm
      .createEncryptedInput(vaultAddress, signers.alice.address)
      .add32(key)
      .encrypt();

    await (await vault.connect(signers.alice).createDatabase(dbName, encryptedInput.handles[0], encryptedInput.inputProof)).wait();

    await expect(vault.connect(signers.bob).addEntry(dbName, "ciphertext-2"))
      .to.be.revertedWithCustomError(vault, "NotDatabaseOwner")
      .withArgs(signers.bob.address);
  });

  it("prevents duplicate database names", async function () {
    const dbName = "delta";
    const key = 222333444;

    const encryptedInput = await fhevm
      .createEncryptedInput(vaultAddress, signers.alice.address)
      .add32(key)
      .encrypt();

    await (await vault.connect(signers.alice).createDatabase(dbName, encryptedInput.handles[0], encryptedInput.inputProof)).wait();

    await expect(
      vault.connect(signers.alice).createDatabase(dbName, encryptedInput.handles[0], encryptedInput.inputProof),
    )
      .to.be.revertedWithCustomError(vault, "DatabaseAlreadyExists")
      .withArgs(dbName);
  });
});
