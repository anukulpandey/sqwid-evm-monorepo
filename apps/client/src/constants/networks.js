const chainId = Number(process.env.REACT_APP_CHAIN_ID || 13939);
const rpcUrl =
	process.env.REACT_APP_RPC_URL ||
	"https://eth.reef-node-reefdevcluster-808c46-72-60-35-83.sslip.io";
const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8080";
const chainName = process.env.REACT_APP_CHAIN_NAME || "Sqwid 13939";
const currencySymbol = process.env.REACT_APP_CURRENCY_SYMBOL || "REEF";

const contracts = {
	marketplace: "0xCE3f75B12cA7128A3d3CEbD806b5a5A88467d9b7",
	erc1155: "0xd8f420258A75581E8F110A1d46C2D3f78ea2087f",
	utility: "0x5Da80f08835b6bE25233a8ac7F20593cE277697A",
	governance: "0xF1F7ef041e0602C40B1F92d41afe6A4C9E114027",
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
