#!/bin/bash
# Injects skill context on every user prompt so Claude auto-checks for relevant skills
echo '{"hookSpecificOutput": {"hookEventName": "UserPromptSubmit", "additionalContext": "Before acting: match this task against the Skills table in CLAUDE.md and the superpowers process table. Run the matching skill before responding."}}'
