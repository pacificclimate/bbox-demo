#!/bin/sh
set -e

echo "Waiting for PostGIS..."
until pg_isready -d "$DB_DSN"; do
  sleep 1
done

echo "PostGIS is ready. Importing rivers data..."
ogr2ogr \
  -f "PostgreSQL" \
  "PG:$DB_DSN" \
  /data/Fraser_3005_rivers.gpkg \
  -nlt MULTILINESTRING \
  -nln rivers \
  -lco GEOMETRY_NAME=geom \
  -lco FID=fid \
  -a_srs EPSG:3005

echo "Rivers data imported. Importing lakes data..."
ogr2ogr \
  -f "PostgreSQL" \
  "PG:$DB_DSN" \
  /data/Fraser_3005_lakes.gpkg \
  -nlt MULTIPOLYGON \
  -nln lakes \
  -lco GEOMETRY_NAME=geom \
  -lco FID=fid \
  -a_srs EPSG:3005

echo "Updating tables and adding indices..."
psql "$DB_DSN" <<-EOSQL
  -- Add unique_fid column to both tables
  ALTER TABLE rivers ADD COLUMN unique_fid TEXT;
  ALTER TABLE lakes ADD COLUMN unique_fid TEXT;

  -- Populate unique_fid for rivers
  UPDATE rivers SET unique_fid = CONCAT('rivers_', fid);
  CREATE INDEX rivers_geom_idx ON rivers USING GIST(geom);
  VACUUM ANALYZE rivers;

  -- Populate unique_fid for lakes
  UPDATE lakes SET unique_fid = CONCAT('lakes_', fid);
  CREATE INDEX lakes_geom_idx ON lakes USING GIST(geom);
  VACUUM ANALYZE lakes;
EOSQL
echo "Data import complete."