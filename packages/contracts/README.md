# Sqwid Marketplace Core

This project deploys and tests with standard Hardhat + Ethers tooling.

The live target network in this repo is:

- RPC URL: `http://34.123.142.246:8545`
- Chain ID: `13939`

## Installing

Copy `.env.example` to `.env` and set `PRIVATE_KEY`.

Install all dependencies:

```bash
yarn install
```

## Compile contracts

```bash
yarn compile
```

## Deploy contracts

Deploy the marketplace contracts to chain `13939`:

```bash
yarn deploy
```

This deploys:

- `SqwidERC1155`
- `SqwidMarketplace`
- `SqwidMarketplaceUtil`

Deploy governance with the deployer as the default single owner:

```bash
yarn deploy-governance
```

Deployment outputs are written to `deployments/13939.json`.

## Encode / Decode Calls

```bash
yarn encode
yarn decode
```

## Run Local Tests

```bash
yarn test
```

Tests always deploy fresh local fixtures on Hardhat. They do not attach to previously deployed live contracts.

## Environment Variables

- `PRIVATE_KEY`: deployer private key, with or without `0x`
- `RPC_URL`: defaults to `http://34.123.142.246:8545`
- `CHAIN_ID`: defaults to `13939`
- `MARKET_FEE_BPS`: defaults to `250`
- `GOVERNANCE_OWNERS`: optional comma-separated owner addresses
- `MIN_CONFIRMATIONS`: defaults to `1`

## Diagram

![diagram](sqwid-diagram-v02.png)

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
