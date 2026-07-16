#!/bin/sh
set -e

echo "Waiting for PostGIS..."
until pg_isready -d "$DB_DSN"; do
  sleep 1
done

echo "Dropping existing tables if they exist..."
psql "$DB_DSN" <<-EOSQL
  DROP TABLE IF EXISTS rivers CASCADE;
  DROP TABLE IF EXISTS lakes CASCADE;
  DROP SEQUENCE IF EXISTS shared_uid_seq CASCADE;
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
    -a_srs EPSG:3005 \
    "$@" \
    -addfields
}

echo "PostGIS is ready. Importing rivers data..."
echo "Importing Fraser rivers"
import_dataset Fraser_3005_rivers.gpkg MULTILINESTRING rivers

echo "Importing BC Coast rivers"
import_dataset BC_Coast_3005_rivers.gpkg MULTILINESTRING rivers -append

echo "Importing Peace rivers"
import_dataset Peace_3005_rivers.gpkg MULTILINESTRING rivers -append

echo "Rivers data imported. Importing lakes data..."
echo "Importing Fraser lakes"
import_dataset Fraser_3005_lakes.gpkg MULTIPOLYGON lakes

echo "Importing BC Coast lakes"
import_dataset BC_Coast_3005_lakes.gpkg MULTIPOLYGON lakes -append

echo "Importing Peace lakes"
import_dataset Peace_3005_lakes.gpkg MULTIPOLYGON lakes -append

echo "Updating tables and adding indices..."
psql "$DB_DSN" <<-EOSQL
  DO \$\$
  BEGIN
    -- Create a shared sequence for unique IDs
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'shared_uid_seq') THEN
      CREATE SEQUENCE shared_uid_seq START 1;
    END IF;

    -- Update rivers table
    ALTER TABLE rivers ADD COLUMN Uid INT;
    ALTER TABLE rivers ADD COLUMN IsLake BOOLEAN DEFAULT FALSE;
    UPDATE rivers SET uid = nextval('shared_uid_seq');

    -- Update lakes table
    ALTER TABLE lakes ADD COLUMN Uid INT;
    ALTER TABLE lakes ADD COLUMN IsLake BOOLEAN DEFAULT TRUE;
    UPDATE lakes SET uid = nextval('shared_uid_seq');
  END \$\$;

  CREATE INDEX rivers_geom_idx ON rivers USING GIST(geom);
  CREATE INDEX lakes_geom_idx ON lakes USING GIST(geom);
  VACUUM ANALYZE rivers;
  VACUUM ANALYZE lakes;
EOSQL

echo "Creating upstreams and downstreams tables..."
psql "$DB_DSN" <<-EOSQL
  DROP MATERIALIZED VIEW IF EXISTS upstreams;

  CREATE MATERIALIZED VIEW upstreams AS
  WITH RECURSIVE drainage(subid, downsubid, uid, mouth) AS (
    WITH segments(subid, dowsubid, uid) AS (
      SELECT subid, dowsubid, uid FROM lakes
      UNION
      SELECT subid, dowsubid, uid FROM rivers
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

DROP MATERIALIZED VIEW IF EXISTS downstreams;

CREATE MATERIALIZED VIEW downstreams AS
  WITH RECURSIVE course(subid, downsubid, uid, origin) AS (
    WITH segments(subid, dowsubid, uid) AS (
      SELECT subid, dowsubid, uid FROM lakes
      UNION
      SELECT subid, dowsubid, uid FROM rivers
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

  CREATE INDEX upstream_uid_idx ON upstreams(subid);
  CREATE INDEX downstream_uid_idx ON downstreams(subid);
  VACUUM ANALYZE upstreams;
  VACUUM ANALYZE downstreams;
EOSQL

echo "Data import complete."
