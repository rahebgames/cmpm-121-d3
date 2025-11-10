// @deno-types="npm:@types/leaflet"
import Leaflet from "leaflet";

import "leaflet/dist/leaflet.css";
import "./style.css";
import "./_leafletWorkaround.ts";
import luck from "./_luck.ts";

/* data types */
interface Token {
  value: number;
}

interface CellOptions extends Leaflet.PolylineOptions {
  token?: Token;
}

/* constants */
const CLASSROOM_LATLNG = Leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const _CACHE_SPAWN_PROBABILITY = 0.1;

/* global variables */
let mapDiv: HTMLDivElement;
let map: Leaflet.Map;
let playerMarker: Leaflet.Marker;

/* functions */
function createMap(): void {
  mapDiv = document.createElement("div");
  mapDiv.id = "map";
  document.body.append(mapDiv);

  map = Leaflet.map(mapDiv, {
    center: CLASSROOM_LATLNG,
    zoom: GAMEPLAY_ZOOM_LEVEL,
    minZoom: GAMEPLAY_ZOOM_LEVEL,
    maxZoom: GAMEPLAY_ZOOM_LEVEL,
    zoomControl: false,
    scrollWheelZoom: false,
  });

  Leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: GAMEPLAY_ZOOM_LEVEL,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  playerMarker = Leaflet.marker(CLASSROOM_LATLNG);
  playerMarker.bindTooltip("That's you!");
  playerMarker.addTo(map);
}

function getRandomTokenValue(seed: string): number {
  const randValue = luck(seed);
  if (randValue <= 0.6) return 1;
  if (randValue <= 0.9) return 2;
  return 4;
}

// Web Mercator projection makes cells look rectangular, they are actually square
function drawCells(): void {
  const bounds = map.getBounds();
  const south = bounds.getSouth();
  const north = bounds.getNorth();
  const west = bounds.getWest();
  const east = bounds.getEast();

  for (let lat = south; lat <= north; lat += TILE_DEGREES) {
    for (let lng = west; lng <= east; lng += TILE_DEGREES) {
      const tileBounds: Leaflet.LatLngBoundsExpression = [
        [lat, lng],
        [lat + TILE_DEGREES, lng + TILE_DEGREES],
      ];

      const seed = `${lat}, ${lng}`;
      const rectOptions: CellOptions = {
        token: { value: getRandomTokenValue(seed) },
      };
      const rect = Leaflet.rectangle(tileBounds, rectOptions);

      rect.on("click", function (e) {
        console.log(e.target.options.token);
      });

      rect.addTo(map);
    }
  }
}

function main(): void {
  createMap();
  drawCells();
}
main();
