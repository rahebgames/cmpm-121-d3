# D3: World of Bits (default name, may be changed)

## Game Design Vision

Below is the description from the instructions, it may change as development progresses.

In this game, much like in Pokemon Go, players move about the real world collecting and depositing items in locations that are only interactable when the player is sufficiently close to them. Like in 4096 and Threes, players will primarily be crafting tokens of higher and higher value by combining tokens of lesser value. In particular, only tokens of identical value can be combined, and the result is always a single token of twice the value of an ingredient token. In order to accommodate playing this game out in the real world (e.g. taking the campus shuttle to reach fresh locations), the game needs to run comfortably in a mobile browser and support gameplay across browser sessions (i.e. players can close the browser tab without losing progress in the game).

## Technologies

- TypeScript for most game code, little to no explicit HTML, and all CSS collected in common `style.css` file
- Deno and Vite for building
- GitHub Actions + GitHub Pages for deployment automation

## Assignments

### D3.a: Core mechanics (token collection and crafting)

Key technical challenge: Can you assemble a map-based user interface using the Leaflet mapping framework?
Key gameplay challenge: Can players collect and craft tokens from nearby locations to finally make one of sufficiently high value?

#### Steps

##### Pre-Development

- [x] get repository to work locally
- [x] copy main.ts to reference.ts for future reference
- [x] delete everything in main.ts

##### Map Basics

- [x] put a basic leaflet map on the screen
- [x] draw the player's location on the map
- [x] draw a rectangle representing one cell on the map
- [x] use loops to draw a whole grid of cells on the map
- [x] add token data structure (objects containing numbers to keep tokens distinct)
- [x] add tokens to cells
- [x] add graphics representing tokens to cells
- [x] change token spawning consistency with luck function from starter code
- [x] make initial state of cells consistent across page loads

##### Player Interaction

- [x] add player inventory of only one possible token
- [x] show player inventory on screen
- [x] add ability to pick up tokens by clicking cells
- [x] limit inventory to one token
- [x] limit radius of interactable cells
- [x] add ability to place tokens on empty cells to empty inventory
- [x] add crafting if a token is placed on a cell with an equivalent value
- [x] swap values if placed on a cell with a different value
- [x] add win condition when a token of value 8 is in the inventory

### D3.b: Globe-spanning Gameplay

Key technical challenge: Can you make the cells cover the entire world?
Key gameplay challenge: Can players move around to collect tokens?

#### Steps

##### Software Requirements

- [x] add buttons to move in cardinal directions
- [x] spawn cells when moved to cover screen
- [x] despawn cells when they leave the screen
- [x] anchor cell spawns at null island (0 lat, 0 lng)

##### Gameplay Requirements

- [x] move player when buttons are pressed
- [x] make spawn and despawn of cells also work when map is panned
- [x] make cells reset when respawning
- [x] increase required token value to win
- [x] show required token value to win on screen

##### Non-Required Tips

- [x] change interactibility of cells based on distance (instead of checking on click)
- [x] create interface for cells independent of visual representation
- [x] add visual indicator for interactable cells

### D3.c: Object persistence

Key technical challenge: Can I keep track of off screen cells in a memory efficient way?
Key gameplay challenge: Can the player's actions keep persistence after the cells leave the screen?

#### Steps

##### Software Requirements

The first software requirement (flyweight pattern) is already comleted in previous steps.

- [ ] use the memento pattern or something similar for modified cells

##### Gameplay Requirements

- [ ] give cells persistent memory

##### Non-Required Tips

These are all already completed in previous steps.
