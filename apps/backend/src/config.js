const path = require("path");

require("dotenv").config({
  path: process.env.SQWID_BACKEND_ENV || path.resolve(__dirname, "../.env"),
});

const { manifests } = require("@sqwid/contracts");

const manifest = manifests.chain13939;
const contracts = {
  erc1155: "0x1DF9D4bE7cdeF8cB9815586408EFcd5aa8C7cd5A",
  marketplace: "0x3C2BA92EAFAbA6A5aC21502D8C55d3A33950f7A6",
  utility: "0xDAb89107eaF290312fd8e80463A6a9Ec3D428F4A",
  governance: "0xa3Cab0B7288fA4CAe22CcD8B1a80c4bFaDe27664",
};

const parseCsv = (value) =>
  (value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

module.exports = {
  port: Number(process.env.PORT || 8080),
  databaseUrl:
    process.env.DATABASE_URL || "postgresql://sqwid:sqwid@localhost:5432/sqwid",
  rpcUrl: process.env.RPC_URL || manifest.network.rpcUrl,
  chainId: Number(process.env.CHAIN_ID || manifest.network.chainId),
  jwtSecret: process.env.JWT_SECRET || "sqwid-local-dev-secret",
  ipfsApiUrl: process.env.IPFS_API_URL || "http://127.0.0.1:5001",
  ipfsGatewayUrl: process.env.IPFS_GATEWAY_URL || "http://127.0.0.1:8081/ipfs/",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  defaultCollectionId:
    process.env.DEFAULT_COLLECTION_ID || "ASwOXeRM5DfghnURP4g2",
  moderators: parseCsv(process.env.MODERATORS),
  contracts,
};
