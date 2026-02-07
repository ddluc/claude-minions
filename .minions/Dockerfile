# Dockerfile for Claude Engineer (CE) Worker Environment
FROM node:20-bullseye

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    vim \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update \
    && apt-get install -y gh \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for Claude CLI (required for --dangerously-skip-permissions)
RUN useradd -m -s /bin/bash ce && \
    echo "ce ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Install Claude CLI globally
RUN npm install -g @anthropic-ai/claude-code

# Set up working directory
WORKDIR /workspace

# Copy the entire codebase into the container (isolated copy)
COPY . /workspace/

# Make start-claude script executable and available in PATH
RUN chmod +x /workspace/.minions/scripts/start-minion.sh && \
    ln -s /workspace/.minions/scripts/start-minion.sh /usr/local/bin/start-claude

# Install dependencies if they exist
# [Customize this for your project structure]

# Set ownership to ce user
RUN chown -R ce:ce /workspace

# Set up git config for commits
USER ce
RUN git config --global user.name "Claude Engineer" && \
    git config --global user.email "ce@minions.local"

# Default command: Start an interactive shell
CMD ["/bin/bash"]