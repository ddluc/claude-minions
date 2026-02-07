#!/bin/bash

# Script to create a persistent CE minion container with SSH setup

set -e

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if minion name is provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: make @minion/create NAME=<minion-name>${NC}"
    echo -e "${YELLOW}Example: make @minion/create NAME=worker-1${NC}"
    echo ""
    echo "Running minions:"
    docker ps --filter "name=minion-ce-" --format "table {{.Names}}\t{{.Status}}"
    exit 1
fi

MINION_NAME=$1
CONTAINER_NAME="minion-ce-$MINION_NAME"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║            Creating Claude Engineer Minion                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Minion Name:${NC} $MINION_NAME"
echo -e "${GREEN}Container:${NC} $CONTAINER_NAME"
echo ""

# Check if .env exists and has API key
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Warning: .env file not found${NC}"
    echo -e "${YELLOW}Create .env file with: ANTHROPIC_API_KEY=your_key_here${NC}"
    echo ""
fi

# Stop and remove existing container if it exists
docker rm -f $CONTAINER_NAME 2>/dev/null || true

# Build the image (includes the codebase)
echo -e "${BLUE}Building Docker image with codebase...${NC}"
docker build -t minion-ce-image -f .minions/Dockerfile .

# Run the container WITHOUT volume mount (isolated)
echo -e "${BLUE}Starting isolated container...${NC}"
docker run -d \
  --name $CONTAINER_NAME \
  --env-file .env \
  -w /workspace \
  -it \
  minion-ce-image \
  bash

# Copy CE instructions to claude.md so Claude CLI uses it automatically
echo -e "${BLUE}Configuring CE context...${NC}"
docker exec $CONTAINER_NAME cp /workspace/.minions/instructions.md /workspace/claude.md

# ═══════════════════════════════════════════════════════════════
# SSH Setup
# ═══════════════════════════════════════════════════════════════

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║            Setting up SSH for CE Minion                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Create SSH Key
echo -e "${YELLOW}Generating new SSH key...${NC}"
echo ""
ssh-keygen -t ed25519 -C "minion-ce@local" -f "$HOME/.ssh/minion_ce_key" -N ""
echo ""
echo -e "${GREEN}SSH key generated: $HOME/.ssh/minion_ce_key${NC}"
echo ""
echo -e "${YELLOW}Add this public key to your GitHub account:${NC}"
echo -e "${BLUE}https://github.com/settings/keys${NC}"
echo ""
cat "$HOME/.ssh/minion_ce_key.pub"
echo ""
read -p "Press Enter after adding the key to GitHub..."
SSH_KEY="$HOME/.ssh/minion_ce_key"


echo ""
echo -e "${BLUE}Copying SSH keys to container...${NC}"

# Copy SSH directory to container (ce user home) - run as root for permissions
docker exec -u root $CONTAINER_NAME mkdir -p /home/ce/.ssh
docker cp "$SSH_KEY" $CONTAINER_NAME:/home/ce/.ssh/id_ed25519
docker cp "${SSH_KEY}.pub" $CONTAINER_NAME:/home/ce/.ssh/id_ed25519.pub

# Set proper permissions (as root)
docker exec -u root $CONTAINER_NAME chown -R ce:ce /home/ce/.ssh
docker exec -u root $CONTAINER_NAME chmod 700 /home/ce/.ssh
docker exec -u root $CONTAINER_NAME chmod 600 /home/ce/.ssh/id_ed25519
docker exec -u root $CONTAINER_NAME chmod 644 /home/ce/.ssh/id_ed25519.pub

# Add GitHub to known hosts (as ce user, then fix ownership)
echo -e "${BLUE}Adding GitHub to known hosts...${NC}"
docker exec -u root $CONTAINER_NAME bash -c "ssh-keyscan github.com >> /home/ce/.ssh/known_hosts 2>/dev/null"
docker exec -u root $CONTAINER_NAME chown ce:ce /home/ce/.ssh/known_hosts

# ═══════════════════════════════════════════════════════════════
# GitHub CLI Authentication (for PRs)
# ═══════════════════════════════════════════════════════════════

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║            Setting up GitHub CLI for PRs                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if GITHUB_TOKEN is in .env
if grep -q "^GITHUB_TOKEN=" .env 2>/dev/null; then
    echo -e "${GREEN}Found GITHUB_TOKEN in .env${NC}"
    GITHUB_TOKEN=$(grep "^GITHUB_TOKEN=" .env | cut -d '=' -f2)
else
    echo -e "${YELLOW}GitHub Personal Access Token required for creating PRs.${NC}"
    echo -e "${YELLOW}Create one at: ${BLUE}https://github.com/settings/tokens${NC}"
    echo -e "${YELLOW}Required scopes: repo, read:org${NC}"
    echo ""
    read -p "Enter your GitHub token (or press Enter to skip): " GITHUB_TOKEN

    if [ -n "$GITHUB_TOKEN" ]; then
        echo "GITHUB_TOKEN=$GITHUB_TOKEN" >> .env
        echo -e "${GREEN}Token saved to .env${NC}"
    fi
fi

if [ -n "$GITHUB_TOKEN" ]; then
    echo -e "${BLUE}Authenticating GitHub CLI in container...${NC}"
    docker exec -u ce $CONTAINER_NAME bash -c "unset GITHUB_TOKEN && echo '$GITHUB_TOKEN' | gh auth login --with-token"
    echo -e "${GREEN}✓ GitHub CLI authenticated${NC}"
else
    echo -e "${YELLOW}Skipping GitHub CLI auth - PRs will not work${NC}"
fi

echo ""
echo -e "${GREEN}✓ Minion created and configured successfully!${NC}"
echo ""
echo -e "${YELLOW}Run Minion:${NC}"
echo -e "make @minion/run NAME=$MINION_NAME"
echo ""