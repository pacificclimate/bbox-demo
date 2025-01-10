FROM sourcepole/bbox-server-qgis

# Switch to root to install packages
USER root

# Install psql client and envsubst
RUN apt-get update && \
    apt-get install -y \
        gettext-base \
        postgresql-client && \
    rm -rf /var/lib/apt/lists/*

COPY docker/BBOX/start-bbox-server.sh /usr/local/bin/start-bbox-server.sh
RUN chmod +x /usr/local/bin/start-bbox-server.sh

RUN mkdir -p /tmp/tilecache && chmod 777 /tmp/tilecache

# Switch back to the bbox-server user 
USER www-data


ENTRYPOINT ["/usr/local/bin/start-bbox-server.sh"]

