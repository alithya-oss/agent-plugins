FROM mcr.microsoft.com/devcontainers/typescript-node:22-bookworm

ARG TASK_VERSION=3.40.1
ARG CONFTEST_VERSION=0.57.0

# Install go-task
RUN curl -fsSL "https://github.com/go-task/task/releases/download/v${TASK_VERSION}/task_linux_amd64.deb" -o /tmp/task.deb \
    && dpkg -i /tmp/task.deb \
    && rm /tmp/task.deb

# Install conftest
RUN curl -fsSL "https://github.com/open-policy-agent/conftest/releases/download/v${CONFTEST_VERSION}/conftest_${CONFTEST_VERSION}_Linux_x86_64.tar.gz" \
    | tar xz -C /usr/local/bin conftest \
    && chmod +x /usr/local/bin/conftest

# Install tsx globally for convenience
RUN npm install -g tsx
