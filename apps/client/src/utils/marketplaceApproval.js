import { ethers } from "ethers";
import { Interact } from "./connect";
import contractABI from "../constants/contracts/SqwidERC1155";
import { getContract } from "./network";
import {
	MISSING_MARKETPLACE_CONTRACTS_MESSAGE,
	normalizeClientErrorMessage,
} from "./web3ErrorMessage";

const assertMarketplaceContractsAvailable = async provider => {
	const [erc1155Code, marketplaceCode] = await Promise.all([
		provider.getCode(getContract("erc1155")),
		provider.getCode(getContract("marketplace")),
	]);

	if (
		!erc1155Code ||
		erc1155Code === "0x" ||
		!marketplaceCode ||
		marketplaceCode === "0x"
	) {
		throw new Error(MISSING_MARKETPLACE_CONTRACTS_MESSAGE);
	}
};

const approveMarketplace = async () => {
	try {
		let { signer } = await Interact();
		await assertMarketplaceContractsAvailable(signer.provider);

		let contract = new ethers.Contract(
			getContract("erc1155"),
			contractABI,
			signer
		);

		const tx = await contract.setApprovalForAll(
			getContract("marketplace"),
			true
		);
		return await tx.wait();
	} catch (error) {
		throw new Error(
			normalizeClientErrorMessage(error, "Marketplace approval failed.")
		);
	}
};

const isMarketplaceApproved = async () => {
	try {
		let { provider, signer } = await Interact();
		await assertMarketplaceContractsAvailable(provider);
		const address = await signer.getAddress();

		let contract = new ethers.Contract(
			getContract("erc1155"),
			contractABI,
			provider
		);

		const isApproved = await contract.isApprovedForAll(
			address,
			getContract("marketplace")
		);
		return isApproved;
	} catch (error) {
		throw new Error(
			normalizeClientErrorMessage(
				error,
				"Unable to check marketplace approval."
			)
		);
	}
};

export { approveMarketplace, isMarketplaceApproved };
