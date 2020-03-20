FROM node:8

# Install dependencies
RUN apt-get update && \
    apt-get install -y curl git jq

# Install npm at latest.
RUN npm install --global npm@latest

# Install hub
RUN curl -fsSL --output hub.tgz https://github.com/github/hub/releases/download/v2.13.0/hub-linux-amd64-2.13.0.tgz
RUN tar --strip-components=2 -C /usr/bin -xf hub.tgz hub-linux-amd64-2.13.0/bin/hub
