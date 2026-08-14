#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "Setting up RogRakshak backend virtual environment in $DIR/.venv..."

if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    echo "Created virtual environment in .venv"
fi

source .venv/bin/activate

echo "Upgrading pip and installing dependencies..."
pip install --upgrade pip
pip install -e .

echo "Setup complete! Activate your virtualenv with: source .venv/bin/activate"
