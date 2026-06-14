# Use the official Node.js 20 image
FROM node:20-alpine

WORKDIR /usr/src/app

# Install system dependencies required for PDF generation or similar tasks (if needed)
# RUN apk add --no-cache chromium

COPY package*.json ./

RUN npm ci --only=production

COPY . .

ENV PORT=4000
EXPOSE $PORT

CMD ["node", "server.mjs"]
