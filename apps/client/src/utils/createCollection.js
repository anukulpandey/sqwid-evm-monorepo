import axios from "axios";
import {
	clearActiveSession,
	getApiErrorMessage,
	getRequiredJwt,
	isStaleSessionError,
} from "./authSession";
import { getBackend } from "./network";

const createCollection = async (file, name, description) => {
	const data = new FormData();
	data.append("fileData", file);
	data.append("name", name);
	data.append("description", description);

	try {
		const jwt = getRequiredJwt();
		const response = await axios.post(`${getBackend()}/create/collection`, data, {
			headers: {
				Authorization: `Bearer ${jwt}`,
			},
		});
		return response.data;
	} catch (error) {
		if (isStaleSessionError(error)) {
			clearActiveSession();
			throw new Error("Session expired. Please reconnect your wallet.");
		}

		throw new Error(
			getApiErrorMessage(error, "Failed to create collection.")
		);
	}
};

export { createCollection };
