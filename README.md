# Sqwid Monorepo

This workspace contains the full Sqwid stack for chain `13939`:

- `packages/contracts`: deployed contract package and Hardhat tooling
- `apps/backend`: local API, Postgres sync/indexer, and IPFS-backed metadata services
- `apps/client`: MetaMask-compatible frontend

## Network

- RPC URL: `https://eth.reef-node-reefdevcluster-808c46-72-60-35-83.nip.io/`
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

Recommended Dokploy variables:

- `JWT_SECRET`

Optional overrides:

- `CLIENT_PUBLIC_URL`
- `BACKEND_PUBLIC_URL`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `RPC_URL`
- `CHAIN_ID`
- `SYNC_START_BLOCK`
- `MODERATORS`

By default, the Dokploy setup serves the frontend from the `client` service and proxies browser requests from `/api/*` to the `backend` service through Nginx, so you only need a public domain for the frontend unless you want the API exposed separately.

If you set `BACKEND_PUBLIC_URL`, the frontend bakes that value into the static bundle at build time, so rebuild the `client` service after changing it.

If `JWT_SECRET` is omitted, the Dokploy compose file falls back to `sqwid-local-dev-secret` so the stack can boot, but you should set a real secret in Dokploy for production.

Current internal service ports:

- `client`: `3017`
- `backend`: `8097`

The client container now writes Nginx access and error logs to stdout/stderr so Dokploy log streaming can show frontend requests.
