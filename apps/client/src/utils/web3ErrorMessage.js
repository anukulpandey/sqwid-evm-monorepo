export const MISSING_MARKETPLACE_CONTRACTS_MESSAGE =
	"Marketplace contracts are not deployed on the selected network yet. Please redeploy the contracts or update the configured addresses.";

const MISSING_CONTRACT_METHODS = [
	"isApprovedForAll",
	"setApprovalForAll",
	"currentItemId",
	"currentPositionId",
	"fetchPosition",
	"fetchAddressPositionsPage",
	"fetchPositionsByStatePage",
	"addressBalance",
	"balanceOf",
];

const toMessageString = error => {
	if (!error) {
		return "";
	}

	if (typeof error === "string") {
		return error;
	}

	return (
		error?.response?.data?.error ||
		error?.response?.data?.message ||
		error?.message ||
		error?.toString?.() ||
		""
	);
};

export const normalizeClientErrorMessage = (
	error,
	fallback = "Something went wrong."
) => {
	const rawMessage = toMessageString(error).trim();
	if (!rawMessage) {
		return fallback;
	}

	const isMissingContractCall =
		rawMessage.includes("CALL_EXCEPTION") &&
		MISSING_CONTRACT_METHODS.some(method =>
			rawMessage.includes(`method="${method}`)
		);

	if (isMissingContractCall) {
		return MISSING_MARKETPLACE_CONTRACTS_MESSAGE;
	}

	if (rawMessage.startsWith("Error: ")) {
		return rawMessage.slice("Error: ".length);
	}

	return rawMessage;
};
