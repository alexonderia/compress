FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_SLICER_API_BASE_URL
ARG VITE_AI_LEGAL_API_BASE_URL
ENV VITE_SLICER_API_BASE_URL=${VITE_SLICER_API_BASE_URL}
ENV VITE_AI_LEGAL_API_BASE_URL=${VITE_AI_LEGAL_API_BASE_URL}

COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN npm ci || yarn install --frozen-lockfile || (npm install -g pnpm && pnpm install)
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]