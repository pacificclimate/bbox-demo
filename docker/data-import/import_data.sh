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
  -a_srs EPSG:3005 \
  -addfields

echo "Rivers data imported. Importing lakes data..."
ogr2ogr \
  -f "PostgreSQL" \
  "PG:$DB_DSN" \
  /data/Fraser_3005_lakes.gpkg \
  -nlt MULTIPOLYGON \
  -nln lakes \
  -lco GEOMETRY_NAME=geom \
  -lco FID=fid \
  -a_srs EPSG:3005 \
  -addfields

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
echo "Data import complete."