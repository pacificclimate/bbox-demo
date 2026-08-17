#!/bin/sh
set -e

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

echo "Waiting for the initialized PostGIS database..."
until psql "$DB_DSN" -v ON_ERROR_STOP=1 -tAc "SELECT 1" >/dev/null 2>&1; do
  sleep 2
done

psql "$DB_DSN" -v ON_ERROR_STOP=1 <<-'EOSQL'
  CREATE TABLE IF NOT EXISTS chyp_import_status (
    import_id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    completed_at TIMESTAMPTZ,
    river_count BIGINT,
    lake_count BIGINT
  );
EOSQL

IMPORT_IS_READY=$(
  psql "$DB_DSN" \
    -v ON_ERROR_STOP=1 \
    -v import_id="$CHYP_IMPORT_ID" \
    -tA <<-'EOSQL'
    SELECT (
      EXISTS (
        SELECT 1
        FROM chyp_import_status
        WHERE import_id = :'import_id'
          AND status = 'ready'
          AND river_count IS NOT NULL
          AND lake_count IS NOT NULL
      )
      AND to_regclass('public.rivers') IS NOT NULL
      AND to_regclass('public.lakes') IS NOT NULL
      AND to_regclass('public.upstreams') IS NOT NULL
      AND to_regclass('public.downstreams') IS NOT NULL
    );
EOSQL
)

if [ "$IMPORT_IS_READY" = "t" ] && [ "${CHYP_FORCE_IMPORT:-false}" != "true" ]; then
  echo "Import ${CHYP_IMPORT_ID} is already ready; nothing to do."
  exit 0
fi

echo "Recording import ${CHYP_IMPORT_ID} as running..."
psql "$DB_DSN" \
  -v ON_ERROR_STOP=1 \
  -v import_id="$CHYP_IMPORT_ID" <<-'EOSQL'
  INSERT INTO chyp_import_status (
    import_id,
    status,
    started_at,
    completed_at,
    river_count,
    lake_count
  )
  VALUES (
    :'import_id',
    'running',
    clock_timestamp(),
    NULL,
    NULL,
    NULL
  )
  ON CONFLICT (import_id) DO UPDATE
  SET status = EXCLUDED.status,
      started_at = EXCLUDED.started_at,
      completed_at = NULL,
      river_count = NULL,
      lake_count = NULL;
EOSQL

mark_import_failed() {
  exit_code=$1

  if [ "$exit_code" -eq 0 ]; then
    return
  fi

  echo "Import ${CHYP_IMPORT_ID} failed with exit code ${exit_code}."
  psql "$DB_DSN" \
    -v ON_ERROR_STOP=1 \
    -v import_id="$CHYP_IMPORT_ID" <<-'EOSQL' || true
    UPDATE chyp_import_status
    SET status = 'failed',
        completed_at = clock_timestamp()
    WHERE import_id = :'import_id';
EOSQL
}

trap 'mark_import_failed "$?"' EXIT

echo "Preparing staging tables..."
psql "$DB_DSN" -v ON_ERROR_STOP=1 <<-EOSQL
  DROP MATERIALIZED VIEW IF EXISTS upstreams_next;
  DROP MATERIALIZED VIEW IF EXISTS downstreams_next;
  DROP TABLE IF EXISTS rivers_next CASCADE;
  DROP TABLE IF EXISTS lakes_next CASCADE;
EOSQL

import_dataset() {
  file=$1
  geometry_type=$2
  table=$3
  shift 3

  ogr2ogr \
    -f "PostgreSQL" \
    "PG:$DB_DSN" \
    "/data/$file" \
    -nlt "$geometry_type" \
    -nln "$table" \
    -lco GEOMETRY_NAME=geom \
    -lco FID=fid \
    -lco SPATIAL_INDEX=NONE \
    -a_srs EPSG:3005 \
    "$@" \
    -addfields
}

echo "PostGIS is ready. Importing rivers data..."
echo "Importing Fraser rivers"
import_dataset Fraser_3005_rivers.gpkg MULTILINESTRING rivers_next

echo "Importing BC Coast rivers"
import_dataset BC_Coast_3005_rivers.gpkg MULTILINESTRING rivers_next -append

echo "Importing Peace rivers"
import_dataset Peace_3005_rivers.gpkg MULTILINESTRING rivers_next -append

echo "Importing Columbia rivers"
import_dataset Columbia_3005_rivers.gpkg MULTILINESTRING rivers_next -append

echo "Importing Kettle rivers"
import_dataset Kettle_3005_rivers.gpkg MULTILINESTRING rivers_next -append

echo "Importing Okanagan rivers"
import_dataset Okanagan_3005_rivers.gpkg MULTILINESTRING rivers_next -append

echo "Rivers data imported. Importing lakes data..."
echo "Importing Fraser lakes"
import_dataset Fraser_3005_lakes.gpkg MULTIPOLYGON lakes_next

echo "Importing BC Coast lakes"
import_dataset BC_Coast_3005_lakes.gpkg MULTIPOLYGON lakes_next -append

echo "Importing Peace lakes"
import_dataset Peace_3005_lakes.gpkg MULTIPOLYGON lakes_next -append

echo "Importing Columbia lakes"
import_dataset Columbia_3005_lakes.gpkg MULTIPOLYGON lakes_next -append

echo "Importing Kettle lakes"
import_dataset Kettle_3005_lakes.gpkg MULTIPOLYGON lakes_next -append

echo "Importing Okanagan lakes"
import_dataset Okanagan_3005_lakes.gpkg MULTIPOLYGON lakes_next -append

echo "Updating tables and adding indices..."
psql "$DB_DSN" -v ON_ERROR_STOP=1 <<-EOSQL
  CREATE TEMP SEQUENCE chyp_uid_seq START 1;

  ALTER TABLE rivers_next ADD COLUMN Uid INT;
  ALTER TABLE rivers_next ADD COLUMN IsLake BOOLEAN DEFAULT FALSE;
  UPDATE rivers_next SET uid = nextval('chyp_uid_seq');

  ALTER TABLE lakes_next ADD COLUMN Uid INT;
  ALTER TABLE lakes_next ADD COLUMN IsLake BOOLEAN DEFAULT TRUE;
  UPDATE lakes_next SET uid = nextval('chyp_uid_seq');

  CREATE INDEX rivers_next_geom_idx ON rivers_next USING GIST(geom);
  CREATE INDEX lakes_next_geom_idx ON lakes_next USING GIST(geom);
  CREATE INDEX rivers_next_subid_idx ON rivers_next(subid);
  CREATE INDEX lakes_next_subid_idx ON lakes_next(subid);
  VACUUM ANALYZE rivers_next;
  VACUUM ANALYZE lakes_next;
EOSQL

echo "Creating upstreams and downstreams tables..."
psql "$DB_DSN" -v ON_ERROR_STOP=1 <<-EOSQL
  CREATE MATERIALIZED VIEW upstreams_next AS
  WITH RECURSIVE drainage(subid, downsubid, uid, mouth) AS (
    WITH segments(subid, dowsubid, uid) AS (
      SELECT subid, dowsubid, uid FROM lakes_next
      UNION
      SELECT subid, dowsubid, uid FROM rivers_next
    )

      SELECT subid, dowsubid, uid, subid AS mouth
      FROM segments

      UNION ALL

      SELECT segments.subid, segments.dowsubid, segments.uid, drainage.mouth
      FROM drainage, segments
      WHERE drainage.subid = segments.dowsubid)

  SELECT mouth AS subid, 
    array_agg(uid) AS upstream_uids,
    array_agg(subid) AS upstream_subids,
    ST_AsGeoJSON(ST_SetSRID(ST_Point(52.628, -118.430, 4326), 3005)) AS origin 
  FROM drainage GROUP BY mouth;

CREATE MATERIALIZED VIEW downstreams_next AS
  WITH RECURSIVE course(subid, downsubid, uid, origin) AS (
    WITH segments(subid, dowsubid, uid) AS (
      SELECT subid, dowsubid, uid FROM lakes_next
      UNION
      SELECT subid, dowsubid, uid FROM rivers_next
    )

      SELECT subid, dowsubid, uid, subid AS origin
      FROM segments

      UNION ALL

      SELECT segments.subid, segments.dowsubid, segments.uid, course.origin
      FROM course, segments
      WHERE course.downsubid = segments.subid)
  SELECT origin AS subid,
    array_agg(uid) AS downstream_uids,
    array_agg(subid) AS downstream_subids,
    ST_AsGeoJSON(ST_SetSRID(ST_Point(49.1778, -123.241, 4326), 3005)) AS mouth
  FROM course GROUP BY origin;

  CREATE INDEX upstreams_next_uid_idx ON upstreams_next(subid);
  CREATE INDEX downstreams_next_uid_idx ON downstreams_next(subid);
  VACUUM ANALYZE upstreams_next;
  VACUUM ANALYZE downstreams_next;
EOSQL

echo "Atomically publishing import ${CHYP_IMPORT_ID}..."
psql "$DB_DSN" \
  -v ON_ERROR_STOP=1 \
  -v import_id="$CHYP_IMPORT_ID" <<-'EOSQL'
  BEGIN;

  DROP MATERIALIZED VIEW IF EXISTS upstreams_old;
  DROP MATERIALIZED VIEW IF EXISTS downstreams_old;
  DROP TABLE IF EXISTS rivers_old CASCADE;
  DROP TABLE IF EXISTS lakes_old CASCADE;

  DO $$
  BEGIN
    IF to_regclass('public.rivers') IS NOT NULL THEN
      EXECUTE 'ALTER TABLE public.rivers RENAME TO rivers_old';
    END IF;
    IF to_regclass('public.lakes') IS NOT NULL THEN
      EXECUTE 'ALTER TABLE public.lakes RENAME TO lakes_old';
    END IF;
    IF to_regclass('public.upstreams') IS NOT NULL THEN
      EXECUTE 'ALTER MATERIALIZED VIEW public.upstreams RENAME TO upstreams_old';
    END IF;
    IF to_regclass('public.downstreams') IS NOT NULL THEN
      EXECUTE 'ALTER MATERIALIZED VIEW public.downstreams RENAME TO downstreams_old';
    END IF;
  END $$;

  ALTER TABLE rivers_next RENAME TO rivers;
  ALTER TABLE lakes_next RENAME TO lakes;
  ALTER MATERIALIZED VIEW upstreams_next RENAME TO upstreams;
  ALTER MATERIALIZED VIEW downstreams_next RENAME TO downstreams;

  DROP MATERIALIZED VIEW IF EXISTS upstreams_old;
  DROP MATERIALIZED VIEW IF EXISTS downstreams_old;
  DROP TABLE IF EXISTS rivers_old CASCADE;
  DROP TABLE IF EXISTS lakes_old CASCADE;
  DROP SEQUENCE IF EXISTS shared_uid_seq;

  ALTER INDEX rivers_next_geom_idx RENAME TO rivers_geom_idx;
  ALTER INDEX lakes_next_geom_idx RENAME TO lakes_geom_idx;
  ALTER INDEX rivers_next_subid_idx RENAME TO rivers_subid_idx;
  ALTER INDEX lakes_next_subid_idx RENAME TO lakes_subid_idx;
  ALTER INDEX upstreams_next_uid_idx RENAME TO upstream_uid_idx;
  ALTER INDEX downstreams_next_uid_idx RENAME TO downstream_uid_idx;

  UPDATE chyp_import_status
  SET status = 'ready',
      completed_at = clock_timestamp(),
      river_count = (SELECT count(*) FROM rivers),
      lake_count = (SELECT count(*) FROM lakes)
  WHERE import_id = :'import_id';

  COMMIT;
EOSQL

trap - EXIT
echo "Data import ${CHYP_IMPORT_ID} complete."
