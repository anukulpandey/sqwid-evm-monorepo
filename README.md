# Sqwid Monorepo

This workspace contains the full Sqwid stack for chain `13939`:

- `packages/contracts`: deployed contract package and Hardhat tooling
- `apps/backend`: local API, Postgres sync/indexer, and IPFS-backed metadata services
- `apps/client`: MetaMask-compatible frontend

## Network

- RPC URL: `http://eth.reef-node-reefdevcluster-808c46-72-60-35-83.sslip.io`
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

## Dokploy

Use [docker-compose.dokploy.yml](/Users/anukul/Desktop/sqwid-evm-monorepo/docker-compose.dokploy.yml) for Dokploy deployments.

Set these variables in Dokploy before the first deploy:

- `CLIENT_PUBLIC_URL`
- `BACKEND_PUBLIC_URL`
- `JWT_SECRET`

Optional overrides:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `RPC_URL`
- `CHAIN_ID`
- `SYNC_START_BLOCK`
- `MODERATORS`

The frontend bakes `REACT_APP_BACKEND_URL` into the static bundle at build time, so rebuild the `client` service if you change `BACKEND_PUBLIC_URL`.
