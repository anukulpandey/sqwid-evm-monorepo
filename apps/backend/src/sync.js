const config = require("./config");
const { marketplace, erc1155 } = require("./contracts");
const { fetchJson } = require("./ipfs");
const {
  getCollectible,
  getSyncValue,
  setSyncValue,
  upsertCollectible,
} = require("./store");

const hasMarketplaceCode = async () => {
  const code = await marketplace.provider.getCode(marketplace.address);
  return Boolean(code && code !== "0x");
};

const ensureCollectible = async (itemId, overrides = {}) => {
  const existing = await getCollectible(itemId);
  if (existing?.meta && Object.keys(existing.meta).length > 0 && !overrides.force) {
    return existing;
  }

  const item = await marketplace.fetchItem(itemId);
  if (!Number(item.itemId)) {
    return null;
  }

  const uri = await erc1155.uri(item.tokenId);
  let meta = {};
  try {
    meta = await fetchJson(uri);
  } catch (error) {
    meta = {};
  }

  return upsertCollectible({
    itemId: Number(item.itemId),
    tokenId: Number(item.tokenId),
    collectionId:
      overrides.collectionId || existing?.collectionId || config.defaultCollectionId,
    creator: item.creator,
    uri,
    approved: overrides.approved ?? existing?.approved ?? true,
    meta,
  });
};

const syncItems = async () => {
  const totalItems = Number(await marketplace.currentItemId());
  const syncState = (await getSyncValue("items", { lastSyncedItemId: 0 })) || {
    lastSyncedItemId: 0,
  };
  const lastSyncedItemId = Number(syncState.lastSyncedItemId || 0);

  for (let itemId = lastSyncedItemId + 1; itemId <= totalItems; itemId += 1) {
    await ensureCollectible(itemId);
  }

  await setSyncValue("items", {
    lastSyncedItemId: totalItems,
    syncedAt: new Date().toISOString(),
  });
};

const startSync = async () => {
  try {
    const marketplaceAvailable = await hasMarketplaceCode();
    if (!marketplaceAvailable) {
      console.warn(
        `Skipping sync loop: no runtime code found at marketplace ${marketplace.address}`
      );
      return;
    }
  } catch (error) {
    console.error("Unable to verify marketplace code before starting sync", error);
    return;
  }

  try {
    await syncItems();
  } catch (error) {
    console.error("Initial sync failed", error);
    return;
  }

  let consecutiveFailures = 0;

  const intervalId = setInterval(() => {
    syncItems()
      .then(() => {
        consecutiveFailures = 0;
      })
      .catch((error) => {
        consecutiveFailures += 1;
        console.error("Sync loop failed", error);

        if (consecutiveFailures >= 3) {
          console.error("Disabling sync loop after repeated failures");
          clearInterval(intervalId);
        }
      });
  }, 30000);
};

module.exports = {
  ensureCollectible,
  syncItems,
  startSync,
};
