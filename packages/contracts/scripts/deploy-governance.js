require("dotenv").config();

const {
    getNetworkSettings,
    getDeployer,
    assertTargetNetwork,
    assertHasCode,
    loadManifest,
    saveManifest,
    upsertContracts,
    getGovernanceSettings,
} = require("./lib/deployment");

async function main() {
    console.log("starting deployment...");
    const { rpcUrl, chainId } = getNetworkSettings();
    const ownerAccount = await getDeployer(hre);
    const ownerAddress = await ownerAccount.getAddress();
    const { owners, minConfirmations } = getGovernanceSettings(ownerAddress);
    await assertTargetNetwork(hre, chainId);
    console.log(`network=${hre.network.name} chainId=${chainId} rpc=${rpcUrl}`);
    console.log(`deployer=${ownerAddress}`);

    const Governance = await hre.ethers.getContractFactory("SqwidGovernance", ownerAccount);
    const governance = await Governance.deploy(owners, minConfirmations);
    await governance.deployed();
    await assertHasCode(hre, governance.address, "SqwidGovernance");
    console.log(`SqwidGovernance deployed to ${governance.address}`);

    const manifest = loadManifest(chainId);
    manifest.network = {
        name: hre.network.name,
        chainId,
        rpcUrl,
    };
    manifest.deployer = ownerAddress;
    upsertContracts(manifest, {
        SqwidGovernance: {
            address: governance.address,
            transactionHash: governance.deployTransaction.hash,
            constructorArgs: [owners, minConfirmations],
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
