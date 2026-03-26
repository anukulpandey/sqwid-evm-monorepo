import { ethers } from "ethers";
import { getActiveSession } from "./authSession";
import { getNetworkConfig } from "./network";

let publicProvider;

const getReadProvider = () => {
	if (typeof window !== "undefined" && window.ethereum) {
		return new ethers.providers.Web3Provider(window.ethereum, "any");
	}

	if (!publicProvider) {
		const networkConfig = getNetworkConfig();
		publicProvider = new ethers.providers.JsonRpcProvider(
			networkConfig.rpc,
			networkConfig.chainId
		);
	}
	return publicProvider;
};

export const getBalanceProvider = async () => {
	const { address } = getActiveSession();
	if (!address) {
		return ethers.constants.Zero;
	}
	return getReadProvider().getBalance(address);
};

export const getBalance = async () => {
	const { address } = getActiveSession();
	if (!address) {
		return 0;
	}

	const balance = await getReadProvider().getBalance(address);
	return Number(ethers.utils.formatEther(balance));
};
