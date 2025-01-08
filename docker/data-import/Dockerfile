FROM osgeo/gdal:alpine-small-3.6.3

# Install PostgreSQL client tools and PostGIS
RUN apk add --no-cache postgresql-client postgis

# Copy cleanup and import script
COPY cleanup_import.sh /usr/local/bin/cleanup_import.sh
RUN chmod +x /usr/local/bin/cleanup_import.sh

# Entrypoint script
ENTRYPOINT ["/usr/local/bin/cleanup_import.sh"]