# ---- Build Stage ----
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---- Serve Stage ----
FROM nginx:alpine

# React app, built with base "/app/" — served under /app/
COPY --from=builder /app/dist /usr/share/nginx/html/app

# Marketing site (dnyansetu) — served at the root. Copied as an explicit
# allowlist: it still contains legacy PHP scripts with live SMTP/DB
# credentials (db_connect.php, mail_config.php, franchise_enquiry.php,
# student_enquiry.php, PHPMailer/) which must never ship in the image.
COPY dnyansetu/*.html /usr/share/nginx/html/
COPY dnyansetu/CSS /usr/share/nginx/html/CSS
COPY dnyansetu/images /usr/share/nginx/html/images
COPY dnyansetu/script.js /usr/share/nginx/html/script.js

COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
