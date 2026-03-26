FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache git python3 make g++

COPY package.json yarn.lock ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/contracts/package.json packages/contracts/package.json

RUN yarn install

COPY . .

EXPOSE 8080

CMD ["sh", "-lc", "until yarn workspace @sqwid/backend db:migrate; do echo 'waiting for postgres'; sleep 2; done && yarn workspace @sqwid/backend start"]
