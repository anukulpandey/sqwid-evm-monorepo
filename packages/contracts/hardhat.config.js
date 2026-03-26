require("dotenv").config();
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");

const { task, subtask } = require("hardhat/config");
const {
    TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD,
    TASK_COMPILE_SOLIDITY_LOG_DOWNLOAD_COMPILER_END,
    TASK_COMPILE_SOLIDITY_LOG_DOWNLOAD_COMPILER_START,
} = require("hardhat/builtin-tasks/task-names");
const {
    CompilerDownloader,
} = require("hardhat/internal/solidity/compiler/downloader");
const { getCompilersDir } = require("hardhat/internal/util/global-dir");

const DEFAULT_RPC_URL = "http://34.123.142.246:8545";
const DEFAULT_CHAIN_ID = 13939;
const PRIVATE_KEY = process.env.PRIVATE_KEY
    ? process.env.PRIVATE_KEY.startsWith("0x")
        ? process.env.PRIVATE_KEY
        : `0x${process.env.PRIVATE_KEY}`
    : undefined;

task("accounts", "Prints the list of accounts", async () => {
    const accounts = await ethers.getSigners();

    for (const account of accounts) {
        console.log(account.address);
    }
});

subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD).setAction(
    async ({ quiet, solcVersion }, { run }) => {
        const compilersCache = await getCompilersDir();
        const downloader = new CompilerDownloader(compilersCache, {
            forceSolcJs: true,
        });
        const isCompilerDownloaded = await downloader.isCompilerDownloaded(
            solcVersion
        );
        const { longVersion } = await downloader.getCompilerBuild(solcVersion);

        await run(TASK_COMPILE_SOLIDITY_LOG_DOWNLOAD_COMPILER_START, {
            solcVersion,
            isCompilerDownloaded,
            quiet,
        });

        const compilerPathResult = await downloader.getDownloadedCompilerPath(
            solcVersion
        );

        if (compilerPathResult === undefined) {
            throw new Error(`Unable to resolve solcjs compiler ${solcVersion}`);
        }

        await run(TASK_COMPILE_SOLIDITY_LOG_DOWNLOAD_COMPILER_END, {
            solcVersion,
            isCompilerDownloaded,
            quiet,
        });

        return {
            compilerPath: compilerPathResult.compilerPath,
            isSolcJs: true,
            version: solcVersion,
            longVersion,
        };
    }
);

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
    solidity: {
        version: "0.8.4",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
            metadata: {
                bytecodeHash: "none",
            },
        },
    },
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            allowUnlimitedContractSize: true,
        },
        custom_13939: {
            url: process.env.RPC_URL || DEFAULT_RPC_URL,
            chainId: Number(process.env.CHAIN_ID || DEFAULT_CHAIN_ID),
            accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
        },
    },
    mocha: {
        timeout: 150000,
    },
};
