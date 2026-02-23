#!/usr/bin/env bash
# Install pre-commit hooks so they run automatically on git commit.
# Hooks run for both humans and agents; failed hooks abort the commit.
set -e
cd "$(git rev-parse --show-toplevel)"
cp -f hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
echo "Pre-commit hooks installed."
