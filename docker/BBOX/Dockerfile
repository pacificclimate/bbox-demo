FROM sourcepole/bbox-server-qgis

# Switch to root to install packages
USER root

# Install psql client, config templating, and healthcheck client.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl \
        gettext-base \
        postgresql-client && \
    rm -rf /var/lib/apt/lists/*

COPY docker/BBOX/start-bbox-server.sh /usr/local/bin/start-bbox-server.sh
RUN chmod +x /usr/local/bin/start-bbox-server.sh

RUN mkdir -p /tmp/tilecache && chmod 777 /tmp/tilecache

ENTRYPOINT ["/usr/local/bin/start-bbox-server.sh"]
