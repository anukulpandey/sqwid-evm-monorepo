# Sqwid Client

This package is the MetaMask-compatible frontend for the Sqwid monorepo.

## Network

- RPC URL: `http://34.123.142.246:8545`
- Chain ID: `13939`

## Local development

From the monorepo root:

```sh
yarn install
yarn workspace @sqwid/client start
```

The client reads its network and backend settings from `apps/client/.env`.

## Docker

The recommended local stack is the root Docker Compose file:

```sh
yarn docker:up
```
