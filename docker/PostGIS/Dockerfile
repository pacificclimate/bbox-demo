FROM postgis/postgis:latest

# Copy the initialization script
COPY docker/PostGIS/init-postgis.sh /docker-entrypoint-initdb.d/init-postgis.sh

# Ensure the script is executable
RUN chmod +x /docker-entrypoint-initdb.d/init-postgis.sh && \
    chown postgres:postgres /docker-entrypoint-initdb.d/init-postgis.sh

RUN mkdir -p /app && \
    chown -R postgres:postgres /app