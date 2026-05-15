const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const sharp = require("sharp");
const { ethers } = require("ethers");

const config = require("./config");
const { migrate } = require("./db");
const { provider, marketplace, utility, erc1155 } = require("./contracts");
const {
  addBuffer,
  addJson,
  fetchJson,
  readBuffer,
  sniffMimeType,
} = require("./ipfs");
const { ensureCollectible, startSync } = require("./sync");
const {
  ensureUser,
  getUser,
  setUserNonce,
  getUserNonce,
  updateUserField,
  createCollection,
  getCollection,
  listCollectionsByOwner,
  listCollectionsByStats,
  searchCollections,
  searchUsers,
  getCollectible,
  listCollectiblesByCollection,
  setCollectibleCollection,
  getHearts,
  toggleHeart,
  replaceFeaturedPositions,
  listFeaturedPositions,
  isModerator,
  getAvatar,
  generateNonce,
} = require("./store");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});

const jsonLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

const parseAddress = (address) => {
  try {
    return ethers.utils.getAddress(address);
  } catch (error) {
    return null;
  }
};

const formatEther = (value) => Number(ethers.utils.formatEther(value)).toString();

const formatUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    address: user.address,
    evmAddress: user.evmAddress,
    name: user.name,
    displayName: user.displayName,
    bio: user.bio,
    avatar: user.avatar,
  };
};

const auth = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) {
    return res.status(401).send("Missing token");
  }

  try {
    req.user = jwt.verify(token, config.jwtSecret);
    return next();
  } catch (error) {
    return res.status(403).send("Invalid token.");
  }
};

const optionalAuth = (req, _res, next) => {
  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    try {
      req.user = jwt.verify(authHeader.slice("Bearer ".length), config.jwtSecret);
    } catch (error) {
      req.user = null;
    }
  }
  next();
};

const requireModerator = async (req, res, next) => {
  if (!req.user?.evmAddress) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!(await isModerator(req.user.evmAddress))) {
    return res.status(403).json({ error: "Moderator access required" });
  }

  return next();
};

const readCollectionStats = async (collectionId) => {
  const collectibles = await listCollectiblesByCollection(collectionId);
  return {
    items: collectibles.length,
    itemsSold: 0,
    volume: 0,
    average: 0,
    owners: 0,
  };
};

const readCollectionView = async (collectionId, { includeStats = false } = {}) => {
  const collection = await getCollection(collectionId);
  if (!collection) {
    return null;
  }

  const owner = (await getUser(collection.owner)) || {
    address: collection.owner,
    evmAddress: collection.owner,
    name: collection.owner,
    displayName: collection.owner,
    bio: "",
    avatar: getAvatar(collection.owner),
  };

  const view = {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    image: collection.image,
    thumbnail: collection.thumbnail || collection.image,
    thumb: collection.thumbnail || collection.image,
    traits: collection.traits || {},
    createdAt: collection.created_at,
    owner: collection.owner,
    creator: {
      id: owner.address,
      address: owner.address,
      name: owner.displayName || owner.address,
      thumb: owner.avatar,
    },
  };

  if (includeStats) {
    view.stats = await readCollectionStats(collectionId);
  }

  return view;
};

const utilityFallbackWarnings = new Set();

const warnUtilityFallback = (operation, error) => {
  if (utilityFallbackWarnings.has(operation)) {
    return;
  }

  utilityFallbackWarnings.add(operation);
  console.warn(
    `SqwidMarketplaceUtil unavailable for ${operation}; falling back to direct marketplace reads.`,
    error?.message || error
  );
};

const buildRawPositionFromMarketplace = async (positionId, basePosition = null) => {
  const position = basePosition || (await marketplace.fetchPosition(positionId));
  if (!Number(position.positionId)) {
    return null;
  }

  const item = await marketplace.fetchItem(position.itemId);
  if (!Number(item.itemId)) {
    return null;
  }

  let amount = position.amount;
  let auctionData = {
    deadline: 0,
    minBid: 0,
    highestBidder: ethers.constants.AddressZero,
    highestBid: 0,
    totalAddresses: 0,
  };
  let raffleData = {
    deadline: 0,
    totalValue: 0,
    totalAddresses: 0,
  };
  let loanData = {
    loanAmount: 0,
    feeAmount: 0,
    numMinutes: 0,
    deadline: 0,
    lender: ethers.constants.AddressZero,
  };

  if (Number(position.state) === 0) {
    amount = await erc1155.balanceOf(position.owner, item.tokenId);
  } else if (Number(position.state) === 2) {
    auctionData = await marketplace.fetchAuctionData(positionId);
  } else if (Number(position.state) === 3) {
    raffleData = await marketplace.fetchRaffleData(positionId);
  } else if (Number(position.state) === 4) {
    loanData = await marketplace.fetchLoanData(positionId);
  }

  return {
    positionId: position.positionId,
    item,
    owner: position.owner,
    amount,
    price: position.price,
    marketFee: position.marketFee,
    state: position.state,
    auctionData,
    raffleData,
    loanData,
  };
};

const fetchRawPosition = async (positionId) => {
  try {
    return await utility.fetchPosition(positionId);
  } catch (error) {
    warnUtilityFallback("fetchPosition", error);
    return buildRawPositionFromMarketplace(positionId);
  }
};

const collectRawPositions = async ({ offset = 0, limit = 12, positionFilter }) => {
  const totalPositions = Number(await marketplace.currentPositionId());
  const targetCount = offset + limit;
  const matches = [];

  for (let positionId = 1; positionId <= totalPositions; positionId += 1) {
    const position = await marketplace.fetchPosition(positionId);
    if (!Number(position.positionId)) {
      continue;
    }

    if (positionFilter && !positionFilter(position)) {
      continue;
    }

    const rawPosition = await buildRawPositionFromMarketplace(positionId, position);
    if (!rawPosition || Number(rawPosition.amount) <= 0) {
      continue;
    }

    matches.push(rawPosition);
    if (matches.length >= targetCount) {
      break;
    }
  }

  return matches.slice(offset, offset + limit);
};

const readPositionView = async (positionId, rawPosition = null) => {
  const raw = rawPosition || (await fetchRawPosition(positionId));
  if (!raw || !Number(raw.positionId)) {
    return null;
  }

  const itemId = Number(raw.item.itemId);
  const tokenId = Number(raw.item.tokenId);
  let collectible = await getCollectible(itemId);
  if (!collectible || !collectible.meta || Object.keys(collectible.meta).length === 0) {
    collectible = await ensureCollectible(itemId);
  }

  const collectionId = collectible?.collectionId || config.defaultCollectionId;
  const collection = await readCollectionView(collectionId);
  const creator =
    (await getUser(raw.item.creator)) || {
      address: raw.item.creator,
      evmAddress: raw.item.creator,
      displayName: raw.item.creator,
      name: raw.item.creator,
      bio: "",
      avatar: getAvatar(raw.item.creator),
    };
  const owner =
    (await getUser(raw.owner)) || {
      address: raw.owner,
      evmAddress: raw.owner,
      displayName: raw.owner,
      name: raw.owner,
      bio: "",
      avatar: getAvatar(raw.owner),
    };

  const royaltyInfo = await erc1155.royaltyInfo(tokenId, 100);

  return {
    approved: collectible?.approved ?? true,
    positionId: Number(raw.positionId),
    itemId,
    tokenId,
    hearts: await getHearts(itemId),
    collection,
    creator: {
      address: creator.address,
      avatar: creator.avatar,
      name: creator.displayName || creator.address,
      royalty: Number(royaltyInfo.royaltyAmount),
      royaltyReceivers: [
        {
          receiver: royaltyInfo.receiver,
          share: 100,
        },
      ],
    },
    owner: {
      address: owner.address,
      avatar: owner.avatar,
      name: owner.displayName || owner.address,
    },
    amount: Number(raw.amount),
    sale:
      Number(raw.state) === 1
        ? {
            price: formatEther(raw.price),
          }
        : null,
    auction:
      Number(raw.state) === 2
        ? {
            deadline: Number(raw.auctionData.deadline),
            minBid: formatEther(raw.auctionData.minBid),
            highestBid: formatEther(raw.auctionData.highestBid),
            highestBidder: {
              address: raw.auctionData.highestBidder,
              name:
                (await getUser(raw.auctionData.highestBidder))?.displayName ||
                raw.auctionData.highestBidder,
            },
          }
        : null,
    raffle:
      Number(raw.state) === 3
        ? {
            deadline: Number(raw.raffleData.deadline),
            totalValue: formatEther(raw.raffleData.totalValue),
            totalAddresses: Number(raw.raffleData.totalAddresses),
          }
        : null,
    loan:
      Number(raw.state) === 4
        ? {
            deadline: Number(raw.loanData.deadline),
            loanAmount: formatEther(raw.loanData.loanAmount),
            feeAmount: formatEther(raw.loanData.feeAmount),
            numMinutes: Number(raw.loanData.numMinutes),
            lender: {
              address: raw.loanData.lender,
              name:
                (await getUser(raw.loanData.lender))?.displayName ||
                raw.loanData.lender,
            },
          }
        : null,
    marketFee: Number(raw.marketFee),
    state: Number(raw.state),
    meta: {
      ...(collectible?.meta || {}),
      uri: collectible?.uri,
      tokenContract: raw.item.nftContract,
    },
  };
};

const readStatePositions = async (state, offset = 0, limit = 12) => {
  try {
    const pageSize = Math.max(limit, 25);
    let pageNumber = 1;
    let totalPages = 1;
    let collected = [];

    while (pageNumber <= totalPages && collected.length < offset + limit) {
      const page = await utility.fetchPositionsByStatePage(state, pageSize, pageNumber);
      totalPages = Number(page.totalPages || page[1] || 0);
      const positions = page.positions || page[0] || [];
      collected = collected.concat(
        positions.filter((position) => Number(position.positionId) > 0)
      );
      pageNumber += 1;
    }

    const slice = collected.slice(offset, offset + limit);
    return Promise.all(slice.map((position) => readPositionView(Number(position.positionId))));
  } catch (error) {
    warnUtilityFallback("fetchPositionsByStatePage", error);
    const positions = await collectRawPositions({
      offset,
      limit,
      positionFilter: (position) => Number(position.state) === state,
    });
    return Promise.all(
      positions.map((position) => readPositionView(Number(position.positionId), position))
    );
  }
};

const readAddressPositions = async (address, state, offset = 0, limit = 12) => {
  try {
    const pageSize = Math.max(limit, 25);
    let pageNumber = 1;
    let totalPages = 1;
    let collected = [];

    while (pageNumber <= totalPages && collected.length < offset + limit) {
      const page = await utility.fetchAddressPositionsPage(address, pageSize, pageNumber);
      totalPages = Number(page.totalPages || page[1] || 0);
      let positions = page.positions || page[0] || [];
      positions = positions.filter((position) => Number(position.positionId) > 0);
      if (typeof state === "number") {
        positions = positions.filter((position) => Number(position.state) === state);
      }
      collected = collected.concat(positions);
      pageNumber += 1;
    }

    const slice = collected.slice(offset, offset + limit);
    return Promise.all(slice.map((position) => readPositionView(Number(position.positionId))));
  } catch (error) {
    warnUtilityFallback("fetchAddressPositionsPage", error);
    const positions = await collectRawPositions({
      offset,
      limit,
      positionFilter: (position) => {
        if (position.owner.toLowerCase() !== address.toLowerCase()) {
          return false;
        }

        return typeof state === "number" ? Number(position.state) === state : true;
      },
    });
    return Promise.all(
      positions.map((position) => readPositionView(Number(position.positionId), position))
    );
  }
};

const readCollectionPositions = async (collectionId, state, offset = 0, limit = 12) => {
  const states = typeof state === "number" ? [state] : [0, 1, 2, 3, 4];
  let positions = [];

  for (const currentState of states) {
    const currentPositions = await readStatePositions(currentState, 0, 100);
    positions = positions.concat(currentPositions);
  }

  positions = positions.filter(
    (position) => position?.collection?.id === collectionId
  );

  return positions.slice(offset, offset + limit);
};

const createJwt = (address) =>
  jwt.sign(
    {
      address,
      evmAddress: address,
    },
    config.jwtSecret,
    { expiresIn: "7d" }
  );

const buildMarketplacePayload = async (positions) => ({
  items: positions.filter(Boolean),
  pagination: {
    lowest: positions.length,
    limit: positions.length,
  },
});

const start = async () => {
  await migrate();
  await startSync();

  const app = express();
  app.set("trust proxy", 1);
  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );
  app.use(morgan("dev"));
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));
  app.use(jsonLimiter);

  app.get("/", (_req, res) => {
    res.json({
      name: "@sqwid/backend",
      chainId: config.chainId,
      rpcUrl: config.rpcUrl,
      healthy: true,
    });
  });

  app.get("/hc", (_req, res) => {
    res.status(200).send("OK");
  });

  app.get("/verifyjwt", auth, (req, res) => {
    res.json({ ok: true, user: req.user });
  });

  app.get("/nonce", async (req, res) => {
    const address = parseAddress(req.query.address);
    if (!address) {
      return res.status(400).json({ error: "Invalid address" });
    }

    await ensureUser(address);
    let nonce = await getUserNonce(address);
    if (!nonce) {
      nonce = generateNonce();
      await setUserNonce(address, nonce);
    }

    return res.json({ nonce });
  });

  app.post("/auth", async (req, res) => {
    const address = parseAddress(req.body.address);
    const signature = req.body.signature;

    if (!address || !signature) {
      return res.status(400).json({ status: "error", message: "Invalid auth payload" });
    }

    await ensureUser(address);
    const nonce = await getUserNonce(address);
    const recovered = parseAddress(ethers.utils.verifyMessage(nonce, signature));

    if (!recovered || recovered !== address) {
      return res.status(400).json({ status: "error", message: "Invalid signature" });
    }

    await setUserNonce(address, generateNonce());
    return res.json({
      status: "success",
      token: createJwt(address),
      message: "Valid signature",
    });
  });

  app.get("/get/user/:address", async (req, res) => {
    const address = parseAddress(req.params.address);
    if (!address) {
      return res.status(400).json({ error: "Invalid address" });
    }

    const user = (await getUser(address)) || (await ensureUser(address));
    return res.json(formatUser(user));
  });

  app.post("/edit/user/:field", auth, async (req, res) => {
    const value = typeof req.body[req.params.field] === "string" ? req.body[req.params.field] : "";
    const user = await updateUserField(req.user.evmAddress, req.params.field, value);
    return res.json(formatUser(user));
  });

  app.get("/get/collections/owner/:address", async (req, res) => {
    const address = parseAddress(req.params.address);
    if (!address) {
      return res.status(400).json({ error: "Invalid address" });
    }

    const rows = await listCollectionsByOwner(address);
    const collections = await Promise.all(
      rows.map((row) => readCollectionView(row.id, { includeStats: true }))
    );
    return res.json({ collections });
  });

  app.get("/get/collections/id/:id", async (req, res) => {
    const collection = await readCollectionView(req.params.id, { includeStats: true });
    if (!collection) {
      return res.status(404).json({ error: "Collection not found" });
    }
    return res.json(collection);
  });

  app.get("/get/collections/all/by/:sortField", async (req, res) => {
    const limit = Math.min(Number(req.query.limit || 8), 50);
    const requestedSortField = (req.params.sortField || "items").replace(/^stats\./, "");
    const sortField = ["items", "itemsSold", "volume", "average", "latest"].includes(requestedSortField)
      ? requestedSortField
      : "items";
    const sortDirection = req.query.sorting === "asc" ? "asc" : "desc";
    const rows = await listCollectionsByStats(200);
    const collections = await Promise.all(
      rows.map((row) => readCollectionView(row.id, { includeStats: true }))
    );
    collections.sort((left, right) => {
      const leftValue =
        sortField === "latest"
          ? Date.parse(left?.createdAt || 0)
          : Number(left?.stats?.[sortField] || 0);
      const rightValue =
        sortField === "latest"
          ? Date.parse(right?.createdAt || 0)
          : Number(right?.stats?.[sortField] || 0);

      if (rightValue !== leftValue) {
        return sortDirection === "asc"
          ? leftValue - rightValue
          : rightValue - leftValue;
      }

      const createdAtCompare =
        Date.parse(right?.createdAt || 0) - Date.parse(left?.createdAt || 0);
      if (createdAtCompare !== 0) {
        return createdAtCompare;
      }

      return (left?.name || "").localeCompare(right?.name || "");
    });
    return res.json({ collections: collections.slice(0, limit) });
  });

  app.get("/search/all/:term", async (req, res) => {
    const term = req.params.term || "";
    const [collectionsResult, usersResult] = await Promise.all([
      searchCollections(term, 1, 5),
      searchUsers(term, 1, 5),
    ]);

    const collections = await Promise.all(
      collectionsResult.collections.map(async (collection) => ({
        ...(await readCollectionView(collection.id, { includeStats: true })),
        searchMeta: collection.searchMeta,
      }))
    );

    return res.json({
      collections,
      users: usersResult.users,
      totals: {
        collections: collectionsResult.total,
        users: usersResult.total,
      },
      insight: collectionsResult.insight,
    });
  });

  app.get("/search/collections/:term", async (req, res) => {
    const page = Math.max(Number(req.query.page || 1), 1);
    const perPage = Math.min(Number(req.query.perPage || 10), 50);
    const result = await searchCollections(req.params.term || "", page, perPage);
    return res.json({
      collections: await Promise.all(
        result.collections.map(async (collection) => ({
          ...(await readCollectionView(collection.id, { includeStats: true })),
          searchMeta: collection.searchMeta,
        }))
      ),
      total: result.total,
      insight: result.insight,
    });
  });

  app.get("/search/users/:term", async (req, res) => {
    const page = Math.max(Number(req.query.page || 1), 1);
    const perPage = Math.min(Number(req.query.perPage || 10), 50);
    const result = await searchUsers(req.params.term || "", page, perPage);
    return res.json({
      users: result.users,
      total: result.total,
      insight: result.insight,
    });
  });

  app.get("/ipfs/*", async (req, res, next) => {
    try {
      const ipfsPath = req.params[0];
      if (!ipfsPath) {
        return res.status(404).send("Missing IPFS path");
      }

      const buffer = await readBuffer(ipfsPath);
      if (!buffer.length) {
        return res.status(404).send("IPFS content not found");
      }

      const filenameHint = req.query.filename || req.query.name || ipfsPath;
      res.set("Content-Type", sniffMimeType(buffer, filenameHint));
      res.set("Cache-Control", "public, max-age=31536000, immutable");
      res.set("Cross-Origin-Resource-Policy", "cross-origin");
      return res.send(buffer);
    } catch (error) {
      const message = error?.message || "";
      if (
        /not found/i.test(message) ||
        /no link named/i.test(message) ||
        /does not exist/i.test(message)
      ) {
        return res.status(404).send("IPFS content not found");
      }

      return next(error);
    }
  });

  app.post(
    "/create/collection",
    auth,
    upload.single("fileData"),
    async (req, res, next) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "Collection image is required" });
        }

        const collectionId = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
        const [thumbnail, image] = await Promise.all([
          sharp(req.file.buffer)
            .resize({ width: 128, height: 128, fit: "inside", withoutEnlargement: true })
            .webp()
            .toBuffer(),
          sharp(req.file.buffer)
            .resize({ width: 512, height: 512, fit: "inside", withoutEnlargement: true })
            .webp()
            .toBuffer(),
        ]);

        const [thumbnailUri, imageUri] = await Promise.all([
          addBuffer(thumbnail),
          addBuffer(image),
        ]);

        await createCollection({
          id: collectionId,
          owner: req.user.evmAddress,
          name: req.body.name || "Untitled Collection",
          description: req.body.description || "",
          image: imageUri,
          thumbnail: thumbnailUri,
        });

        return res.status(201).json({
          id: collectionId,
          name: req.body.name || "Untitled Collection",
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.post(
    "/create/collectible/upload",
    auth,
    upload.fields([
      { name: "coverData", maxCount: 1 },
      { name: "fileData", maxCount: 1 },
    ]),
    async (req, res, next) => {
      try {
        const file = req.files?.fileData?.[0];
        const cover = req.files?.coverData?.[0] || file;
        if (!file || !cover) {
          return res.status(400).json({ error: "Missing collectible media" });
        }

        let thumbnailBuffer = cover.buffer;
        let imageBuffer = cover.buffer;

        if (cover.mimetype.startsWith("image/")) {
          [thumbnailBuffer, imageBuffer] = await Promise.all([
            sharp(cover.buffer)
              .resize({ width: 256, height: 256, fit: "inside", withoutEnlargement: true })
              .webp()
              .toBuffer(),
            sharp(cover.buffer)
              .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
              .webp()
              .toBuffer(),
          ]);
        }

        const [thumbnailUri, imageUri, mediaUri] = await Promise.all([
          addBuffer(thumbnailBuffer),
          addBuffer(imageBuffer),
          addBuffer(file.buffer),
        ]);

        const metadata = {
          name: req.body.name || "Untitled Sqwid",
          description: req.body.description || "",
          image: imageUri,
          media: mediaUri,
          thumbnail: thumbnailUri,
          attributes: JSON.parse(req.body.properties || "[]"),
          mimetype: file.mimetype,
        };

        const metadataUri = await addJson(metadata);
        return res.json({ metadata: metadataUri });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.post("/create/collectible/verify", auth, async (req, res, next) => {
    try {
      const itemId = Number(req.body.id);
      const collectionId = req.body.collection || config.defaultCollectionId;
      const collection = await getCollection(collectionId);
      if (!collection) {
        return res.status(404).json({ error: "Collection not found" });
      }

      const collectible = await ensureCollectible(itemId, {
        collectionId,
        approved: true,
      });
      await setCollectibleCollection(itemId, collectionId, true);
      return res.json({
        message: "Item verified.",
        collectible,
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/get/marketplace/summary", async (_req, res, next) => {
    try {
      const [sale, auction, raffle, loan] = await Promise.all([
        readStatePositions(1, 0, 4),
        readStatePositions(2, 0, 4),
        readStatePositions(3, 0, 4),
        readStatePositions(4, 0, 4),
      ]);
      return res.json({ sale, auction, raffle, loan });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/get/marketplace/featured", async (_req, res, next) => {
    try {
      const ids = await listFeaturedPositions();
      const featured = await Promise.all(ids.map((id) => readPositionView(id)));
      return res.json({ featured: featured.filter(Boolean) });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/edit/featured", auth, requireModerator, async (req, res, next) => {
    try {
      await replaceFeaturedPositions(req.body.ids || []);
      return res.json({ ok: true });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/get/marketplace/collection/:id", async (req, res) => {
    const collection = await readCollectionView(req.params.id, { includeStats: true });
    if (!collection) {
      return res.status(404).json({ error: "Collection not found" });
    }
    return res.json(collection);
  });

  app.get("/get/marketplace/collection/:id/stats", async (req, res) => {
    return res.json(await readCollectionStats(req.params.id));
  });

  app.get("/get/marketplace/position/:positionId", async (req, res, next) => {
    try {
      const item = await readPositionView(Number(req.params.positionId));
      if (!item) {
        return res.status(404).json({ error: "Position not found" });
      }
      return res.json(item);
    } catch (error) {
      return next(error);
    }
  });

  app.get("/get/marketplace/all/:state", async (req, res, next) => {
    try {
      const state = Number(req.params.state);
      const limit = Math.min(Number(req.query.limit || 12), 100);
      const startFrom = Math.max(Number(req.query.startFrom || 0), 0);
      return res.json(
        await buildMarketplacePayload(await readStatePositions(state, startFrom, limit))
      );
    } catch (error) {
      return next(error);
    }
  });

  app.get("/get/marketplace/by-owner/:address/:state?", async (req, res, next) => {
    try {
      const address = parseAddress(req.params.address);
      if (!address) {
        return res.status(400).json({ error: "Invalid address" });
      }

      const limit = Math.min(Number(req.query.limit || 12), 100);
      const startFrom = Math.max(Number(req.query.startFrom || 0), 0);
      const state =
        typeof req.params.state === "string" ? Number(req.params.state) : undefined;

      return res.json(
        await buildMarketplacePayload(await readAddressPositions(address, state, startFrom, limit))
      );
    } catch (error) {
      return next(error);
    }
  });

  app.get("/get/marketplace/by-collection/:id/:state?", async (req, res, next) => {
    try {
      const limit = Math.min(Number(req.query.limit || 12), 100);
      const startFrom = Math.max(Number(req.query.startFrom || 0), 0);
      const state =
        typeof req.params.state === "string" ? Number(req.params.state) : undefined;
      return res.json(
        await buildMarketplacePayload(
          await readCollectionPositions(req.params.id, state, startFrom, limit)
        )
      );
    } catch (error) {
      return next(error);
    }
  });

  app.get("/get/marketplace/balance", auth, async (req, res, next) => {
    try {
      const balance = await provider.getBalance(req.user.evmAddress);
      return res.json({ balance: formatEther(balance) });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/get/marketplace/withdrawable", auth, async (req, res, next) => {
    try {
      const balance = await marketplace.addressBalance(req.user.evmAddress);
      return res.json({ balance: formatEther(balance) });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/get/marketplace/bids", auth, async (req, res, next) => {
    try {
      const pageNumber = Math.max(Number(req.query.page || 1), 1);
      const pageSize = Math.min(Number(req.query.pageSize || 10), 50);
      try {
        const response = await utility.fetchAddressBidsPage(
          req.user.evmAddress,
          pageSize,
          pageNumber,
          false
        );
        const bids = await Promise.all(
          (response.bids || response[0] || [])
            .filter((entry) => Number(entry.auction.positionId) > 0)
            .map(async (entry) => ({
              auction: await readPositionView(Number(entry.auction.positionId)),
              bidAmount: formatEther(entry.bidAmount),
            }))
        );

        return res.json({
          bids,
          pagination: {
            totalPages: Number(response.totalPages || response[1] || 1),
            page: pageNumber,
            pageSize,
          },
        });
      } catch (error) {
        warnUtilityFallback("fetchAddressBidsPage", error);

        const matchedBids = [];
        const totalPositions = Number(await marketplace.currentPositionId());

        for (let positionId = 1; positionId <= totalPositions; positionId += 1) {
          const position = await marketplace.fetchPosition(positionId);
          if (!Number(position.positionId) || Number(position.state) !== 2) {
            continue;
          }

          const auctionData = await marketplace.fetchAuctionData(positionId);
          const totalAddresses = Number(auctionData.totalAddresses || 0);

          for (let bidIndex = 0; bidIndex < totalAddresses; bidIndex += 1) {
            const [bidder, bidAmount] = await marketplace.fetchBid(positionId, bidIndex);
            if (bidder.toLowerCase() !== req.user.evmAddress.toLowerCase()) {
              continue;
            }

            const auction = await buildRawPositionFromMarketplace(positionId, position);
            if (auction && Number(auction.amount) > 0) {
              matchedBids.push({ auction, bidAmount });
            }
            break;
          }
        }

        const totalPages =
          matchedBids.length > 0 ? Math.ceil(matchedBids.length / pageSize) : 0;
        const startIndex = (pageNumber - 1) * pageSize;
        const slice = matchedBids.slice(startIndex, startIndex + pageSize);
        const bids = await Promise.all(
          slice.map(async (entry) => ({
            auction: await readPositionView(Number(entry.auction.positionId), entry.auction),
            bidAmount: formatEther(entry.bidAmount),
          }))
        );

        return res.json({
          bids,
          pagination: {
            totalPages,
            page: pageNumber,
            pageSize,
          },
        });
      }
    } catch (error) {
      return next(error);
    }
  });

  app.get("/get/marketplace/claimables", auth, (_req, res) => {
    res.json([]);
  });

  app.get("/get/marketplace/claimables/count", auth, (_req, res) => {
    res.json({ count: 0 });
  });

  app.post("/claim/:tokenId", auth, (_req, res) => {
    res.json({ ok: true, claimed: false });
  });

  app.get("/get/marketplace/available-collection/:owner/:positionId", optionalAuth, async (req, res, next) => {
    try {
      const position = await fetchRawPosition(Number(req.params.positionId));
      if (!position) {
        return res.status(404).json({ error: "Position not found" });
      }
      const balance = await erc1155.balanceOf(req.params.owner, position.item.tokenId);
      return res.json([{ amount: Number(balance) }]);
    } catch (error) {
      return next(error);
    }
  });

  app.post("/heart/:itemId", auth, async (req, res, next) => {
    try {
      const hearts = await toggleHeart(Number(req.params.itemId), req.user.evmAddress);
      return res.json({ hearts });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/get/moderators/:address", async (req, res) => {
    const address = parseAddress(req.params.address);
    if (!address) {
      return res.status(400).json(false);
    }
    return res.json(await isModerator(address));
  });

  app.post("/edit/moderators", auth, requireModerator, async (req, res, next) => {
    try {
      if (req.body.collectionId) {
        await setCollectibleCollection(Number(req.body.itemId), req.body.collectionId, true);
      }
      return res.json({ data: true });
    } catch (error) {
      return next(error);
    }
  });

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({
      error: error.message || "Internal server error",
    });
  });

  app.listen(config.port, () => {
    console.log(`Backend listening on port ${config.port}`);
  });
};

module.exports = {
  start,
};
