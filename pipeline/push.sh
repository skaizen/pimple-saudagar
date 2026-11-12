#!/bin/bash
# Automatically loads .env and pushes to GitHub

set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ Error: GITHUB_TOKEN not found in .env"
  echo "Please create a .env file with: GITHUB_TOKEN=your_token_here"
  exit 1
fi

USERNAME="${GITHUB_USERNAME:-skaizen}"
REPO="${GITHUB_REPO:-pimple-saudagar}"

echo "🚀 Pushing to GitHub ($USERNAME/$REPO)..."
git push "https://${GITHUB_TOKEN}@github.com/${USERNAME}/${REPO}.git" main
echo "✅ Successfully pushed to GitHub!"

