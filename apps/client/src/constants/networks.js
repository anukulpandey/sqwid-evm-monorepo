import sqwidContracts from "@sqwid/contracts";

const { chain13939 } = sqwidContracts;

const chainId = Number(process.env.REACT_APP_CHAIN_ID || chain13939.chainId);
const rpcUrl = process.env.REACT_APP_RPC_URL || chain13939.rpcUrl;
const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8080";
const chainName = process.env.REACT_APP_CHAIN_NAME || "Sqwid 13939";
const currencySymbol = process.env.REACT_APP_CURRENCY_SYMBOL || "REEF";

export const networks = {
	custom_13939: {
		chainId,
		chainName,
		currencySymbol,
		rpc: rpcUrl,
		contracts: {
			marketplace:
				process.env.REACT_APP_MARKETPLACE_ADDRESS ||
				chain13939.contracts.marketplace,
			erc1155:
				process.env.REACT_APP_ERC1155_ADDRESS ||
				chain13939.contracts.erc1155,
			utility:
				process.env.REACT_APP_UTILITY_ADDRESS || chain13939.contracts.utility,
			governance:
				process.env.REACT_APP_GOVERNANCE_ADDRESS ||
				chain13939.contracts.governance,
		},
		backend: backendUrl,
	},
};

export const defaultNetwork = "custom_13939";
