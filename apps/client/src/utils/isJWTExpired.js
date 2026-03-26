import {
	getActiveSession,
	isJwtExpired as hasExpiredJwt,
} from "./authSession";

export const isJWTExpired = (tokenParam = null) => {
	if (tokenParam) {
		return hasExpiredJwt(tokenParam);
	}

	return getActiveSession().tokenExpired;
};
