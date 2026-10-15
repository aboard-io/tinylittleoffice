# Tiny Little Office in one container, without Cloudflare (docs/self-host.md, "Without Cloudflare"): the site and its
# short-link service, one Node process on two ports, over one SQLite file in /data. Built by `npm run selfhost:build`.
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
RUN npm run build

# Only what the process runs: the build, the server, and the Workers' code it runs (site/, tinier/, the headers' reading).
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production DB=/data/tinier.sqlite PORT=8000 TINIER_PORT=8001
COPY --from=build /src/package.json ./
COPY --from=build /src/dist ./dist
COPY --from=build /src/selfhost ./selfhost
COPY --from=build /src/site/site.ts ./site/
COPY --from=build /src/tinier/tinier.ts /src/tinier/cards.ts /src/tinier/brake.ts /src/tinier/d1.ts /src/tinier/page.html ./tinier/
COPY --from=build /src/tinier/migrations ./tinier/migrations
COPY --from=build /src/scripts/headers.ts ./scripts/
COPY --from=build /src/src/kit/core/network.ts ./src/kit/core/
RUN mkdir /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 8000 8001
CMD ["node", "selfhost/server.ts"]
