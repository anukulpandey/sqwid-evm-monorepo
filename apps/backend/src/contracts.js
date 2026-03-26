const { ethers } = require("ethers");
const { abis } = require("@sqwid/contracts");
const config = require("./config");

const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl, config.chainId);

const marketplace = new ethers.Contract(
  config.contracts.marketplace,
  abis.SqwidMarketplace,
  provider
);

const utility = new ethers.Contract(
  config.contracts.utility,
  abis.SqwidMarketplaceUtil,
  provider
);

const erc1155 = new ethers.Contract(
  config.contracts.erc1155,
  abis.SqwidERC1155,
  provider
);

module.exports = {
  provider,
  marketplace,
  utility,
  erc1155,
};
