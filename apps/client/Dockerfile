FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git python3 make g++

ARG REACT_APP_CHAIN_ID=13939
ARG REACT_APP_RPC_URL=http://eth.reef-node-reefdevcluster-808c46-72-60-35-83.sslip.io
ARG REACT_APP_BACKEND_URL=http://localhost:8097
ARG REACT_APP_CHAIN_NAME=Sqwid\ 13939
ARG REACT_APP_CURRENCY_SYMBOL=REEF
ARG REACT_APP_MARKETPLACE_ADDRESS=
ARG REACT_APP_ERC1155_ADDRESS=
ARG REACT_APP_UTILITY_ADDRESS=
ARG REACT_APP_GOVERNANCE_ADDRESS=

ENV REACT_APP_CHAIN_ID=${REACT_APP_CHAIN_ID} \
    REACT_APP_RPC_URL=${REACT_APP_RPC_URL} \
    REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL} \
    REACT_APP_CHAIN_NAME=${REACT_APP_CHAIN_NAME} \
    REACT_APP_CURRENCY_SYMBOL=${REACT_APP_CURRENCY_SYMBOL} \
    REACT_APP_MARKETPLACE_ADDRESS=${REACT_APP_MARKETPLACE_ADDRESS} \
    REACT_APP_ERC1155_ADDRESS=${REACT_APP_ERC1155_ADDRESS} \
    REACT_APP_UTILITY_ADDRESS=${REACT_APP_UTILITY_ADDRESS} \
    REACT_APP_GOVERNANCE_ADDRESS=${REACT_APP_GOVERNANCE_ADDRESS}

COPY package.json yarn.lock ./
COPY apps/client/package.json apps/client/package.json
COPY packages/contracts/package.json packages/contracts/package.json

RUN yarn install

COPY . .

RUN yarn workspace @sqwid/contracts compile
RUN yarn workspace @sqwid/client build

FROM nginx:stable-alpine

COPY apps/client/docker/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/apps/client/build /usr/share/nginx/html

EXPOSE 3017

ENTRYPOINT ["nginx", "-g", "daemon off;"]
