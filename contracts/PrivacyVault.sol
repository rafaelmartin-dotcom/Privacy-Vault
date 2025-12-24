// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Privacy Vault
/// @notice Stores encrypted database keys and encrypted entries on-chain.
contract PrivacyVault is ZamaEthereumConfig {
    struct Database {
        address owner;
        string name;
        euint32 encryptedKey;
        string[] entries;
        bool exists;
    }

    mapping(bytes32 => Database) private databases;
    mapping(address => string[]) private ownerDatabases;

    event DatabaseCreated(address indexed owner, string name);
    event EntryAdded(address indexed owner, string name, uint256 index);

    error DatabaseAlreadyExists(string name);
    error DatabaseNotFound(string name);
    error NotDatabaseOwner(address caller);
    error EmptyName();
    error EmptyCiphertext();

    function createDatabase(string calldata name, externalEuint32 encryptedKey, bytes calldata proof) external {
        if (bytes(name).length == 0) {
            revert EmptyName();
        }

        bytes32 key = _databaseKey(msg.sender, name);
        if (databases[key].exists) {
            revert DatabaseAlreadyExists(name);
        }

        euint32 validatedKey = FHE.fromExternal(encryptedKey, proof);

        Database storage db = databases[key];
        db.owner = msg.sender;
        db.name = name;
        db.encryptedKey = validatedKey;
        db.exists = true;

        ownerDatabases[msg.sender].push(name);

        FHE.allow(validatedKey, msg.sender);
        FHE.allowThis(validatedKey);

        emit DatabaseCreated(msg.sender, name);
    }

    function addEntry(string calldata name, string calldata ciphertext) external {
        if (bytes(ciphertext).length == 0) {
            revert EmptyCiphertext();
        }

        Database storage db = _getDatabase(msg.sender, name);
        if (db.owner != msg.sender) {
            revert NotDatabaseOwner(msg.sender);
        }

        db.entries.push(ciphertext);
        emit EntryAdded(msg.sender, name, db.entries.length - 1);
    }

    function getDatabaseInfo(address owner, string calldata name) external view returns (address dbOwner, uint256 entryCount, bool exists) {
        bytes32 key = _databaseKey(owner, name);
        Database storage db = databases[key];
        return (db.owner, db.entries.length, db.exists);
    }

    function getDatabaseKey(address owner, string calldata name) external view returns (euint32) {
        return _getDatabase(owner, name).encryptedKey;
    }

    function getEntries(address owner, string calldata name) external view returns (string[] memory) {
        return _getDatabase(owner, name).entries;
    }

    function getOwnerDatabases(address owner) external view returns (string[] memory) {
        return ownerDatabases[owner];
    }

    function _getDatabase(address owner, string calldata name) internal view returns (Database storage) {
        if (bytes(name).length == 0) {
            revert EmptyName();
        }

        bytes32 key = _databaseKey(owner, name);
        Database storage db = databases[key];
        if (!db.exists) {
            revert DatabaseNotFound(name);
        }

        return db;
    }

    function _databaseKey(address owner, string calldata name) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(owner, name));
    }
}
