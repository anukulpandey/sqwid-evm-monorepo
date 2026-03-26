# Sqwid Backend

This package is the local API and sync service for the Sqwid monorepo.

## Responsibilities

- EVM-address nonce and signature auth
- Postgres-backed users, collections, collectibles, and featured data
- Local IPFS uploads and metadata reads
- On-chain reads against the deployed Sqwid contracts on chain `13939`

## Environment

The backend reads configuration from `apps/backend/.env`.

Important values:

- `DATABASE_URL`
- `RPC_URL`
- `CHAIN_ID`
- `JWT_SECRET`
- `IPFS_API_URL`
- `IPFS_GATEWAY_URL`

## Local development

From the monorepo root:

```sh
yarn install
yarn db:migrate
yarn workspace @sqwid/backend start
```

## Docker

The recommended local setup is the root Docker Compose file:

```sh
yarn docker:up
```
