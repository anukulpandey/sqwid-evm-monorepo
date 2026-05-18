const chainId = Number(process.env.REACT_APP_CHAIN_ID || 13939);
const rpcUrl =
	process.env.REACT_APP_RPC_URL ||
	"https://eth.reef-node-reefdevcluster-808c46-72-60-35-83.nip.io/";
const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8080";
const chainName = process.env.REACT_APP_CHAIN_NAME || "Sqwid 13939";
const currencySymbol = process.env.REACT_APP_CURRENCY_SYMBOL || "REEF";

const contracts = {
	marketplace: "0x3C2BA92EAFAbA6A5aC21502D8C55d3A33950f7A6",
	erc1155: "0x1DF9D4bE7cdeF8cB9815586408EFcd5aa8C7cd5A",
	utility: "0xDAb89107eaF290312fd8e80463A6a9Ec3D428F4A",
	governance: "0xa3Cab0B7288fA4CAe22CcD8B1a80c4bFaDe27664",
};

export const networks = {
	custom_13939: {
		chainId,
		chainName,
		currencySymbol,
		rpc: rpcUrl,
		contracts,
		backend: backendUrl,
	},
};

export const defaultNetwork = "custom_13939";
