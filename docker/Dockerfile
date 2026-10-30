
# Stage 1: Clone and build
FROM node:24-alpine AS builder

RUN apk add --no-cache git

WORKDIR /app

RUN git clone --depth 1 https://github.com/aboard-io/tinylittleoffice.git .

RUN npm ci && npm run build

RUN mkdir -p /output \
    && cp -a dist/. /output/

# Stage 2: Minimal Apache server
FROM httpd:2.4-alpine

COPY --from=builder /output/ /usr/local/apache2/htdocs/

EXPOSE 80

CMD ["httpd-foreground"]
