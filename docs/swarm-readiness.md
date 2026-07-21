# Swarm readiness

## Import identifier

Set a stable identifier tied to the dataset directly in the `environment`
section of `data-import`, `chyp-server`, `chyp-server-varnish`, and `chyp-app`:

```yaml
- CHYP_IMPORT_ID=fraser-coast-peace-columbia-2026-07
```

The app's readiness URL must contain the same identifier:

```yaml
- CHYP_STARTUP_URLS=http://chyp-server:8080/collections/import_status/items/fraser-coast-peace-columbia-2026-07.json,http://hydromosaic:8000/variables
```

Compose has no top-level environment-variable section, so keep these values
identical when editing an environment-specific stack. There is deliberately no
application default: a missing value must fail rather than accidentally reuse
a development dataset identifier in production.

Keep the value unchanged for an image or configuration-only redeploy. Change
it when deploying new source data. Use a dataset version rather than an image
build time: every new value requests a complete import. The importer builds
staging relations and publishes them in one database transaction, so existing
readers continue to see the old dataset until the new dataset is complete.

## Readiness and health checks

Swarm does not use `depends_on` to sequence service readiness. The stack uses
this chain instead:

```text
PostGIS -> authenticated import -> matching import-status endpoint -> BBOX -> app and Varnish
```

- The importer retries its authenticated database query, records
  `running`, `ready`, or `failed`, and skips an already-ready import ID.
- BBOX waits for the matching database marker before starting.
- The app waits for both BBOX's matching import endpoint and Hydromosaic.
- Varnish waits for the same BBOX endpoint and clears its tile cache only when
  the new import is ready.
- BBOX, the app, and Varnish have long health-check start periods so a slow
  import does not consume restart attempts. A successful check still marks a
  task healthy immediately.
- `start-first` updates retain the healthy old reader while its replacement
  waits. PostGIS and the one-shot importer use `stop-first`.

Normal Portainer **Pull and redeploy** is therefore the intended workflow; no
manual service scaling or full stack shutdown is required. Restarting a single
reader with the same `CHYP_IMPORT_ID` is also safe.

PostGIS must use durable storage that is visible at the same path on every node
eligible to run it. Bind a dedicated directory from the shared storage mount:

```yaml
postgis:
  environment:
    - PGDATA=/var/lib/postgresql/data/pgdata
  volumes:
    - type: bind
      source: /storage/.../chyp/postgres
      target: /var/lib/postgresql/data
  deploy:
    ...
    placement:
      constraints:
        - node.labels.pcic-dev == true
        - node.labels.pcic-storage == true
    ...
```