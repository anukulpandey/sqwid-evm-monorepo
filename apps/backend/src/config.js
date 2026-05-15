const path = require("path");

require("dotenv").config({
  path: process.env.SQWID_BACKEND_ENV || path.resolve(__dirname, "../.env"),
});

const { manifests } = require("@sqwid/contracts");

const manifest = manifests.chain13939;
const contracts = {
  erc1155: "0xd8f420258A75581E8F110A1d46C2D3f78ea2087f",
  marketplace: "0xCE3f75B12cA7128A3d3CEbD806b5a5A88467d9b7",
  utility: "0x5Da80f08835b6bE25233a8ac7F20593cE277697A",
  governance: "0xF1F7ef041e0602C40B1F92d41afe6A4C9E114027",
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
