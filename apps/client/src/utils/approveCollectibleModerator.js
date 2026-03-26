import axios from "axios";
import { getBackend } from "./network";

const approveCollectibleByModerator = async (itemId, collectionId) => {
	const address = JSON.parse(localStorage.getItem("auth"))?.auth.address;
	if (!address) {
		throw new Error("You need to login first");
	}
	let jwt = JSON.parse(localStorage.getItem("tokens")).find(
		token => token.address === address
	);

	if (jwt) {
		const response = await axios.post(
			`${getBackend()}/edit/moderators`,
			{
				itemId,
				collectionId,
			},
			{
				headers: {
					Authorization: `Bearer ${jwt.token}`,
					"Content-Type": "application/json",
				},
			}
		);

		if (response.data.data === true) {
			window.location.reload();
			return null;
		}

		return { error: response.data.error || "Unknown error occurred" };
	}

	return null;
};

export { approveCollectibleByModerator };
