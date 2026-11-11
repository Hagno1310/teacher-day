FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build
# scripts/seed.mjs cần gói postgres; bản standalone đã gộp nó vào chunk nên chép riêng (cp -L: pnpm dùng symlink)
RUN mkdir -p /seed-deps && cp -rL node_modules/postgres /seed-deps/postgres

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY data ./data
# cho scripts/seed.mjs
COPY lib/db.js ./lib/db.js
COPY scripts ./scripts
COPY --from=build /seed-deps/postgres ./node_modules/postgres
USER node
EXPOSE 3000
CMD ["node", "server.js"]
