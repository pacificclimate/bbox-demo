#!/bin/sh
set -eu

: "${CHYP_IMPORT_ID:?CHYP_IMPORT_ID must be set}"

case "$CHYP_IMPORT_ID" in
  *[!A-Za-z0-9._-]*)
    echo "ERROR: CHYP_IMPORT_ID may contain only letters, numbers, dots, underscores, and hyphens."
    exit 1
    ;;
esac

READY_URL="${CHYP_SERVER_READY_URL:-http://chyp-server:8080/collections/import_status/items/${CHYP_IMPORT_ID}.json}"
RETRY_SECONDS="${CHYP_STARTUP_RETRY_SECONDS:-5}"

echo "Waiting for BBOX server at ${READY_URL}..."
until curl --fail --silent --show-error --max-time 5 "$READY_URL" >/dev/null; do
  sleep "$RETRY_SECONDS"
done

echo "BBOX server is ready. Starting Varnish."
rm -f /var/lib/varnish/cache.bin
exec varnishd "$@"
