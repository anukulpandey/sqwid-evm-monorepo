FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git python3 make g++

COPY package.json yarn.lock ./
COPY apps/client/package.json apps/client/package.json
COPY packages/contracts/package.json packages/contracts/package.json

RUN yarn install

COPY . .

RUN yarn workspace @sqwid/client build

FROM nginx:stable-alpine

COPY apps/client/docker/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/apps/client/build /usr/share/nginx/html

EXPOSE 3000

ENTRYPOINT ["nginx", "-g", "daemon off;"]
