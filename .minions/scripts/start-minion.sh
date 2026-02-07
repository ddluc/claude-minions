#!/bin/bash

# Script to start Claude CLI with optimal settings for CE minions

set -e

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          Starting Claude Engineer Minion (CE)              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Model:${NC} Sonnet"
echo -e "${GREEN}Context:${NC} Loaded from claude.md"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Make sure we're starting from the latest commit on master
git fetch origin 
git checkout master 
git merge origin/master

# Start Claude CLI with sonnet model and yolo mode
claude --dangerously-skip-permissions --model claude-sonnet-4-5-20250929
