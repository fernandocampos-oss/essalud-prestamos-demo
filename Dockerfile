FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json ./
COPY frontend/package.json frontend/package.json
RUN npm install
COPY . .
RUN npm run build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000 DB_PATH=/var/data/essalud-demo.sqlite DEMO_MODE=true
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/backend ./backend
COPY --from=build /app/database ./database
COPY --from=build /app/frontend/dist ./frontend/dist
RUN mkdir -p /var/data && chown -R node:node /app /var/data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["sh","-c","test -f \"$DB_PATH\" || node database/reset.js; node backend/src/server.js"]
