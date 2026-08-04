#!/bin/sh
set -e

echo "Starting bbox-server entrypoint..."

if [ -z "${CHYP_IMPORT_ID:-}" ]; then
  echo "ERROR: CHYP_IMPORT_ID must be set."
  exit 1
fi

case "$CHYP_IMPORT_ID" in
  *[!A-Za-z0-9._-]*)
    echo "ERROR: CHYP_IMPORT_ID may contain only letters, numbers, dots, underscores, and hyphens."
    exit 1
    ;;
esac

read_import_status() {
  psql "$DB_DSN" \
    -v ON_ERROR_STOP=1 \
    -v import_id="$CHYP_IMPORT_ID" \
    -tA 2>/dev/null <<-'EOSQL'
    SELECT status
    FROM chyp_import_status
    WHERE import_id = :'import_id';
EOSQL
}

echo "Waiting for data import ${CHYP_IMPORT_ID} to finish..."
while true; do
  if IMPORT_STATUS=$(read_import_status); then
    case "$IMPORT_STATUS" in
      ready)
        echo "Data import ${CHYP_IMPORT_ID} is ready."
        break
        ;;
      failed)
        echo "Data import ${CHYP_IMPORT_ID} failed; waiting for its retry."
        ;;
      running)
        echo "Data import ${CHYP_IMPORT_ID} is still running."
        ;;
      *)
        echo "Data import ${CHYP_IMPORT_ID} has not started yet."
        ;;
    esac
  else
    echo "PostGIS or the import status table is not ready yet."
  fi

  sleep 5
done

echo "Reading DB password from secret..."
POSTGRES_PASSWORD=$(cat /run/secrets/bbox-postgis-SU)

echo "Parsing DB host from DB_DSN..."
DB_HOST=$(echo "$DB_DSN" | sed -E 's#^postgresql://[^@]+@([^:/?]+).*#\1#')

echo "Constructing DSN..."
export BBOX_DB_DSN="postgresql://bbox_user:${POSTGRES_PASSWORD}@${DB_HOST}:5432/bbox_postgres"

echo "Data is ready. Substituting environment variables..."
envsubst < /tmp/bbox.template.toml > /app/bbox.toml

echo "Starting bbox-app..."
exec su www-data -s /bin/sh -c "bbox-app serve"
