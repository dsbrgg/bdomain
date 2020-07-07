FROM node:alpine

# install puppeteer needed dependencies
ENV CHROME_BIN="/usr/bin/chromium-browser" \
  PUPPETEER_SKIP_CHROMIUM_DOWNLOAD="true"
    
RUN apk add --no-cache \
    msttcorefonts-installer \
    fontconfig \ 
    udev \
    ttf-freefont \
    chromium

# Create app directory
WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY ./dist .

ARG current_env
ENV NODE_ENV=${current_env}

CMD [ "npm", "start" ]
