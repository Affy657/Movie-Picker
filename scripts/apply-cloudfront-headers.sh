#!/usr/bin/env bash
set -euo pipefail

DISTRIBUTION_ID="${DISTRIBUTION_ID:-E32M2PR26FCH96}"
POLICY_NAME="movie-picker-front-security-headers"
POLICY_CONFIG="infra/cloudfront-response-headers-policy.json"

here() { printf '\n== %s\n' "$1"; }

here "Recherche d'une policy existante nommee $POLICY_NAME"
policy_id="$(aws cloudfront list-response-headers-policies --type custom \
  --query "ResponseHeadersPolicyList.Items[?ResponseHeadersPolicy.ResponseHeadersPolicyConfig.Name=='$POLICY_NAME'].ResponseHeadersPolicy.Id | [0]" \
  --output text)"

if [ "$policy_id" = "None" ] || [ -z "$policy_id" ]; then
  here "Creation de la policy"
  policy_id="$(aws cloudfront create-response-headers-policy \
    --response-headers-policy-config "file://$POLICY_CONFIG" \
    --query 'ResponseHeadersPolicy.Id' --output text)"
  echo "policy creee : $policy_id"
else
  echo "policy deja presente : $policy_id"
fi

here "Lecture de la configuration de la distribution $DISTRIBUTION_ID"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
aws cloudfront get-distribution-config --id "$DISTRIBUTION_ID" > "$tmp/current.json"
etag="$(node -e "process.stdout.write(require('$tmp/current.json').ETag)")"
node -e "
const fs = require('fs');
const current = require('$tmp/current.json').DistributionConfig;
const before = current.DefaultCacheBehavior.ResponseHeadersPolicyId ?? null;
if (before === '$policy_id') {
  console.error('deja attachee, rien a faire');
  process.exit(3);
}
console.error('policy attachee avant : ' + before);
current.DefaultCacheBehavior.ResponseHeadersPolicyId = '$policy_id';
fs.writeFileSync('$tmp/next.json', JSON.stringify(current));
" || { [ "$?" = "3" ] && exit 0; }

here "Attachement au default cache behavior"
aws cloudfront update-distribution \
  --id "$DISTRIBUTION_ID" \
  --if-match "$etag" \
  --distribution-config "file://$tmp/next.json" \
  --query 'Distribution.Status' --output text

here "Attente de la propagation (quelques minutes)"
aws cloudfront wait distribution-deployed --id "$DISTRIBUTION_ID"

here "Verification des en-tetes servis"
domain="$(aws cloudfront get-distribution --id "$DISTRIBUTION_ID" \
  --query 'Distribution.DistributionConfig.Aliases.Items[0]' --output text)"
code="$(curl -sS -o /dev/null -w '%{http_code}' "https://$domain/")"
echo "GET https://$domain/ -> $code"
curl -sSI "https://$domain/" | grep -iE 'content-security-policy|x-frame-options|x-content-type-options|referrer-policy|strict-transport-security|permissions-policy'
test "$code" = "200"
