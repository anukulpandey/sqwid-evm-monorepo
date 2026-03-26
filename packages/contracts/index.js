const deployment13939 = require("./deployments/13939.json");
const erc1155Artifact = require("./artifacts/contracts/SqwidERC1155.sol/SqwidERC1155.json");
const marketplaceArtifact = require("./artifacts/contracts/SqwidMarketplace.sol/SqwidMarketplace.json");
const utilityArtifact = require("./artifacts/contracts/SqwidMarketplaceUtil.sol/SqwidMarketplaceUtil.json");
const governanceArtifact = require("./artifacts/contracts/Governance.sol/SqwidGovernance.json");

const addresses13939 = {
  erc1155: deployment13939.contracts.SqwidERC1155.address,
  marketplace: deployment13939.contracts.SqwidMarketplace.address,
  utility: deployment13939.contracts.SqwidMarketplaceUtil.address,
  governance: deployment13939.contracts.SqwidGovernance.address,
};

module.exports = {
  deployments: {
    13939: deployment13939,
  },
  manifests: {
    chain13939: deployment13939,
  },
  addresses: {
    13939: addresses13939,
    chain13939: addresses13939,
  },
  abis: {
    SqwidERC1155: erc1155Artifact.abi,
    SqwidMarketplace: marketplaceArtifact.abi,
    SqwidMarketplaceUtil: utilityArtifact.abi,
    SqwidGovernance: governanceArtifact.abi,
  },
  artifacts: {
    SqwidERC1155: erc1155Artifact,
    SqwidMarketplace: marketplaceArtifact,
    SqwidMarketplaceUtil: utilityArtifact,
    SqwidGovernance: governanceArtifact,
  },
  chain13939: {
    chainId: 13939,
    rpcUrl: deployment13939.network.rpcUrl,
    contracts: addresses13939,
  },
};
