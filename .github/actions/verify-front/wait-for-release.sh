#!/usr/bin/env bash
# Publishing returns before the CDN has switched everywhere, so the first read of a freshly
# released site can still name the previous release. Only a release that stays wrong is a failure.
set -euo pipefail

url="$1"
expected="$2"
page="$3"
curl_bin="${CURL_BIN:-curl}"
attempts="${RELEASE_WAIT_ATTEMPTS:-12}"
delay="${RELEASE_WAIT_DELAY_SECONDS:-10}"

served_release() {
  grep -oE '<meta name="release" content="[0-9a-f]{40}"' "$page" | grep -oE '[0-9a-f]{40}' | head -1 || true
}

attempt=1
while true; do
  served="$(served_release)"
  if [ "$served" = "$expected" ]; then
    echo "$url serves release $served."
    exit 0
  fi
  if [ "$attempt" -ge "$attempts" ]; then
    echo "::error::$url serves release '${served:-none}', expected '$expected': the site does not serve the version that was just released."
    exit 1
  fi
  echo "$url serves release '${served:-none}', waiting for $expected (attempt $attempt of $attempts)."
  sleep "$delay"
  "$curl_bin" -sS -o "$page" --retry 5 --retry-all-errors --retry-delay 5 --max-time 30 "$url/"
  attempt=$((attempt + 1))
done
