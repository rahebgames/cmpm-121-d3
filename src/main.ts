// @deno-types="npm:@types/leaflet"
import Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./_leafletWorkaround.ts";
import luck from "./_luck.ts";

import { startLocationTracking, stopLocationTracking } from "./geolocation.ts";

/* data types */
enum InputMethod {
  LOCATION_TRACKING,
  MOVEMENT_BUTTONS,
}

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
  data: CellData;
  centerDistance: Point;
  rect: Leaflet.Rectangle;
  isInteractive: boolean;
}

interface CellData {
  token: Token | null;
  gridCoords: Point;
  modified: boolean;
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
if (!localStorage.cellMemory) localStorage.cellMemory = JSON.stringify([]);

let swapControlMethodButton: HTMLButtonElement;
const locationTrackingText = "Swap To Location Tracking";
const buttonMovementText = "Swap To Movement Buttons";
let controlMethod: InputMethod = InputMethod.MOVEMENT_BUTTONS;

let controlPanelDiv: HTMLDivElement;
let inventoryDiv: HTMLDivElement;
let winDiv: HTMLDivElement;

let playerMarker: Leaflet.Marker;
let inventory: Token | null = null;

/* functions */
function saveCellToMemory(data: CellData) {
  const cellStorage = JSON.parse(localStorage.cellMemory || "[]");

  const index = cellStorage.findIndex((d: CellData) =>
    d.gridCoords.x === data.gridCoords.x && d.gridCoords.y === data.gridCoords.y
  );

  if (index !== -1) cellStorage[index] = data;
  else cellStorage.push(data);

  localStorage.cellMemory = JSON.stringify(cellStorage);
}

function movePlayer(latOffset: number, lngOffset: number) {
  const pos = playerMarker.getLatLng();
  playerMarker.setLatLng([pos.lat + latOffset, pos.lng + lngOffset]).fire(
    "move",
  );
}

function swapMovementMode() {
  if (controlMethod == InputMethod.LOCATION_TRACKING) {
    controlMethod = InputMethod.MOVEMENT_BUTTONS;
    swapControlMethodButton.textContent = locationTrackingText;
    stopLocationTracking();
    createMovementButtons();
  } else {
    controlMethod = InputMethod.LOCATION_TRACKING;
    swapControlMethodButton.textContent = buttonMovementText;
    startLocationTracking(onPlayerPositionChanged);
    deleteMovementButtons();
  }
}

function createModeSwappingButton(): void {
  swapControlMethodButton = document.createElement("button");
  swapControlMethodButton.addEventListener("click", (_e) => {
    swapMovementMode();
  });
  document.body.append(swapControlMethodButton);
}

function deleteAllCells() {
  for (const [rect, cell] of cells) {
    rect.remove();
    cell.marker.remove();
  }
  cells.clear();
}

function createHeaderElements(): void {
  const newGameButton = document.createElement("button");
  newGameButton.textContent = "New Game";
  newGameButton.addEventListener("click", (_e) => {
    localStorage.cellMemory = "[]";
    deleteAllCells();
    drawCells();
    movePlayer(0, 0);
  });
  document.body.append(newGameButton);

  createModeSwappingButton();

  controlPanelDiv = document.createElement("div");
  controlPanelDiv.id = "controlPanel";
  document.body.append(controlPanelDiv);
}

function deleteMovementButtons(): void {
  while (controlPanelDiv.childElementCount > 0) {
    controlPanelDiv.removeChild(controlPanelDiv.lastChild!);
  }
}

function createMovementButtons(): void {
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

function deleteOutsideCells() {
  const dirs = getMapBoundsDirections();

  for (const [rect, cell] of cells) {
    const { x, y } = cell.data.gridCoords;
    if (y < dirs.south || y > dirs.north || x < dirs.west || x > dirs.east) {
      rect.remove();
      cell.marker.remove();
      cells.delete(rect);
    }
  }
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
    deleteOutsideCells();
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
  tokenValue: number | null,
  tileBoundsLiteral: Leaflet.LatLngBoundsLiteral,
): Leaflet.Marker {
  const tileBounds = Leaflet.latLngBounds(tileBoundsLiteral);
  const centerDist = getDistanceFromCenter(tileBounds);

  let icon: Leaflet.DivIcon;
  if (tokenValue != null) {
    icon = Leaflet.divIcon({
      html: `<p>${tokenValue}</p>`,
      className: "icon",
      iconAnchor: [centerDist.x + 6, centerDist.y + 40],
    });
  } else {
    icon = Leaflet.divIcon({
      html: `<p> </p>`,
      className: "icon",
      iconAnchor: [centerDist.x + 6, centerDist.y + 40],
    });
  }

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
      inventory?.value == cells.get(e.target)!.data.token?.value &&
      inventory != null
    ) {
      cells.get(e.target)!.data.token!.value *= 2;
      inventory = null;
      cells.get(e.target)!.data.modified = true;
    } else {
      const temp = inventory;
      inventory = cells.get(e.target)!.data.token;
      cells.get(e.target)!.data.token = temp;
      cells.get(e.target)!.data.modified = true;
    }

    saveCellToMemory(cells.get(e.target)!.data);

    updateInventoryDisplay();
    updateCellDisplay(e.target, cells.get(e.target)!.data.token);

    if (inventory != null && inventory.value >= WIN_REQUIREMENT) win();
  });

  rect.addTo(cellGroup);
  return rect;
}

function coordsToLatLng(coords: Point): Leaflet.LatLng {
  return new Leaflet.LatLng(coords.y * TILE_DEGREES, coords.x * TILE_DEGREES);
}

function createCellsFromMemory(): Point[] {
  const cellsReadFromMemory: Point[] = [];
  const existingCoords = new Set<string>();
  for (const cell of cells.values()) {
    existingCoords.add(`${cell.data.gridCoords.x},${cell.data.gridCoords.y}`);
  }

  const cellStorage = JSON.parse(localStorage.cellMemory || "[]");
  for (const data of cellStorage) {
    if (!data) continue;
    const coordKey = `${data.gridCoords.x},${data.gridCoords.y}`;
    if (existingCoords.has(coordKey)) {
      cellsReadFromMemory.push(data.gridCoords);
      continue;
    }

    const latLng = coordsToLatLng(data.gridCoords);

    const tileBoundsLiteral: Leaflet.LatLngBoundsLiteral = [
      [latLng.lat, latLng.lng],
      [latLng.lat + TILE_DEGREES, latLng.lng + TILE_DEGREES],
    ];
    const iconMarker = data.token
      ? createIcon(data.token.value, tileBoundsLiteral)
      : createIcon(null, tileBoundsLiteral);
    const rect = createRectangle(tileBoundsLiteral);

    cells.set(rect, {
      marker: iconMarker,
      data: data,
      centerDistance: getDistanceFromCenter(
        Leaflet.latLngBounds(tileBoundsLiteral),
      ),
      rect: rect,
      isInteractive: false,
    });

    cellsReadFromMemory.push(data.gridCoords);
  }

  return cellsReadFromMemory;
}

// Web Mercator projection makes cells look rectangular, they are actually square
function drawCells(): void {
  const dirs = getMapBoundsDirections();
  const cellsReadFromMemory = createCellsFromMemory();

  const seenCoords = new Set(cellsReadFromMemory.map((c) => `${c.x},${c.y}`));
  for (const cell of cells.values()) {
    const { x, y } = cell.data.gridCoords;
    seenCoords.add(`${x},${y}`);
  }

  for (let gridY = dirs.south; gridY <= dirs.north; gridY++) {
    for (let gridX = dirs.west; gridX <= dirs.east; gridX++) {
      const coordKey = `${gridX},${gridY}`;
      if (seenCoords.has(coordKey)) continue;

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
        data: {
          token: { value: tokenValue },
          gridCoords: { x: gridX, y: gridY },
          modified: false,
        },
        centerDistance: getDistanceFromCenter(
          Leaflet.latLngBounds(tileBoundsLiteral),
        ),
        rect: rect,
        isInteractive: false,
      });
    }
  }
}

function onPlayerPositionChanged(position: GeolocationPosition) {
  const playerPos: Leaflet.LatLngExpression = [
    position.coords.latitude,
    position.coords.longitude,
  ];
  playerMarker.setLatLng(playerPos);
  if (!map.getBounds().contains(playerPos)) map.panTo(playerPos);
}

function main(): void {
  createHeaderElements();

  if (controlMethod == InputMethod.MOVEMENT_BUTTONS) {
    swapControlMethodButton.textContent = locationTrackingText;
    createMovementButtons();
  } else {
    swapControlMethodButton.textContent = buttonMovementText;
  }

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
