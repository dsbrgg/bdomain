FROM node:12

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

RUN if [ "$current_env" = "staging" ] ; then  echo   your NODE_ENV for stage is $NODE_ENV;  \
else  echo your NODE_ENV for dev is $NODE_ENV; \
fi 

CMD [ "npm", "start" ]
