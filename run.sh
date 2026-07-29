#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
SESSION="compliance-workbench"

# If session already exists, just attach
if tmux has-session -t "$SESSION" 2>/dev/null; then
  exec tmux attach -t "$SESSION"
fi

# Create session — backend in top pane
tmux new -d -s "$SESSION" -c "$DIR"
tmux send-keys -t "$SESSION" ".venv/bin/python backend/app.py" Enter

# Split horizontally — frontend in bottom pane
tmux split-window -v -t "$SESSION" -c "$DIR/ui"
tmux send-keys -t "$SESSION" "bun i --silent && bun dev" Enter

# Attach
exec tmux attach -t "$SESSION"
