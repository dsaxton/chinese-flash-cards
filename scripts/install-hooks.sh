#!/usr/bin/env bash
# Install pre-commit hooks so they run automatically on git commit.
# Hooks run for both humans and agents; failed hooks abort the commit.
set -e
cd "$(git rev-parse --show-toplevel)"

if command -v pre-commit &>/dev/null; then
  pre-commit install
  echo "Pre-commit hooks installed (via pre-commit framework)."
else
  cp -f hooks/pre-commit .git/hooks/pre-commit
  chmod +x .git/hooks/pre-commit
  echo "Pre-commit hooks installed (fallback script)."
  echo "Tip: Install 'pre-commit' (pip install pre-commit) for more hook options."
fi
