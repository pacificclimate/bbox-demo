#!/bin/sh
set -e

echo "Starting bbox-server entrypoint..."

echo "Waiting for data import to finish..."
until psql "$DB_DSN" -c "SELECT 1 FROM rivers LIMIT 1;" 2>/dev/null; do
  echo "Data not loaded yet, sleeping..."
  sleep 2
done

echo "Reading DB password from secret..."
POSTGRES_PASSWORD=`cat /run/secrets/bbox-postgis-SU`
echo "Constructing DSN..."
BBOX_DB_DSN="postgresql://bbox_user:${POSTGRES_PASSWORD}@postgis:5432/bbox_postgres"
export BBOX_DB_DSN

echo "Data is ready. Substituting environment variables..."
envsubst < /tmp/bbox.template.toml > /app/bbox.toml

echo "Starting bbox-app..."
exec su www-data -s /bin/sh -c "bbox-app serve"
