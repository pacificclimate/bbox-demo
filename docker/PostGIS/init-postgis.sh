#!/bin/bash
set -e


if [ -f /app/.pgpass ]; then
    echo ".pgpass file exists"
    ls -l /app/.pgpass
else
    echo "ERROR: .pgpass file not found!"
    exit 1
fi

DB_PASSWORD=$(grep "bbox_postgres:bbox_user:" /app/.pgpass | cut -d: -f5)

if [ -z "$DB_PASSWORD" ]; then
    echo "ERROR: Failed to extract password from .pgpass"
    exit 1
else
    echo "Successfully extracted password from .pgpass"
fi

# Create database and user, grant privileges, include extensions
psql -v ON_ERROR_STOP=1 --username "postgres" <<-EOSQL
  CREATE DATABASE bbox_postgres;
  CREATE USER bbox_user WITH PASSWORD '${DB_PASSWORD}';
  GRANT ALL PRIVILEGES ON DATABASE bbox_postgres TO bbox_user;

  -- Grant access to the public schema
  \c bbox_postgres
  GRANT ALL ON SCHEMA public TO bbox_user;

  -- Enable PostGIS extensions
  CREATE EXTENSION IF NOT EXISTS postgis;
  CREATE EXTENSION IF NOT EXISTS postgis_topology;

  -- Log queries for debug purposes
  ALTER SYSTEM SET log_statement = 'all';
EOSQL