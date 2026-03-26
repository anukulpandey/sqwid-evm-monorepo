const { expect } = require("chai");
const { ethers } = require("hardhat");

exports.toReef = (value) => {
    return ethers.utils.parseUnits(value.toString(), "ether");
};

exports.toWei = (value) => {
    return ethers.utils.parseUnits(value.toString(), "wei");
};

exports.getBalance = async (balanceHelper, address, name) => {
    const balance = await balanceHelper.balanceOf(address);
    if (name != "") {
        const balanceFormatted = Number(ethers.utils.formatUnits(balance.toString(), "ether"));
        console.log(`\t\tBalance of ${name}:`, balanceFormatted);
    }

    return balance;
};

formatBigNumber = (bigNumber) => {
    return Number(ethers.utils.formatUnits(bigNumber.toString(), "ether"));
};

exports.throwsException = async (promise, message) => {
    try {
        await promise;
        console.log("Promise was expected to throw error but did not.");
        assert(false);
    } catch (error) {
        expect(error.message).contains(message);
    }
};

exports.logEvents = async (promise) => {
    const tx = await promise;
    const receipt = await tx.wait();

    let msg = "No events for this tx";
    if (receipt.events) {
        const eventsArgs = [];
        receipt.events.forEach((event) => {
            if (event.args) {
                eventsArgs.push(event.args);
            }
        });
        msg = eventsArgs;
    }
    console.log(msg);
};

exports.delay = (ms) => new Promise((res) => setTimeout(res, ms));

exports.latestTimestamp = async () => {
    const block = await ethers.provider.getBlock("latest");
    return Number(block.timestamp);
};

exports.advanceTime = async (seconds) => {
    if (seconds <= 0) {
        return;
    }

    await ethers.provider.send("evm_increaseTime", [Math.ceil(seconds)]);
    await ethers.provider.send("evm_mine", []);
};

exports.getNamedSigners = async () => {
    const signers = await ethers.getSigners();
    return {
        account1: signers[0],
        account2: signers[1],
        account3: signers[2],
        account4: signers[3],
        account5: signers[4],
        account6: signers[5],
        account7: signers[6],
        account8: signers[7],
    };
};

exports.getMainContracts = async (marketFee, owner) => {
    console.log("\tdeploying NFT contract...");
    const NFT = await ethers.getContractFactory("SqwidERC1155", owner);
    const nft = await NFT.deploy();
    await nft.deployed();
    console.log(`\tNFT contact deployed ${nft.address}`);

    console.log("\tdeploying Market contract...");
    const Market = await ethers.getContractFactory("SqwidMarketplace", owner);
    const market = await Market.deploy(marketFee, nft.address);
    await market.deployed();
    console.log(`\tMarket contract deployed in ${market.address}`);

    console.log("\tdeploying Util contract...");
    const MarketUtil = await ethers.getContractFactory("SqwidMarketplaceUtil", owner);
    const marketUtil = await MarketUtil.deploy(market.address);
    await marketUtil.deployed();
    console.log(`\tUtil contract deployed in ${marketUtil.address}`);

    return { nft, market, marketUtil };
};

exports.getDummyNfts = async () => {
    console.log("\tdeploying DummyERC721 contract...");
    const DummyERC721 = await ethers.getContractFactory("DummyERC721");
    const dummyERC721 = await DummyERC721.deploy();
    await dummyERC721.deployed();
    console.log(`\tDummyERC721 contact deployed ${dummyERC721.address}`);

    console.log("\tdeploying DummyERC1155 contract...");
    const DummyERC1155 = await ethers.getContractFactory("DummyERC1155");
    const dummyERC1155 = await DummyERC1155.deploy();
    await dummyERC1155.deployed();
    console.log(`\tDummyERC1155 contract deployed in ${dummyERC1155.address}`);

    console.log("\tdeploying DummyERC721Royalties contract...");
    const DummyERC721Roy = await ethers.getContractFactory("DummyERC721Royalties");
    const dummyERC721Roy = await DummyERC721Roy.deploy();
    await dummyERC721Roy.deployed();
    console.log(`\tDummyERC721Roy contract deployed in ${dummyERC721Roy.address}`);

    return { dummyERC721, dummyERC1155, dummyERC721Roy };
};

exports.getBalanceHelper = async () => {
    console.log("\tdeploying BalanceHelper contract...");
    const BalanceHelper = await ethers.getContractFactory("BalanceHelper");
    const balanceHelper = await BalanceHelper.deploy();
    await balanceHelper.deployed();
    console.log(`\tBalanceHelper contact deployed ${balanceHelper.address}`);

    return balanceHelper;
};
