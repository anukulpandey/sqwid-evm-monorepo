const path = require("path");

require("dotenv").config({
  path: process.env.SQWID_BACKEND_ENV || path.resolve(__dirname, "../.env"),
});

const { manifests } = require("@sqwid/contracts");

const manifest = manifests.chain13939;

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
  contracts: {
    erc1155:
      process.env.ERC1155_ADDRESS ||
      manifest.contracts.SqwidERC1155.address,
    marketplace:
      process.env.MARKETPLACE_ADDRESS ||
      manifest.contracts.SqwidMarketplace.address,
    utility:
      process.env.UTILITY_ADDRESS ||
      manifest.contracts.SqwidMarketplaceUtil.address,
    governance:
      process.env.GOVERNANCE_ADDRESS ||
      manifest.contracts.SqwidGovernance.address,
  },
};
