#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

fail=0

if git ls-files | grep -E '(^|/)\.env($|\.)' | grep -v '\.env\.example$' >/dev/null; then
  echo "Tracked env files are not allowed."
  git ls-files | grep -E '(^|/)\.env($|\.)' | grep -v '\.env\.example$' || true
  fail=1
fi

if command -v gitleaks >/dev/null 2>&1; then
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  git archive HEAD | tar -x -C "$tmp"
  if ! gitleaks detect --source "$tmp" --no-git --redact --no-banner; then
    fail=1
  fi
else
  echo "gitleaks not installed; running basic pattern scan on tracked files."
  if git grep -I -E '(sk_live_|sk_test_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN (RSA |OPENSSH )?PRIVATE KEY-----)' -- ':!.env.example' ':!pnpm-lock.yaml' >/dev/null 2>&1; then
    echo "Possible secrets found in tracked files."
    fail=1
  fi
fi

if [[ "$fail" -ne 0 ]]; then
  exit 1
fi

echo "Secret scan passed."
