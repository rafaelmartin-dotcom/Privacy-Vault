import { useEffect, useMemo, useState } from "react";
import { Contract } from "ethers";
import { useAccount, usePublicClient } from "wagmi";
import { Header } from "./Header";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "../config/contracts";
import { useEthersSigner } from "../hooks/useEthersSigner";
import { useZamaInstance } from "../hooks/useZamaInstance";
import { decryptWithKey, encryptWithKey, generateNineDigitKey } from "../utils/crypto";
import "../styles/VaultApp.css";

type EntryView = {
  ciphertext: string;
  plaintext?: string;
};

export function VaultApp() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const signerPromise = useEthersSigner();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();
  const isContractConfigured = true;

  const [createName, setCreateName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<number | null>(null);
  const [createStatus, setCreateStatus] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [unlockName, setUnlockName] = useState("");
  const [decryptedKey, setDecryptedKey] = useState<string>("");
  const [decryptStatus, setDecryptStatus] = useState("");
  const [isDecrypting, setIsDecrypting] = useState(false);

  const [entryDatabase, setEntryDatabase] = useState("");
  const [entryText, setEntryText] = useState("");
  const [entryCiphertext, setEntryCiphertext] = useState("");
  const [entryStatus, setEntryStatus] = useState("");
  const [isSavingEntry, setIsSavingEntry] = useState(false);

  const [entries, setEntries] = useState<EntryView[]>([]);
  const [entriesStatus, setEntriesStatus] = useState("");
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);

  const [databases, setDatabases] = useState<string[]>([]);
  const [databasesStatus, setDatabasesStatus] = useState("");
  const [isLoadingDatabases, setIsLoadingDatabases] = useState(false);

  const hasKey = decryptedKey !== "";
  const keyNumber = useMemo(() => (hasKey ? Number(decryptedKey) : null), [decryptedKey, hasKey]);

  useEffect(() => {
    if (unlockName) {
      setEntryDatabase(unlockName);
    }
  }, [unlockName]);

  const generateKey = () => {
    const key = generateNineDigitKey();
    setGeneratedKey(key);
    setCreateStatus("Generated a new 9-digit key. Save it securely.");
  };

  const decryptHandle = async (handle: string): Promise<string> => {
    if (!instance || !address || !signerPromise) {
      throw new Error("Missing encryption dependencies");
    }

    const keypair = instance.generateKeypair();
    const handleContractPairs = [{ handle, contractAddress: CONTRACT_ADDRESS }];
    const startTimeStamp = Math.floor(Date.now() / 1000).toString();
    const durationDays = "10";
    const contractAddresses = [CONTRACT_ADDRESS];

    const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);
    const signer = await signerPromise;
    if (!signer) {
      throw new Error("Signer not available");
    }

    const signature = await signer.signTypedData(
      eip712.domain,
      { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
      eip712.message,
    );

    const result = await instance.userDecrypt(
      handleContractPairs,
      keypair.privateKey,
      keypair.publicKey,
      signature.replace("0x", ""),
      contractAddresses,
      address,
      startTimeStamp,
      durationDays,
    );

    const clearValue = result[handle] as string | undefined;
    if (!clearValue) {
      throw new Error("Decryption returned empty result");
    }

    return clearValue;
  };

  const loadDatabases = async () => {
    if (!isContractConfigured) {
      setDatabasesStatus("Set the contract address before loading databases.");
      return;
    }

    if (!publicClient || !address) {
      setDatabasesStatus("Connect your wallet to load databases.");
      return;
    }

    setIsLoadingDatabases(true);
    setDatabasesStatus("");
    try {
      const data = (await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "getOwnerDatabases",
        args: [address],
      })) as string[];

      setDatabases(data);
      if (!data.length) {
        setDatabasesStatus("No databases found for this wallet.");
      }
    } catch (error) {
      console.error("Failed to load databases:", error);
      setDatabasesStatus("Failed to load databases.");
    } finally {
      setIsLoadingDatabases(false);
    }
  };

  const handleCreateDatabase = async () => {
    if (!isContractConfigured) {
      setCreateStatus("Set the contract address before creating a database.");
      return;
    }

    if (!address || !instance || !signerPromise) {
      setCreateStatus("Connect your wallet and wait for encryption service.");
      return;
    }

    if (!createName.trim()) {
      setCreateStatus("Database name is required.");
      return;
    }

    setIsCreating(true);
    setCreateStatus("Encrypting key and sending transaction...");

    try {
      const keyToUse = generatedKey ?? generateNineDigitKey();
      setGeneratedKey(keyToUse);

      const input = instance.createEncryptedInput(CONTRACT_ADDRESS, address);
      input.add32(keyToUse);
      const encryptedInput = await input.encrypt();

      const signer = await signerPromise;
      if (!signer) {
        throw new Error("Signer not available");
      }

      const vault = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await vault.createDatabase(createName.trim(), encryptedInput.handles[0], encryptedInput.inputProof);
      await tx.wait();

      setCreateStatus("Database created on-chain. Use the unlock card to decrypt your key.");
      setUnlockName(createName.trim());
      await loadDatabases();
    } catch (error) {
      console.error("Create database failed:", error);
      setCreateStatus("Failed to create database.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDecryptKey = async () => {
    if (!isContractConfigured) {
      setDecryptStatus("Set the contract address before decrypting.");
      return;
    }

    if (!publicClient || !address) {
      setDecryptStatus("Read client not ready.");
      return;
    }

    if (!unlockName.trim()) {
      setDecryptStatus("Enter a database name.");
      return;
    }

    setIsDecrypting(true);
    setDecryptStatus("Fetching encrypted key...");
    setDecryptedKey("");

    try {
      const keyHandle = (await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "getDatabaseKey",
        args: [address, unlockName.trim()],
      })) as string;

      setDecryptStatus("Requesting user decryption...");
      const clearKey = await decryptHandle(keyHandle);
      setDecryptedKey(clearKey);
      setDecryptStatus("Key decrypted. You can encrypt and read entries.");
    } catch (error) {
      console.error("Decrypt key failed:", error);
      setDecryptStatus("Failed to decrypt the key.");
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleEncryptEntry = async () => {
    if (!isContractConfigured) {
      setEntryStatus("Set the contract address before saving entries.");
      return;
    }

    if (!entryDatabase.trim()) {
      setEntryStatus("Database name is required.");
      return;
    }

    if (!entryText.trim()) {
      setEntryStatus("Entry text is required.");
      return;
    }

    if (!keyNumber || Number.isNaN(keyNumber)) {
      setEntryStatus("Decrypt the database key first.");
      return;
    }

    if (!signerPromise) {
      setEntryStatus("Signer not ready.");
      return;
    }

    setIsSavingEntry(true);
    setEntryStatus("Encrypting entry...");

    try {
      const ciphertext = encryptWithKey(entryText.trim(), keyNumber);
      setEntryCiphertext(ciphertext);
      setEntryStatus("Sending encrypted entry to chain...");

      const signer = await signerPromise;
      if (!signer) {
        throw new Error("Signer not available");
      }

      const vault = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await vault.addEntry(entryDatabase.trim(), ciphertext);
      await tx.wait();

      setEntryStatus("Entry stored. You can load entries to verify.");
      setEntryText("");
    } catch (error) {
      console.error("Encrypt entry failed:", error);
      setEntryStatus("Failed to store the entry.");
    } finally {
      setIsSavingEntry(false);
    }
  };

  const handleLoadEntries = async () => {
    if (!isContractConfigured) {
      setEntriesStatus("Set the contract address before loading entries.");
      return;
    }

    if (!publicClient || !address) {
      setEntriesStatus("Read client not ready.");
      return;
    }

    if (!entryDatabase.trim()) {
      setEntriesStatus("Enter a database name.");
      return;
    }

    setIsLoadingEntries(true);
    setEntriesStatus("Loading encrypted entries...");

    try {
      const data = (await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "getEntries",
        args: [address, entryDatabase.trim()],
      })) as string[];

      const decrypted = keyNumber
        ? data.map((item) => ({
            ciphertext: item,
            plaintext: decryptWithKey(item, keyNumber),
          }))
        : data.map((item) => ({ ciphertext: item }));

      setEntries(decrypted);
      if (!data.length) {
        setEntriesStatus("No entries stored yet.");
      } else if (!keyNumber) {
        setEntriesStatus("Entries loaded. Decrypt the key to reveal plaintext.");
      } else {
        setEntriesStatus("");
      }
    } catch (error) {
      console.error("Load entries failed:", error);
      setEntriesStatus("Failed to load entries.");
    } finally {
      setIsLoadingEntries(false);
    }
  };

  return (
    <div className="vault-app">
      <Header />

      <main className="vault-main">
        <section className="hero">
          <div className="hero-content">
            <h2>Private databases, encrypted by default.</h2>
            <p>
              Generate a 9-digit vault key, encrypt it with Zama FHE, and store encrypted notes on-chain. Decrypt only
              when you need to read or write.
            </p>
            <div className="hero-status">
            <div className="status-pill">Network: Sepolia</div>
            <div className={`status-pill ${zamaError ? "status-error" : ""}`}>
              Encryption: {zamaLoading ? "Starting..." : zamaError ? "Unavailable" : "Ready"}
            </div>
            <div className={`status-pill ${isContractConfigured ? "status-live" : "status-error"}`}>
              Contract: {isContractConfigured ? "Configured" : "Missing"}
            </div>
            <div className={`status-pill ${isConnected ? "status-live" : ""}`}>
              Wallet: {isConnected ? "Connected" : "Disconnected"}
            </div>
            </div>
          </div>
          <div className="hero-panel">
            <div className="hero-panel-card">
              <h3>Quick checklist</h3>
              <ol>
                <li>Create a database with an encrypted key.</li>
                <li>Unlock the key with user decryption.</li>
                <li>Encrypt entries locally and store them.</li>
                <li>Reload entries and decrypt locally.</li>
              </ol>
            </div>
            <div className="hero-panel-card accent">
              <h3>Vault key visibility</h3>
              <p>Keys never leave your browser unencrypted. Only ciphertext is stored on-chain.</p>
            </div>
          </div>
        </section>

        <section className="vault-grid">
          <div className="vault-card">
            <h3>Create database</h3>
            <p className="card-subtitle">Generate a 9-digit key, encrypt it, and register your database.</p>
            <label className="field">
              Database name
              <input
                type="text"
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                placeholder="e.g. product-notes"
              />
            </label>
            <div className="inline-row">
              <button type="button" className="ghost" onClick={generateKey}>
                Generate key
              </button>
              <div className="key-display">{generatedKey ? generatedKey : "n/a"}</div>
            </div>
            <button type="button" className="primary" onClick={handleCreateDatabase} disabled={isCreating}>
              {isCreating ? "Creating..." : "Encrypt & store"}
            </button>
            {createStatus && <p className="status-text">{createStatus}</p>}
          </div>

          <div className="vault-card">
            <h3>Unlock database</h3>
            <p className="card-subtitle">Decrypt the stored key before writing or reading entries.</p>
            <label className="field">
              Database name
              <input
                type="text"
                value={unlockName}
                onChange={(event) => setUnlockName(event.target.value)}
                placeholder="Enter your database name"
              />
            </label>
            <button type="button" className="primary" onClick={handleDecryptKey} disabled={isDecrypting}>
              {isDecrypting ? "Decrypting..." : "Decrypt key"}
            </button>
            <div className="key-display wide">{hasKey ? decryptedKey : "Key not decrypted yet"}</div>
            {decryptStatus && <p className="status-text">{decryptStatus}</p>}
          </div>

          <div className="vault-card wide">
            <h3>Encrypt & store entry</h3>
            <p className="card-subtitle">Use your decrypted key to encrypt a string before saving on-chain.</p>
            <div className="two-columns">
              <label className="field">
                Database name
                <input
                  type="text"
                  value={entryDatabase}
                  onChange={(event) => setEntryDatabase(event.target.value)}
                  placeholder="Same name as unlocked database"
                />
              </label>
              <label className="field">
                Plaintext entry
                <textarea
                  rows={4}
                  value={entryText}
                  onChange={(event) => setEntryText(event.target.value)}
                  placeholder="Write a private note..."
                />
              </label>
            </div>
            <div className="inline-row">
              <button type="button" className="primary" onClick={handleEncryptEntry} disabled={isSavingEntry}>
                {isSavingEntry ? "Saving..." : "Encrypt & save"}
              </button>
              <div className="ciphertext-preview">
                <span>Last ciphertext</span>
                <code>{entryCiphertext ? entryCiphertext.slice(0, 32) + "..." : "n/a"}</code>
              </div>
            </div>
            {entryStatus && <p className="status-text">{entryStatus}</p>}
          </div>

          <div className="vault-card wide">
            <h3>Read entries</h3>
            <p className="card-subtitle">Load encrypted entries and decrypt locally when the key is available.</p>
            <div className="inline-row">
              <button type="button" className="ghost" onClick={handleLoadEntries} disabled={isLoadingEntries}>
                {isLoadingEntries ? "Loading..." : "Load entries"}
              </button>
              <span className="helper-text">
                Decrypted: {keyNumber ? "Yes" : "No"} / Database: {entryDatabase || "n/a"}
              </span>
            </div>
            {entriesStatus && <p className="status-text">{entriesStatus}</p>}
            <div className="entries-list">
              {entries.map((entry, index) => (
                <div key={`${entry.ciphertext}-${index}`} className="entry-row">
                  <div>
                    <span className="entry-label">Ciphertext</span>
                    <code>{entry.ciphertext}</code>
                  </div>
                  <div>
                    <span className="entry-label">Plaintext</span>
                    <p>{entry.plaintext ?? "Decrypt the key to reveal."}</p>
                  </div>
                </div>
              ))}
              {!entries.length && <p className="empty-state">No entries loaded yet.</p>}
            </div>
          </div>
        </section>

        <section className="vault-card list-card">
          <div className="inline-row">
            <div>
              <h3>Your databases</h3>
              <p className="card-subtitle">Fetch databases linked to your wallet address.</p>
            </div>
            <button type="button" className="ghost" onClick={loadDatabases} disabled={isLoadingDatabases}>
              {isLoadingDatabases ? "Loading..." : "Refresh"}
            </button>
          </div>
          {databasesStatus && <p className="status-text">{databasesStatus}</p>}
          <div className="database-list">
            {databases.map((db) => (
              <button key={db} type="button" className="database-chip" onClick={() => setUnlockName(db)}>
                {db}
              </button>
            ))}
            {!databases.length && <p className="empty-state">No databases yet.</p>}
          </div>
        </section>
      </main>
    </div>
  );
}
