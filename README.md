# Sqwid Monorepo

This workspace contains the full Sqwid stack for chain `13939`:

- `packages/contracts`: deployed contract package and Hardhat tooling
- `apps/backend`: local API, Postgres sync/indexer, and IPFS-backed metadata services
- `apps/client`: MetaMask-compatible frontend

## Network

- RPC URL: `http://34.123.142.246:8545`
- Chain ID: `13939`

## Shared contract config

`packages/contracts/deployments/13939.json` is the source of truth for live addresses.

## Local stack

The root Docker Compose file starts:

- Postgres
- IPFS/Kubo
- Backend
- Client

## Common commands

```sh
yarn install
yarn build
yarn test
yarn db:migrate
yarn docker:up
```
