import jwt_decode from "jwt-decode";
import { normalizeClientErrorMessage } from "./web3ErrorMessage";

export const SESSION_CLEARED_EVENT = "sqwid:session-cleared";

const TOKENS_STORAGE_KEY = "tokens";
const AUTH_STORAGE_KEY = "auth";

const safeParse = (value, fallback) => {
	try {
		return value ? JSON.parse(value) : fallback;
	} catch (_error) {
		return fallback;
	}
};

const normalizeAddress = address =>
	typeof address === "string" ? address.toLowerCase() : null;

export const getStoredTokens = () => {
	if (typeof window === "undefined") {
		return [];
	}

	const tokens = safeParse(window.localStorage.getItem(TOKENS_STORAGE_KEY), []);
	return Array.isArray(tokens) ? tokens : [];
};

export const getStoredAuthRecord = () => {
	if (typeof window === "undefined") {
		return null;
	}

	return safeParse(window.localStorage.getItem(AUTH_STORAGE_KEY), null);
};

export const getStoredAuth = () => getStoredAuthRecord()?.auth || null;

export const getTokenForAddress = address => {
	const targetAddress = normalizeAddress(address);
	if (!targetAddress) {
		return null;
	}

	return (
		getStoredTokens().find(
			token => normalizeAddress(token?.address) === targetAddress
		) || null
	);
};

export const isJwtExpired = token => {
	if (!token) {
		return true;
	}

	try {
		const decodedToken = jwt_decode(token);
		if (!decodedToken?.exp) {
			return true;
		}
		return decodedToken.exp * 1000 <= Date.now();
	} catch (_error) {
		return true;
	}
};

export const getActiveSession = () => {
	const auth = getStoredAuth();
	const address = auth?.evmAddress || auth?.address || null;
	const tokenEntry = getTokenForAddress(address);
	const token = tokenEntry?.token || null;
	const tokenExpired = isJwtExpired(token);

	return {
		auth,
		address,
		tokenEntry,
		token,
		tokenExpired,
		isAuthenticated: Boolean(auth && token && !tokenExpired),
	};
};

export const getRequiredJwt = () => {
	const session = getActiveSession();
	if (!session.isAuthenticated) {
		throw new Error("Session expired. Please reconnect your wallet.");
	}
	return session.token;
};

export const clearActiveSession = () => {
	if (typeof window === "undefined") {
		return;
	}

	const auth = getStoredAuth();
	const activeAddress = auth?.evmAddress || auth?.address || null;
	const remainingTokens = activeAddress
		? getStoredTokens().filter(
				token =>
					normalizeAddress(token?.address) !== normalizeAddress(activeAddress)
		  )
		: getStoredTokens();

	window.localStorage.setItem(
		TOKENS_STORAGE_KEY,
		JSON.stringify(remainingTokens)
	);
	window.localStorage.removeItem(AUTH_STORAGE_KEY);
	window.localStorage.removeItem("collections");
	window.localStorage.removeItem("sqwid__balance");
	window.dispatchEvent(new Event(SESSION_CLEARED_EVENT));
};

export const isStaleSessionError = error => {
	const status = error?.response?.status;
	return status === 401 || status === 403;
};

export const getApiErrorMessage = (
	error,
	fallback = "Something went wrong."
) =>
	normalizeClientErrorMessage(error, fallback);
