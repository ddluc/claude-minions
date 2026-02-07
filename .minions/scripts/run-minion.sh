#!/bin/bash

# Script to attach to CE minion container

set -e

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if minion name is provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: make @minion/run NAME=<minion-name>${NC}"
    echo -e "${YELLOW}Example: make @minion/run NAME=worker-1${NC}"
    echo ""
    echo "Running minions:"
    docker ps --filter "name=minion-ce-" --format "table {{.Names}}\t{{.Status}}"
    exit 1
fi

MINION_NAME=$1
CONTAINER_NAME="minion-ce-$MINION_NAME"

docker start $CONTAINER_NAME

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${YELLOW}Error: Minion '$MINION_NAME' is not created${NC}"
    echo -e "${YELLOW}Create it first with: make @minion/create NAME=$MINION_NAME${NC}"
    exit 1
fi

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Attaching to Claude Engineer Minion Container         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Minion:${NC} $MINION_NAME"
echo -e "${GREEN}Container:${NC} $CONTAINER_NAME"
echo ""
echo -e "${YELLOW}To start Claude CLI, run one of:${NC}"
echo -e "  ${BLUE}make @minion/start${NC} (recommended)"
echo -e "  ${BLUE}claude --model sonnet --dangerously-allow-all-tools${NC} (manual)"
echo ""
echo -e "${YELLOW}Context is automatically loaded from claude.md${NC}"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Attach to container with bash as ce user (login shell for proper terminal)
docker exec -it -u ce -e TERM=$TERM $CONTAINER_NAME bash -l
