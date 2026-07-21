FROM varnish:7.5.0

USER root

RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

COPY docker/varnish/start-varnish.sh /usr/local/bin/start-chyp-varnish.sh
RUN chmod +x /usr/local/bin/start-chyp-varnish.sh

USER varnish

ENTRYPOINT ["/usr/local/bin/start-chyp-varnish.sh"]
CMD ["-F", "-f", "/etc/varnish/default.vcl", "-a", ":80", "-s", "file,/var/lib/varnish/cache.bin,4G"]
