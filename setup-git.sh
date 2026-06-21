#!/usr/bin/env bash
#
# One-time git setup for the Mood Check-In repo.
# Run this on YOUR machine (Terminal), from inside the project folder:
#
#   bash setup-git.sh
#       -> initializes git and makes the first commit
#
#   bash setup-git.sh https://github.com/<you>/mood-check-in.git
#       -> also adds the remote and pushes
#
# (A partial ".git" folder may already exist from scaffolding; this script
#  removes it and starts clean. That removal works on your normal filesystem.)

set -e
cd "$(dirname "$0")"

echo "Cleaning any partial git state…"
rm -rf .git

echo "Initializing repository…"
git init
# Set a commit identity locally if you haven't configured git before.
git config user.name  >/dev/null 2>&1 || git config user.name  "Upasana Sen"
git config user.email >/dev/null 2>&1 || git config user.email "upasana19sen95@gmail.com"
git branch -M main
git add -A
git commit -m "Mood Check-In prototype: LLM need-state + independent crisis guardrail, 150-input eval, error analysis, docs"

if [ -n "$1" ]; then
  echo "Adding remote and pushing to $1 …"
  git remote add origin "$1"
  git push -u origin main
  echo "Done. Pushed to $1"
else
  cat <<'EOF'

Committed locally. To put it on GitHub:

  1) Create a new, EMPTY repo on github.com (no README, no .gitignore, no license).
  2) Copy its URL, then run:

       git remote add origin <your-repo-url>
       git push -u origin main

  Or, if you have the GitHub CLI installed:

       gh repo create mood-check-in --private --source=. --remote=origin --push
EOF
fi
