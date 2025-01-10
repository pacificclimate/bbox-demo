FROM osgeo/gdal:alpine-small-3.6.3

# Install PostgreSQL client tools and PostGIS
RUN apk add --no-cache postgresql-client postgis

# Copy cleanup and import script
COPY docker/data-import/import_data.sh /usr/local/bin/import_data.sh
RUN chmod +x /usr/local/bin/import_data.sh

# Entrypoint script
ENTRYPOINT ["/usr/local/bin/import_data.sh"]
