import L from "leaflet";
import "leaflet.vectorgrid";

// VectorGrid 1.3 calculates Canvas hit-test coordinates from Leaflet's pixel
// origin. That becomes inaccurate when GridLayer scales its tile container for
// a fractional zoom. Measure from the transformed canvas instead so the point
// remains in the tile's 256px coordinate space after zooming and panning.
const InteractiveCanvasTile = L.Canvas.Tile.extend({
  _eventToTilePoint(event) {
    const bounds = this._container.getBoundingClientRect();

    if (!bounds.width || !bounds.height) {
      return null;
    }

    return L.point(
      ((event.clientX - bounds.left) * this._size.x) / bounds.width,
      ((event.clientY - bounds.top) * this._size.y) / bounds.height
    );
  },

  _onClick(event) {
    if (!this._map) return;

    const point = this._eventToTilePoint(event);
    if (!point) return;

    let clickedLayer;

    for (let order = this._drawFirst; order; order = order.next) {
      const layer = order.layer;
      const isClickAfterDrag =
        (event.type === "click" || event.type === "preclick") &&
        this._map._draggableMoved(layer);

      if (
        layer.options.interactive &&
        layer._containsPoint(point) &&
        !isClickAfterDrag
      ) {
        clickedLayer = layer;
      }
    }

    // Match Leaflet 1.9's Canvas event flow. VectorGrid 1.3 calls the removed
    // L.DomEvent.fakeStop here, which prevents clicks from reaching the layer.
    this._fireEvent(clickedLayer ? [clickedLayer] : false, event);
  },

  _onMouseMove(event) {
    if (
      !this._map ||
      this._map.dragging.moving() ||
      this._map._animatingZoom
    ) {
      return;
    }

    const point = this._eventToTilePoint(event);
    if (point) {
      this._handleMouseHover(event, point);
    }
  },
});

export const interactiveCanvasTile = (tileCoord, tileSize, options) =>
  new InteractiveCanvasTile(tileCoord, tileSize, options);
