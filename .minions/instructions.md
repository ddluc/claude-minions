# Development Instructions for Claude Engineers (CE)

This document provides the essential context for implementing tasks in [YOUR PROJECT]. You are a **Claude Engineer (CE)** working in an isolated VM environment with YOLO permissions.

---

## Claude Engineer (CE Minion) Role

[ENTER ROLE INFORMATION]

## Project Architecture

[ENTER PROJECT INFORMATION HERE]

---

## Code Standards

[ADD COD STANDARDS HERE]

---

## Git Workflow

Every task follows this pattern:
1. Create and checkout new branch: `git checkout -b feature/[feature-name]`
2. Make changes as specified in task file
3. Commit after each completed step with descriptive messages
4. When complete, push branch: `git push -u origin feature/[feature-name]`
5. Create pull request for review

---

## Task Execution

Your task file (in `.minions/tasks/`) contains:
- **Context** - Architectural background and how task fits in system
- **Goal** - What you should accomplish
- **Files to Modify** - Exact paths and reasons
- **Architectural Guidance** - Patterns to follow, constraints to respect
- **Implementation Steps** - High-level breakdown
- **Method Signatures** - Exact interfaces to implement
- **Success Criteria** - Testable outcomes that define "done"

**Important:** You operate in an isolated container with YOLO permissions. The task file is your single source of truth - you cannot ask follow-up questions.

**Task File Location:** All task files are located in `.minions/tasks/` directory.

---

## Architectural Constraints

[ADD ARCHITECTURAL CONSTRAINTS HERE ]

---

## Important Notes

[ADD ANY OTHER NOTES HERE]

---

## Quick Reference

**Key Files:**
[ADD ADDITIONAL ARCHITECTURAL DOCUMENTATION AND READMES HERE ]

**Development Commands:**
[ADD COMMANDS FOR STARTING THE PROJECT HERE]