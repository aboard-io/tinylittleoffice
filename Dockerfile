# Tiny Little Office in one container, without Cloudflare (docs/self-host.md, "Without Cloudflare"): the site, its
# short-link service and the journal, one Node process on three ports, over one SQLite file in /data. Built by `npm run selfhost:build`.
#
# The pages are built for the addresses a browser reaches them at: SITE (the canonical link, the cards) and TINIER
# (the short links, written into the pages and their Content-Security-Policy). Change them, and build again.

FROM node:24-slim AS build
WORKDIR /src
ARG SITE=http://localhost:8000
ARG TINIER=http://localhost:8001
ENV VITE_SITE_URL=${SITE}/ VITE_TINIER=${TINIER}/
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# The build without the checks before it (npm run build is the lint, then this): they read the tree through git, and
# the image is made from the files alone. A commit is checked where it is made (CI, npm run deploy); so the copy names
# no commit in About and /version.json.
RUN npm run build:site

# Only what the process runs: node itself (no npm, no yarn), the build, the server, and the services it runs (backends/cards/,
# backends/tinier/, backends/journal/, the headers' reading).
FROM node:24-alpine AS node
FROM alpine:3.24
RUN apk add --no-cache libstdc++ && adduser -D -u 1000 node
COPY --from=node /usr/local/bin/node /usr/local/bin/node
WORKDIR /app
ENV NODE_ENV=production DB=/data/tinier.sqlite PORT=8000 TINIER_PORT=8001 JOURNAL_PORT=8002
COPY --from=build /src/package.json ./
COPY --from=build /src/dist ./dist
COPY --from=build /src/backends/node ./backends/node
COPY --from=build /src/backends/cards/cards.ts /src/backends/cards/site.ts ./backends/cards/
COPY --from=build /src/backends/tinier/tinier.ts /src/backends/tinier/brake.ts /src/backends/tinier/d1.ts /src/backends/tinier/page.html ./backends/tinier/
COPY --from=build /src/backends/tinier/migrations ./backends/tinier/migrations
COPY --from=build /src/backends/journal/journal.ts ./backends/journal/
COPY --from=build /src/scripts/headers.ts ./scripts/
COPY --from=build /src/src/kit/core/network.ts ./src/kit/core/
RUN mkdir /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 8000 8001 8002
CMD ["node", "backends/node/server.ts"]
