import axios from "axios";
import { ethers } from "ethers";
import { getBackend, getNetworkConfig } from "./network";

let provider;

const getInjectedProvider = () => {
	if (typeof window === "undefined") {
		return null;
	}
	return window.ethereum || null;
};

const getChainHex = () =>
	`0x${Number(getNetworkConfig().chainId).toString(16)}`;

const ensureNetwork = async injectedProvider => {
	const desiredChainId = getChainHex();
	const networkConfig = getNetworkConfig();
	const currentChainId = await injectedProvider.request({
		method: "eth_chainId",
	});

	if (currentChainId === desiredChainId) {
		return;
	}

	try {
		await injectedProvider.request({
			method: "wallet_switchEthereumChain",
			params: [{ chainId: desiredChainId }],
		});
	} catch (error) {
		if (error.code !== 4902) {
			throw error;
		}

		await injectedProvider.request({
			method: "wallet_addEthereumChain",
			params: [
				{
					chainId: desiredChainId,
					chainName: networkConfig.chainName,
					rpcUrls: [networkConfig.rpc],
					nativeCurrency: {
						name: networkConfig.currencySymbol,
						symbol: networkConfig.currencySymbol,
						decimals: 18,
					},
				},
			],
		});
	}
};

const Init = async () => {
	const injectedProvider = getInjectedProvider();
	if (!injectedProvider) {
		return {
			errorCode: 1,
			accounts: [],
		};
	}

	let accounts = [];
	try {
		await ensureNetwork(injectedProvider);
		accounts = await injectedProvider.request({
			method: "eth_requestAccounts",
		});
	} catch (error) {
		accounts = [];
	}

	return {
		errorCode: accounts.length > 0 ? 0 : 2,
		accounts: accounts.map((address, index) => ({
			address,
			meta: {
				name: index === 0 ? "Injected Wallet" : `Wallet ${index + 1}`,
				source: "injected",
			},
		})),
	};
};

const Interact = async address => {
	const injectedProvider = getInjectedProvider();
	if (!injectedProvider) {
		throw new Error("No injected EVM wallet found");
	}

	await ensureNetwork(injectedProvider);
	provider = new ethers.providers.Web3Provider(injectedProvider, "any");
	const signer = provider.getSigner(address);

	return {
		signer,
		provider,
	};
};

const Connect = async account => {
	const { signer } = await Interact(account.address);
	const address = await signer.getAddress();
	const nonceResponse = await axios.get(`${getBackend()}/nonce?address=${address}`);
	const signature = await signer.signMessage(nonceResponse.data.nonce);
	const authResponse = await axios.post(`${getBackend()}/auth`, {
		address,
		signature,
	});

	if (authResponse.data.status !== "success") {
		throw new Error(authResponse.data.message || "Authentication failed");
	}

	localStorage.removeItem("collections");
	const existingTokens = JSON.parse(localStorage.getItem("tokens") || "[]");
	const tokenIndex = existingTokens.findIndex((item) => item.address === address);
	const payload = {
		name: account.meta.name,
		address,
		token: authResponse.data.token,
	};

	if (tokenIndex >= 0) {
		existingTokens[tokenIndex] = payload;
	} else {
		existingTokens.push(payload);
	}

	localStorage.setItem("tokens", JSON.stringify(existingTokens));

	return {
		evmClaimed: true,
		signer,
		token: authResponse.data.token,
	};
};

const GetProvider = async () => {
	const injectedProvider = getInjectedProvider();
	if (!injectedProvider) {
		throw new Error("No injected EVM wallet found");
	}

	await ensureNetwork(injectedProvider);
	provider = new ethers.providers.Web3Provider(injectedProvider, "any");
	return provider;
};

export { Connect, Init, Interact, GetProvider };
