// @deno-types="npm:@types/leaflet"
import Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./_leafletWorkaround.ts";
import luck from "./_luck.ts";

/* data types */
interface Point {
  x: number;
  y: number;
}

interface Token {
  value: number;
}

interface CellOptions extends Leaflet.PolylineOptions {
  token?: Token;
  centerDist?: Point;
}

/* constants */
const CLASSROOM_LATLNG = Leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const CACHE_SPAWN_PROBABILITY = 0.1;

/* global variables */
let mapDiv: HTMLDivElement;
let map: Leaflet.Map;
let inventoryDiv: HTMLDivElement;
let winDiv: HTMLDivElement | null;

const cellMarkers = new Map<Leaflet.Rectangle, Leaflet.Marker>();

let playerMarker: Leaflet.Marker;
let inventory: Token | null = null;

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

function getDistanceFromCenter(
  tileBounds: Leaflet.LatLngBounds,
): Point {
  const centerLat = tileBounds.getNorth() - tileBounds.getCenter().lat;
  const centerLng = tileBounds.getEast() - tileBounds.getCenter().lng;

  return { x: centerLat, y: centerLng };
}

function createIcon(
  tokenValue: number,
  tileBoundsLiteral: Leaflet.LatLngBoundsLiteral,
): Leaflet.Marker {
  const tileBounds = Leaflet.latLngBounds(tileBoundsLiteral);
  const centerDist = getDistanceFromCenter(tileBounds);

  const icon = Leaflet.divIcon({
    html: `<p>${tokenValue}</p>`,
    className: "icon",
    iconAnchor: [centerDist.x + 6, centerDist.y + 40],
  });

  const center = tileBounds.getCenter();
  const iconMarker = Leaflet.marker(center, {
    icon: icon,
    interactive: false,
  });

  iconMarker.addTo(map);
  return iconMarker;
}

function updateInventoryDisplay(): void {
  if (inventory == null) inventoryDiv.textContent = "No held tokens.";
  else inventoryDiv.textContent = `Held token: ${inventory.value}`;
}

function updateCellDisplay(
  rect: Leaflet.Rectangle,
  newToken: Token | null,
): void {
  const marker = cellMarkers.get(rect);
  const options = rect.options as CellOptions;

  if (marker && options.centerDist) {
    let icon: Leaflet.DivIcon;

    if (newToken != null) {
      icon = Leaflet.divIcon({
        html: `<p>${newToken.value}</p>`,
        className: "icon",
        iconAnchor: [options.centerDist.x + 6, options.centerDist.y + 40],
      });
    } else {
      icon = Leaflet.divIcon({
        html: `<p> </p>`,
        className: "icon",
        iconAnchor: [options.centerDist.x + 6, options.centerDist.y + 40],
      });
    }

    marker.setIcon(icon);
  }
}

function win(): void {
  if (winDiv != null) return;
  winDiv = document.createElement("div");
  winDiv.id = "winDiv";
  winDiv.textContent = "You win!";
  document.body.append(winDiv);
}

function createRectangle(
  tokenValue: number,
  tileBoundsLiteral: Leaflet.LatLngBoundsLiteral,
): Leaflet.Rectangle {
  const tileBounds = Leaflet.latLngBounds(tileBoundsLiteral);

  const rectOptions: CellOptions = {
    token: { value: tokenValue },
    centerDist: getDistanceFromCenter(tileBounds),
  };
  const rect = Leaflet.rectangle(tileBounds, rectOptions);

  rect.on("click", function (e) {
    if (
      inventory?.value == e.target.options.token?.value && inventory != null
    ) {
      e.target.options.token.value *= 2;
      inventory = null;
    } else {
      const temp = inventory;
      inventory = e.target.options.token;
      e.target.options.token = temp;
    }

    updateInventoryDisplay();
    updateCellDisplay(e.target, e.target.options.token);

    if (inventory != null && inventory.value >= 8) win();
  });

  rect.addTo(map);
  return rect;
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
      const seed = `${lat}, ${lng}`;
      if (luck(seed) >= CACHE_SPAWN_PROBABILITY) continue;

      const tileBounds: Leaflet.LatLngBoundsLiteral = [
        [lat, lng],
        [lat + TILE_DEGREES, lng + TILE_DEGREES],
      ];

      const tokenValue = getRandomTokenValue(seed);

      const iconMarker = createIcon(tokenValue, tileBounds);
      const rect = createRectangle(tokenValue, tileBounds);

      cellMarkers.set(rect, iconMarker);
    }
  }
}

function main(): void {
  createMap();
  drawCells();

  inventoryDiv = document.createElement("div");
  inventoryDiv.id = "statusPanel";
  inventoryDiv.textContent = "No held tokens.";
  document.body.append(inventoryDiv);
}
main();
