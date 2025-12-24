# Privacy Vault

Privacy Vault is a fully on-chain registry for encrypted database keys and ciphertext entries. It uses Zama FHEVM to
store each database key in encrypted form while keeping user data encrypted client-side.

## Table of Contents

- Overview
- Problem It Solves
- How It Works
- Key Advantages
- Architecture
- Smart Contract API
- Frontend Behavior
- Tech Stack
- Repository Layout
- Setup and Usage
- Operational Notes
- Security and Privacy Model
- Future Roadmap

## Overview

Privacy Vault lets a user create a named database, generate a 9-digit numeric key (A) in the browser, encrypt that key
with Zama FHE, and store the encrypted key on-chain together with the database name. The database entries are always
encrypted client-side using A and stored on-chain as ciphertext strings.

This gives you:

- Confidential database keys stored on-chain with FHE
- User-owned encryption and decryption without a backend
- Chain-level integrity for both database names and encrypted entries

## Problem It Solves

Public blockchains are transparent by default. Any plaintext stored on-chain can be read by anyone, forever. Traditional
approaches usually move sensitive data off-chain, but then:

- You lose the guarantees of on-chain integrity and history
- You introduce centralized infrastructure and access-control risk
- You force users to trust a backend with their keys

Privacy Vault solves this by keeping data on-chain but keeping keys and entries encrypted end-to-end.

## How It Works

End-to-end flow:

1. Create database
   - Frontend generates a 9-digit random number A.
   - A is encrypted with Zama FHE (externalEuint32 + proof).
   - The encrypted key and the database name are sent to `createDatabase`.
2. Unlock database
   - The owner decrypts the encrypted key A through the Zama relayer.
3. Add data
   - User encrypts any string with A in the frontend.
   - Ciphertext is sent to `addEntry` and stored on-chain.
4. Read data
   - User decrypts A again, then decrypts all stored ciphertext entries locally.

The smart contract never sees plaintext A or plaintext entries.

## Key Advantages

- On-chain confidentiality for database keys using FHE
- Client-side encryption for all data entries (no plaintext on-chain)
- No backend service required for encryption or decryption
- User-controlled keys and access, enforced by smart contracts
- Simple database abstraction while preserving chain auditability

## Architecture

High-level components:

- Smart contract stores encrypted database keys and ciphertext entries.
- Frontend handles key generation, encryption, decryption, and user interaction.
- Zama relayer provides FHE encryption proofs and decryption for authorized owners.

Data flow summary:

- Database identifier = `keccak256(owner, name)`
- Encrypted key stored in contract as `euint32`
- Entries stored as `string` ciphertexts

## Smart Contract API

Contract: `contracts/PrivacyVault.sol`

Core functions:

- `createDatabase(name, encryptedKey, proof)`
  - Creates a database for the caller, stores the encrypted key, emits `DatabaseCreated`.
- `addEntry(name, ciphertext)`
  - Adds an encrypted entry for the caller, emits `EntryAdded`.
- `getDatabaseInfo(owner, name)` -> `(owner, entryCount, exists)`
  - Returns metadata for the database.
- `getDatabaseKey(owner, name)` -> `euint32`
  - Returns the encrypted key (FHE ciphertext).
- `getEntries(owner, name)` -> `string[]`
  - Returns all ciphertext entries.
- `getOwnerDatabases(owner)` -> `string[]`
  - Lists database names owned by `owner`.

Errors:

- `EmptyName`
- `EmptyCiphertext`
- `DatabaseAlreadyExists(name)`
- `DatabaseNotFound(name)`
- `NotDatabaseOwner(caller)`

Events:

- `DatabaseCreated(owner, name)`
- `EntryAdded(owner, name, index)`

## Frontend Behavior

Location: `src/` (Vite + React app)

Key behaviors:

- Generates 9-digit database key A in the browser
- Uses Zama relayer SDK to encrypt A and decrypt A
- Uses `ethers` for contract write calls
- Uses `viem` for contract read calls
- Uses RainbowKit and wagmi for wallet connection
- Does not use environment variables, local storage, or localhost networks

Important configuration:

- Update `CONTRACT_ADDRESS` and `CONTRACT_ABI` in `src/src/config/contracts.ts`
- The ABI must be copied from `deployments/sepolia/PrivacyVault.json`
- Frontend is designed to connect to Sepolia (not localhost)

## Tech Stack

Smart Contract:

- Solidity 0.8.24
- Zama FHEVM (`@fhevm/solidity`)
- Hardhat + hardhat-deploy

Frontend:

- React + Vite
- TypeScript
- viem (read)
- ethers (write)
- RainbowKit + wagmi
- Zama relayer SDK
- Plain CSS (no Tailwind)

Tooling:

- ESLint, Prettier, Solhint
- TypeChain

## Repository Layout

```
Privacy-Vault/
├── contracts/              # Smart contracts
├── deploy/                 # Hardhat deploy scripts
├── tasks/                  # Custom Hardhat tasks
├── test/                   # Unit tests
├── src/                    # Frontend (Vite)
├── docs/                   # Zama references
├── hardhat.config.ts       # Hardhat configuration
└── README.md               # This file
```

## Setup and Usage

### Prerequisites

- Node.js >= 20
- npm >= 7

### Install Dependencies

Root (contracts):

```bash
npm install
```

Frontend:

```bash
cd src
npm install
```

### Environment Configuration (Contracts Only)

Create `.env` in the project root:

```bash
INFURA_API_KEY=your_infura_key
PRIVATE_KEY=your_private_key
ETHERSCAN_API_KEY=your_etherscan_key
```

Notes:

- Deployment uses a private key only (no mnemonic).
- Frontend does not use environment variables.

### Compile and Test

```bash
npm run compile
npm run test
npm run lint
```

Optional Sepolia tests:

```bash
npm run test:sepolia
```

### Local Node (Contracts Only)

Start a local node and deploy:

```bash
npm run chain
npm run deploy:localhost
```

This is for contract development and tests only. The frontend is intended for Sepolia and should not target localhost.

### Deploy to Sepolia

```bash
npm run deploy:sepolia
```

Verify if needed:

```bash
npm run verify:sepolia -- <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS...>
```

### Run the Frontend

```bash
cd src
npm run dev
```

Before running, ensure `CONTRACT_ADDRESS` and `CONTRACT_ABI` are set in `src/src/config/contracts.ts` using the Sepolia
deployment artifact.

## Operational Notes

- Database names are scoped per owner (same name can exist for different owners).
- Entries are stored in insertion order and returned as a full list.
- Ciphertexts are stored as strings; the contract does not interpret them.
- The contract never sees plaintext keys or plaintext data.

## Security and Privacy Model

- Encrypted database key is stored as an FHE ciphertext (`euint32`).
- The key is allowed for the database owner and the contract itself via `FHE.allow`.
- Only the owner can add entries for a database.
- Reading encrypted data is public, but decryption requires the owner's key.
- View functions accept an explicit `owner` parameter for deterministic access control logic.

## Future Roadmap

- Key rotation and re-encryption workflow
- Shared databases with role-based access
- Pagination and partial loading for large datasets
- Off-chain storage with on-chain hashes for large payloads
- Batch entry writes and bulk reads
- Searchable encrypted metadata
- Export/import tooling for encrypted backups
- Better UX for multi-database management

