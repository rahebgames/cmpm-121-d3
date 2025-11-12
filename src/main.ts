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

interface Directions {
  north: number;
  east: number;
  south: number;
  west: number;
}

interface Token {
  value: number;
}

interface Cell {
  marker: Leaflet.Marker;
  token: Token | null;
  gridCoords: Point;
  centerDistance: Point;
  rect: Leaflet.Rectangle;
  isInteractive: boolean;
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
const WIN_REQUIREMENT = 32;
const winText = "You win!";

/* global variables */
let map: Leaflet.Map;
let cellGroup: Leaflet.FeatureGroup;
const cells = new Map<Leaflet.Rectangle, Cell>();

let inventoryDiv: HTMLDivElement;
let winDiv: HTMLDivElement;

let playerMarker: Leaflet.Marker;
let inventory: Token | null = null;

/* functions */
function movePlayer(latOffset: number, lngOffset: number) {
  const pos = playerMarker.getLatLng();
  playerMarker.setLatLng([pos.lat + latOffset, pos.lng + lngOffset]).fire(
    "move",
  );
}

function createButtons(): void {
  const controlPanelDiv = document.createElement("div");
  controlPanelDiv.id = "controlPanel";
  document.body.append(controlPanelDiv);

  const northButton = document.createElement("button");
  northButton.classList.add("moveButton");
  northButton.textContent = "↑";
  controlPanelDiv.append(northButton);
  northButton.addEventListener("click", () => movePlayer(TILE_DEGREES, 0));

  const middleButtonsDiv = document.createElement("div");
  middleButtonsDiv.id = "middleButtons";
  controlPanelDiv.append(middleButtonsDiv);

  const westButton = document.createElement("button");
  westButton.classList.add("moveButton");
  westButton.textContent = "←";
  middleButtonsDiv.append(westButton);
  westButton.addEventListener("click", () => movePlayer(0, -TILE_DEGREES));

  const eastButton = document.createElement("button");
  eastButton.classList.add("moveButton");
  eastButton.textContent = "→";
  middleButtonsDiv.append(eastButton);
  eastButton.addEventListener("click", () => movePlayer(0, TILE_DEGREES));

  const southButton = document.createElement("button");
  southButton.classList.add("moveButton");
  southButton.textContent = "↓";
  controlPanelDiv.append(southButton);
  southButton.addEventListener("click", () => movePlayer(-TILE_DEGREES, 0));
}

function getMapBoundsDirections(): Directions {
  const bounds = map.getBounds();
  const north = Math.round(bounds.getNorth() / TILE_DEGREES);
  const east = Math.round(bounds.getEast() / TILE_DEGREES);
  const south = Math.round(bounds.getSouth() / TILE_DEGREES);
  const west = Math.round(bounds.getWest() / TILE_DEGREES);

  return { north: north, east: east, south: south, west: west };
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

  map.on("moveend", function () {
    const dirs = getMapBoundsDirections();

    for (const [rect, cell] of cells) {
      const { x, y } = cell.gridCoords;
      if (y < dirs.south || y > dirs.north || x < dirs.west || x > dirs.east) {
        rect.remove();
        cell.marker.remove();
        cells.delete(rect);
      }
    }

    drawCells();
    movePlayer(0, 0);
  });

  Leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: GAMEPLAY_ZOOM_LEVEL,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  playerMarker = Leaflet.marker(CLASSROOM_LATLNG);
  playerMarker.bindTooltip("That's you!");
  playerMarker.addTo(map);
  playerMarker.on("move", updateCellInteractivity);

  cellGroup = Leaflet.featureGroup();
  cellGroup.addTo(map);
}

function getRandomTokenValue(seed: string): number {
  const randValue = luck(seed) * 10;
  if (randValue <= 0.8) return 1;
  if (randValue <= 0.95) return 2;
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

  iconMarker.addTo(cellGroup);
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
  if (winDiv.textContent == winText) return;
  winDiv.textContent = "You win!";
}

function updateCellInteractivity(): void {
  const playerPos = playerMarker.getLatLng();

  for (const cell of cells.values()) {
    const rectCenter = cell.rect.getBounds().getCenter();
    const distance = playerPos.distanceTo(rectCenter);
    const withinRange = distance <= INTERACTABLE_RANGE;

    if (withinRange && !cell.isInteractive) {
      cell.rect.setStyle({ opacity: 1, fillOpacity: 0.7 });

      const element = cell.rect.getElement();
      if (element) element.classList.add("interactable");

      cell.isInteractive = true;
    } else if (!withinRange && cell.isInteractive) {
      cell.rect.setStyle({ opacity: 0.5, fillOpacity: 0.3 });

      const element = cell.rect.getElement();
      if (element) element.classList.remove("interactable");

      cell.isInteractive = false;
    }
  }
}

function createRectangle(
  tileBoundsLiteral: Leaflet.LatLngBoundsLiteral,
): Leaflet.Rectangle {
  const tileBounds = Leaflet.latLngBounds(tileBoundsLiteral);
  const rect = Leaflet.rectangle(tileBounds);

  rect.on("click", function (e) {
    const cell = cells.get(e.target);
    if (!cell?.isInteractive) return;

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

    if (inventory != null && inventory.value >= WIN_REQUIREMENT) win();
  });

  rect.addTo(cellGroup);
  return rect;
}

// Web Mercator projection makes cells look rectangular, they are actually square
function drawCells(): void {
  const dirs = getMapBoundsDirections();

  for (let gridY = dirs.south; gridY <= dirs.north; gridY++) {
    for (let gridX = dirs.west; gridX <= dirs.east; gridX++) {
      if (
        Array.from(cells.values()).some((cell) =>
          cell.gridCoords.x === gridX && cell.gridCoords.y === gridY
        )
      ) {
        continue;
      }

      const lat = gridY * TILE_DEGREES;
      const lng = gridX * TILE_DEGREES;
      const seed = `${lat}, ${lng}`;
      if (luck(seed) >= CACHE_SPAWN_PROBABILITY) continue;

      const tileBoundsLiteral: Leaflet.LatLngBoundsLiteral = [
        [lat, lng],
        [lat + TILE_DEGREES, lng + TILE_DEGREES],
      ];

      const tokenValue = getRandomTokenValue(seed);
      const iconMarker = createIcon(tokenValue, tileBoundsLiteral);
      const rect = createRectangle(tileBoundsLiteral);

      cells.set(rect, {
        marker: iconMarker,
        token: { value: tokenValue },
        gridCoords: { x: gridX, y: gridY },
        centerDistance: getDistanceFromCenter(
          Leaflet.latLngBounds(tileBoundsLiteral),
        ),
        rect: rect,
        isInteractive: false,
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

  winDiv = document.createElement("div");
  winDiv.id = "win";
  winDiv.textContent = `You need a token worth ${WIN_REQUIREMENT} to win.`;
  document.body.append(winDiv);

  movePlayer(0, 0);
}
main();
