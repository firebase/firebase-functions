FROM node:22

# Install dependencies
RUN apt-get update && \
    apt-get install -y curl git jq

# Install npm at latest.
RUN npm install --global npm@latest


# Install gh
RUN curl -fsSL --output gh.tgz https://github.com/cli/cli/releases/download/v2.52.0/gh_2.52.0_linux_amd64.tar.gz && \
    tar --strip-components=1 -C /usr -xf gh.tgz && \
    rm gh.tgz
