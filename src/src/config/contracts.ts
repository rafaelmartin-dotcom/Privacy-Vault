export const CONTRACT_ADDRESS = "0x027eA5Cf71d621af084ca7DD2259d1c57B688DBd";

// Synced from deployments/sepolia/PrivacyVault.json
export const CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "name", "type": "string" },
      { "internalType": "externalEuint32", "name": "encryptedKey", "type": "bytes32" },
      { "internalType": "bytes", "name": "proof", "type": "bytes" }
    ],
    "name": "createDatabase",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "name", "type": "string" },
      { "internalType": "string", "name": "ciphertext", "type": "string" }
    ],
    "name": "addEntry",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "string", "name": "name", "type": "string" }
    ],
    "name": "getDatabaseInfo",
    "outputs": [
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "uint256", "name": "entryCount", "type": "uint256" },
      { "internalType": "bool", "name": "exists", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "string", "name": "name", "type": "string" }
    ],
    "name": "getDatabaseKey",
    "outputs": [
      { "internalType": "euint32", "name": "", "type": "bytes32" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "string", "name": "name", "type": "string" }
    ],
    "name": "getEntries",
    "outputs": [
      { "internalType": "string[]", "name": "", "type": "string[]" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "owner", "type": "address" }
    ],
    "name": "getOwnerDatabases",
    "outputs": [
      { "internalType": "string[]", "name": "", "type": "string[]" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "owner", "type": "address" },
      { "indexed": false, "internalType": "string", "name": "name", "type": "string" }
    ],
    "name": "DatabaseCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "owner", "type": "address" },
      { "indexed": false, "internalType": "string", "name": "name", "type": "string" },
      { "indexed": false, "internalType": "uint256", "name": "index", "type": "uint256" }
    ],
    "name": "EntryAdded",
    "type": "event"
  },
  { "inputs": [], "name": "EmptyCiphertext", "type": "error" },
  { "inputs": [], "name": "EmptyName", "type": "error" },
  { "inputs": [{ "internalType": "string", "name": "name", "type": "string" }], "name": "DatabaseAlreadyExists", "type": "error" },
  { "inputs": [{ "internalType": "string", "name": "name", "type": "string" }], "name": "DatabaseNotFound", "type": "error" },
  { "inputs": [{ "internalType": "address", "name": "caller", "type": "address" }], "name": "NotDatabaseOwner", "type": "error" }
];
