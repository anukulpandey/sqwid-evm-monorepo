import axios from "axios";
import { ethers } from "ethers";
import contractABI from "../constants/contracts/SqwidMarketplace";
import {
	clearActiveSession,
	getApiErrorMessage,
	getRequiredJwt,
	isStaleSessionError,
} from "./authSession";
import { Interact } from "./connect";
import {
	isMarketplaceApproved,
	approveMarketplace,
} from "./marketplaceApproval";
import { getBackend, getContract } from "./network";

const parseBigNumber = value =>
	ethers.BigNumber.isBigNumber(value) ? value.toNumber() : Number(value);

const parseMintReceipt = (contract, receipt, creatorAddress) => {
	const creator = creatorAddress.toLowerCase();
	const parsedLogs =
		receipt.logs
			?.map(log => {
				try {
					return contract.interface.parseLog(log);
				} catch (_error) {
					return null;
				}
			})
			.filter(Boolean) || [];

	const positionLog = parsedLogs.find(
		log =>
			log.name === "PositionUpdate" &&
			log.args?.owner?.toLowerCase() === creator &&
			parseBigNumber(log.args?.state) === 0
	);
	const itemLog = parsedLogs.find(
		log =>
			log.name === "ItemCreated" &&
			log.args?.creator?.toLowerCase() === creator
	);

	const itemId = positionLog?.args?.itemId ?? itemLog?.args?.itemId;
	const positionId = positionLog?.args?.positionId;

	if (!itemId || !positionId) {
		throw new Error(
			"Mint succeeded, but the app could not read the new item from the transaction receipt."
		);
	}

	return {
		itemId: parseBigNumber(itemId),
		positionId: parseBigNumber(positionId),
	};
};

const createCollectible = async files => {
	const { file, coverFile, name, description, properties, collection } =
		files;
	const copies = Number(files.copies) || 1;
	const royalty = (Number(files.royalty) || 0) * 100;

	const data = new FormData();
	data.append("fileData", file);
	data.append("coverData", coverFile || file);
	data.append("name", name);
	data.append("description", description);
	data.append("collection", collection);

	let attributes = [];
	if (properties && properties.length > 0) {
		for (let property of properties) {
			if (property.key.length) {
				attributes.push({
					trait_type: property.key,
					value: property.value,
				});
			}
		}
	}

	data.append("properties", JSON.stringify(attributes));

	const jwt = getRequiredJwt();
	const { signer } = await Interact();
	const address = await signer.getAddress();
	const royaltyRecipient =
		files.royaltyRecipient && files.royaltyRecipient !== ""
			? ethers.utils.getAddress(files.royaltyRecipient)
			: address;

	let metadataUri;
	try {
		const metadata = await axios.post(
			`${getBackend()}/create/collectible/upload`,
			data,
			{
				headers: {
					Authorization: `Bearer ${jwt}`,
				},
			}
		);
		metadataUri = metadata.data.metadata;
	} catch (error) {
		if (isStaleSessionError(error)) {
			clearActiveSession();
			throw new Error("Session expired. Please reconnect your wallet.");
		}

		throw new Error(
			getApiErrorMessage(error, "Failed to upload collectible metadata.")
		);
	}

	try {
		const approved = await isMarketplaceApproved();
		if (!approved) {
			await approveMarketplace();
		}
	} catch (error) {
		throw new Error(
			getApiErrorMessage(
				error,
				"Marketplace approval was rejected or failed."
			)
		);
	}

	const contract = new ethers.Contract(
		getContract("marketplace"),
		contractABI,
		signer
	);

	let mintResult;
	try {
		const tx = await contract.mint(
			copies,
			metadataUri,
			file.type.split("/")[0],
			royaltyRecipient,
			royalty
		);
		const receipt = await tx.wait();
		mintResult = parseMintReceipt(contract, receipt, address);
	} catch (error) {
		throw new Error(
			getApiErrorMessage(
				error,
				"NFT mint transaction failed or was rejected."
			)
		);
	}

	try {
		const payload = collection
			? {
					id: mintResult.itemId,
					collection,
			  }
			: {
					id: mintResult.itemId,
			  };

		await axios.post(`${getBackend()}/create/collectible/verify`, payload, {
			headers: {
				Authorization: `Bearer ${jwt}`,
				"Content-Type": "application/json",
			},
		});
	} catch (error) {
		if (isStaleSessionError(error)) {
			clearActiveSession();
			throw new Error("Session expired. Please reconnect your wallet.");
		}

		throw new Error(
			getApiErrorMessage(
				error,
				"Mint succeeded, but backend verification failed."
			)
		);
	}

	return mintResult.positionId;
};

export { createCollectible };
