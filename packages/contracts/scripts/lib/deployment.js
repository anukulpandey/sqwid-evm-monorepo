const fs = require("fs");
const path = require("path");
const { utils } = require("ethers");

const DEFAULT_RPC_URL = "http://34.123.142.246:8545";
const DEFAULT_CHAIN_ID = 13939;
const DEFAULT_MARKET_FEE_BPS = 250;

function readNumber(value, fallback, label) {
    const parsed = Number(value ?? fallback);
    if (!Number.isInteger(parsed)) {
        throw new Error(`Invalid ${label}: ${value}`);
    }
    return parsed;
}

function getNetworkSettings() {
    return {
        rpcUrl: process.env.RPC_URL || DEFAULT_RPC_URL,
        chainId: readNumber(process.env.CHAIN_ID, DEFAULT_CHAIN_ID, "CHAIN_ID"),
        marketFeeBps: readNumber(
            process.env.MARKET_FEE_BPS,
            DEFAULT_MARKET_FEE_BPS,
            "MARKET_FEE_BPS"
        ),
    };
}

async function getDeployer(hre) {
    const [deployer] = await hre.ethers.getSigners();
    if (!deployer) {
        throw new Error("No deployer signer available. Set PRIVATE_KEY in .env before deploying.");
    }

    return deployer;
}

async function assertTargetNetwork(hre, expectedChainId) {
    const network = await hre.ethers.provider.getNetwork();
    if (Number(network.chainId) !== Number(expectedChainId)) {
        throw new Error(
            `Connected to chain ${network.chainId}, expected ${expectedChainId}. Check RPC_URL/CHAIN_ID.`
        );
    }
}

async function assertHasCode(hre, address, label) {
    const code = await hre.ethers.provider.getCode(address);
    if (!code || code === "0x") {
        throw new Error(`${label} deployed at ${address}, but no runtime code was found on-chain.`);
    }
}

function manifestPath(chainId) {
    return path.resolve(__dirname, "..", "..", "deployments", `${chainId}.json`);
}

function loadManifest(chainId) {
    const filePath = manifestPath(chainId);
    if (!fs.existsSync(filePath)) {
        return {
            generatedAt: null,
            network: {},
            deployer: null,
            contracts: {},
        };
    }

    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function saveManifest(manifest) {
    const filePath = manifestPath(manifest.network.chainId);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(manifest, null, 2) + "\n");
    return filePath;
}

function upsertContracts(manifest, contracts) {
    manifest.contracts = {
        ...manifest.contracts,
        ...contracts,
    };
    manifest.generatedAt = new Date().toISOString();
}

function getGovernanceSettings(deployerAddress) {
    const owners = process.env.GOVERNANCE_OWNERS
        ? process.env.GOVERNANCE_OWNERS.split(",")
              .map((value) => value.trim())
              .filter(Boolean)
              .map((value) => utils.getAddress(value))
        : [utils.getAddress(deployerAddress)];

    const minConfirmations = readNumber(process.env.MIN_CONFIRMATIONS, 1, "MIN_CONFIRMATIONS");
    if (minConfirmations < 1 || minConfirmations > owners.length) {
        throw new Error(
            `MIN_CONFIRMATIONS must be between 1 and the number of owners (${owners.length}).`
        );
    }

    return { owners, minConfirmations };
}

module.exports = {
    getNetworkSettings,
    getDeployer,
    assertTargetNetwork,
    assertHasCode,
    loadManifest,
    saveManifest,
    upsertContracts,
    getGovernanceSettings,
};
