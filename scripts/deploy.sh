#!/usr/bin/env bash
# Brings the server up to date with the repo and restarts the API.
# Runs as root on the instance: the first-boot script calls it once, and the
# deploy pipeline calls it for every release after that.
set -euo pipefail

APP_DIR=/opt/unque/app
BRANCH="${1:-main}"

main() {
  cd "$APP_DIR"
  git fetch --depth 1 origin "$BRANCH"
  git reset --hard FETCH_HEAD

  # No install scripts: our dependencies are plain JavaScript and don't need
  # any, and it means a compromised package can't run code during install.
  npm ci --omit=dev --ignore-scripts

  systemctl restart unque-api

  # /health only answers 200 once the database connection is up
  for _ in $(seq 1 15); do
    if curl -fsS http://localhost/health > /dev/null; then
      echo "API is healthy"
      return 0
    fi
    sleep 2
  done

  echo "API did not become healthy, last log lines:" >&2
  journalctl -u unque-api -n 30 --no-pager >&2
  return 1
}

# Everything is inside main so bash has read the whole script before git
# replaces this very file mid-run. Without that, an update could corrupt itself.
main
exit