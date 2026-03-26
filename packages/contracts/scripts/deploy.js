require("dotenv").config();

const {
    getNetworkSettings,
    getDeployer,
    assertTargetNetwork,
    assertHasCode,
    loadManifest,
    saveManifest,
    upsertContracts,
} = require("./lib/deployment");

async function main() {
    console.log("starting deployment...");
    const { rpcUrl, chainId, marketFeeBps } = getNetworkSettings();
    const deployerAccount = await getDeployer(hre);
    const deployerAddress = await deployerAccount.getAddress();
    await assertTargetNetwork(hre, chainId);
    console.log(`network=${hre.network.name} chainId=${chainId} rpc=${rpcUrl}`);
    console.log(`deployer=${deployerAddress}`);

    // Deploy SqwidERC1155
    const NFT = await hre.ethers.getContractFactory("SqwidERC1155", deployerAccount);
    const nft = await NFT.deploy();
    await nft.deployed();
    await assertHasCode(hre, nft.address, "SqwidERC1155");
    console.log(`SqwidERC1155 deployed to ${nft.address}`);

    // Deploy SqwidMarketplace
    const Marketplace = await hre.ethers.getContractFactory("SqwidMarketplace", deployerAccount);
    const marketplace = await Marketplace.deploy(marketFeeBps, nft.address);
    await marketplace.deployed();
    await assertHasCode(hre, marketplace.address, "SqwidMarketplace");
    console.log(`SqwidMarketplace deployed in ${marketplace.address}`);

    // Deploy SqwidMarketplaceUtil
    const MarketUtil = await hre.ethers.getContractFactory(
        "SqwidMarketplaceUtil",
        deployerAccount
    );
    const marketUtil = await MarketUtil.deploy(marketplace.address);
    await marketUtil.deployed();
    await assertHasCode(hre, marketUtil.address, "SqwidMarketplaceUtil");
    console.log(`SqwidMarketplaceUtil deployed in ${marketUtil.address}`);

    const manifest = loadManifest(chainId);
    manifest.network = {
        name: hre.network.name,
        chainId,
        rpcUrl,
    };
    manifest.deployer = deployerAddress;
    upsertContracts(manifest, {
        SqwidERC1155: {
            address: nft.address,
            transactionHash: nft.deployTransaction.hash,
            constructorArgs: [],
        },
        SqwidMarketplace: {
            address: marketplace.address,
            transactionHash: marketplace.deployTransaction.hash,
            constructorArgs: [marketFeeBps, nft.address],
        },
        SqwidMarketplaceUtil: {
            address: marketUtil.address,
            transactionHash: marketUtil.deployTransaction.hash,
            constructorArgs: [marketplace.address],
        },
    });
    const savedPath = saveManifest(manifest);
    console.log(`deployment manifest written to ${savedPath}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
