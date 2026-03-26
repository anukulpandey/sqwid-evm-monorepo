import { getCIDv1 } from "./getCIDv1";
import { getBackend } from "./network";

const isDirectUrl = url => /^(https?:|data:|blob:)/i.test(url || "");

const normalizeIpfsPath = url => {
	if (!url) {
		return "";
	}

	if (url.startsWith("ipfs://")) {
		return url.slice("ipfs://".length);
	}

	try {
		const parsed = new URL(url);
		const match = parsed.pathname.match(/^\/ipfs\/(.+)$/);
		if (match) {
			return `${decodeURIComponent(match[1])}${parsed.search}${parsed.hash}`;
		}
	} catch (_error) {
		// Ignore parse errors and fall back to manual normalization.
	}

	return url.replace(/^\/+/, "");
};

const buildLocalIpfsUrl = url => {
	if (!url) {
		return "";
	}

	if (isDirectUrl(url)) {
		return url;
	}

	const ipfsPath = normalizeIpfsPath(url);
	if (!ipfsPath) {
		return "";
	}

	return `${getBackend().replace(/\/$/, "")}/ipfs/${ipfsPath}`;
};

export const getCloudflareURL = url => buildLocalIpfsUrl(url);

export const getDwebURL = url => {
	if (isDirectUrl(url)) {
		return url;
	}

	try {
		return buildLocalIpfsUrl(`ipfs://${getCIDv1(url)}`);
	} catch (_error) {
		return buildLocalIpfsUrl(url);
	}
};

// export const getInfuraURL = url =>
// 	`https://${getCIDv1(url)}.ipfs.infura-ipfs.io/`;

export const getInfuraURL = url => buildLocalIpfsUrl(url);

const getIPFSURL = url => buildLocalIpfsUrl(url);

export default getIPFSURL;
