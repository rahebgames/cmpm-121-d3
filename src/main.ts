// @deno-types="npm:@types/leaflet"
import Leaflet from "leaflet";

import "leaflet/dist/leaflet.css";
import "./style.css";
import "./_leafletWorkaround.ts";
import _luck from "./_luck.ts";

/* constants */
const CLASSROOM_LATLNG = Leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);
const GAMEPLAY_ZOOM_LEVEL = 19;
const _TILE_DEGREES = 1e-4;
const _NEIGHBORHOOD_SIZE = 8;
const _CACHE_SPAWN_PROBABILITY = 0.1;

/* global variables */
let mapDiv: HTMLDivElement;
let map: Leaflet.Map;

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
}

createMap();
