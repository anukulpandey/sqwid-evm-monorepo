import { getActiveSession } from "@utils/authSession";

const session = getActiveSession();

export const initialState = {
	token: session.token || null,
	auth: session.auth || null,
};
