# Claude Minions- Agent Management
# Usage: make <target> [ARGS]

.PHONY: @minion/create @minion/run @minion/start help

# Default target
help:
	@echo "Claude Minions - Agent Management"
	@echo ""
	@echo "Usage:"
	@echo "  make @minion/create NAME=<minion-name>    Create a new CE minion container"
	@echo "  make @minion/run NAME=<minion-name>       Attach to a minion container"
	@echo "  make @minion/start                        Start Claude CLI (inside container)"
	@echo ""
	@echo "Examples:"
	@echo "  make @minion/create NAME=worker-1"
	@echo "  make @minion/run NAME=worker-1"
	@echo ""
	@echo "For more information, see README.md"

@minion/create:
	@./.minions/scripts/create-minion.sh $(NAME)

@minion/run:
	@./.minions/scripts/run-minion.sh $(NAME)

@minion/start:
	@./.minions/scripts/start-minion.sh
