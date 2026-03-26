const axios = require("axios");
const mime = require("mime-types");
const { create } = require("ipfs-http-client");
const config = require("./config");

let client;

const getClient = () => {
  if (!client) {
    client = create({ url: config.ipfsApiUrl });
  }
  return client;
};

const normalizeIpfsPath = (uri) => {
  if (!uri) {
    return null;
  }

  if (uri.startsWith("ipfs://")) {
    return uri.slice("ipfs://".length);
  }

  try {
    const parsed = new URL(uri);
    const match = parsed.pathname.match(/^\/ipfs\/(.+)$/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
  } catch (_error) {
    // Ignore URL parsing errors and fall back to treating the input as a raw path.
  }

  return uri.replace(/^\/+/, "");
};

const toGatewayUrl = (uri) => {
  if (!uri) {
    return null;
  }

  if (uri.startsWith("ipfs://")) {
    return `${config.ipfsGatewayUrl}${normalizeIpfsPath(uri)}`;
  }

  return uri;
};

const isHttpUrl = (uri) => /^https?:\/\//i.test(uri || "");

const readBuffer = async (uri) => {
  const ipfsPath = normalizeIpfsPath(uri);
  if (!ipfsPath) {
    return Buffer.alloc(0);
  }

  const chunks = [];
  for await (const chunk of getClient().cat(ipfsPath)) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
};

const sniffMimeType = (buffer, hint = "") => {
  const hinted = hint ? mime.lookup(hint) : false;
  if (hinted) {
    return hinted.toString();
  }

  if (!buffer?.length) {
    return "application/octet-stream";
  }

  const prefix = buffer.subarray(0, 64).toString("utf8").trimStart();
  if (prefix.startsWith("<svg") || prefix.startsWith("<?xml")) {
    return "image/svg+xml";
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (buffer.length >= 6 && buffer.subarray(0, 6).toString("ascii").startsWith("GIF8")) {
    return "image/gif";
  }

  if (buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    return "video/mp4";
  }

  if (
    buffer.length >= 3 &&
    (buffer.subarray(0, 3).toString("ascii") === "ID3" ||
      (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0))
  ) {
    return "audio/mpeg";
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WAVE"
  ) {
    return "audio/wav";
  }

  if (prefix.startsWith("{") || prefix.startsWith("[")) {
    return "application/json";
  }

  return "application/octet-stream";
};

const addBuffer = async (buffer) => {
  const result = await getClient().add(buffer);
  return `ipfs://${result.cid.toString()}`;
};

const addJson = async (payload) =>
  addBuffer(Buffer.from(JSON.stringify(payload, null, 2)));

const fetchJson = async (uri) => {
  if (!isHttpUrl(uri)) {
    const buffer = await readBuffer(uri);
    return JSON.parse(buffer.toString("utf8"));
  }

  const response = await axios.get(toGatewayUrl(uri), {
    timeout: 10000,
    maxRedirects: 5,
  });
  return response.data;
};

module.exports = {
  addBuffer,
  addJson,
  fetchJson,
  normalizeIpfsPath,
  readBuffer,
  sniffMimeType,
  toGatewayUrl,
};
