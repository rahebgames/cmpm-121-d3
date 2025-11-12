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

interface Cell {
  marker: Leaflet.Marker;
  token: Token | null;
  gridCoords: Point;
  centerDistance: Point;
}

/* constants */
const CLASSROOM_LATLNG = Leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const CACHE_SPAWN_PROBABILITY = 0.1;
const INTERACTABLE_RANGE = 40;

/* global variables */
let map: Leaflet.Map;
const cells = new Map<Leaflet.Rectangle, Cell>();

let inventoryDiv: HTMLDivElement;
let winDiv: HTMLDivElement | null;

let playerMarker: Leaflet.Marker;
let inventory: Token | null = null;

/* functions */
function createButtons(): void {
  const controlPanelDiv = document.createElement("div");
  controlPanelDiv.id = "controlPanel";
  document.body.append(controlPanelDiv);

  const northButton = document.createElement("button");
  northButton.classList.add("moveButton");
  northButton.textContent = "↑";
  controlPanelDiv.append(northButton);

  northButton.addEventListener("click", (_e) => {
    const playerPos = playerMarker.getLatLng();
    playerMarker.setLatLng([playerPos.lat + TILE_DEGREES, playerPos.lng]);
  });

  const middleButtonsDiv = document.createElement("div");
  middleButtonsDiv.id = "middleButtons";
  controlPanelDiv.append(middleButtonsDiv);

  const westButton = document.createElement("button");
  westButton.classList.add("moveButton");
  westButton.textContent = "←";
  middleButtonsDiv.append(westButton);

  westButton.addEventListener("click", (_e) => {
    const playerPos = playerMarker.getLatLng();
    playerMarker.setLatLng([playerPos.lat, playerPos.lng - TILE_DEGREES]);
  });

  const eastButton = document.createElement("button");
  eastButton.classList.add("moveButton");
  eastButton.textContent = "→";
  middleButtonsDiv.append(eastButton);

  eastButton.addEventListener("click", (_e) => {
    const playerPos = playerMarker.getLatLng();
    playerMarker.setLatLng([playerPos.lat, playerPos.lng + TILE_DEGREES]);
  });

  const southButton = document.createElement("button");
  southButton.classList.add("moveButton");
  southButton.textContent = "↓";
  controlPanelDiv.append(southButton);

  southButton.addEventListener("click", (_e) => {
    const playerPos = playerMarker.getLatLng();
    playerMarker.setLatLng([playerPos.lat - TILE_DEGREES, playerPos.lng]);
  });
}

function createMap(): void {
  const mapDiv = document.createElement("div");
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
  const cell = cells.get(rect);
  if (!cell) return;
  const marker = cell.marker;

  if (marker && cell.centerDistance) {
    let icon: Leaflet.DivIcon;

    if (newToken != null) {
      icon = Leaflet.divIcon({
        html: `<p>${newToken.value}</p>`,
        className: "icon",
        iconAnchor: [cell.centerDistance.x + 6, cell.centerDistance.y + 40],
      });
    } else {
      icon = Leaflet.divIcon({
        html: `<p> </p>`,
        className: "icon",
        iconAnchor: [cell.centerDistance.x + 6, cell.centerDistance.y + 40],
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
  tileBoundsLiteral: Leaflet.LatLngBoundsLiteral,
): Leaflet.Rectangle {
  const tileBounds = Leaflet.latLngBounds(tileBoundsLiteral);
  const rect = Leaflet.rectangle(tileBounds);

  rect.on("click", function (e) {
    const playerPosition = playerMarker.getLatLng();
    const rectBounds: Leaflet.LatLngBounds = e.target.getBounds();
    const distance = playerPosition.distanceTo(rectBounds.getCenter());

    if (distance > INTERACTABLE_RANGE) return;

    if (
      inventory?.value == cells.get(e.target)!.token?.value && inventory != null
    ) {
      cells.get(e.target)!.token!.value *= 2;
      inventory = null;
    } else {
      const temp = inventory;
      inventory = cells.get(e.target)!.token;
      cells.get(e.target)!.token = temp;
    }

    updateInventoryDisplay();
    updateCellDisplay(e.target, cells.get(e.target)!.token);

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

      const tileBoundsLiteral: Leaflet.LatLngBoundsLiteral = [
        [lat, lng],
        [lat + TILE_DEGREES, lng + TILE_DEGREES],
      ];
      const tileBounds: Leaflet.LatLngBounds = Leaflet.latLngBounds(
        tileBoundsLiteral,
      );

      const tokenValue = getRandomTokenValue(seed);

      const iconMarker = createIcon(tokenValue, tileBoundsLiteral);
      const rect = createRectangle(tileBoundsLiteral);

      cells.set(rect, {
        marker: iconMarker,
        token: { value: tokenValue },
        gridCoords: { x: 0, y: 0 },
        centerDistance: getDistanceFromCenter(tileBounds),
      });
    }
  }
}

function main(): void {
  createButtons();

  createMap();
  drawCells();

  inventoryDiv = document.createElement("div");
  inventoryDiv.id = "statusPanel";
  inventoryDiv.textContent = "No held tokens.";
  document.body.append(inventoryDiv);
}
main();
