#!/usr/bin/env bash
set -euo pipefail

secret_name="${1:-STRAVA_SYNC_CRON_URL}"
raw_url="${2:-}"

normalized_url="$(printf '%s' "${raw_url}" | tr -d '[:space:]')"
normalized_url="${normalized_url%/}"

if [[ ! "${normalized_url}" =~ ^https://[^/]+/api/cron/strava/sync$ ]]; then
  echo "${secret_name} must be a full HTTPS URL ending in /api/cron/strava/sync." >&2
  exit 1
fi

printf '%s\n' "${normalized_url}"
