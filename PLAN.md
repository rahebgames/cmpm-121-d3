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
- [ ] draw a rectangle representing one cell on the map
- [ ] use loops to draw a whole grid of cells on the map
- [ ] add token data structure (objects containing numbers to keep tokens distinct)
- [ ] add tokens to cells
- [ ] add graphics representing tokens to cells
- [ ] change token spawning consistency with luck function from starter code
- [ ] make initial state of cells consistent across page loads

##### Player Interaction

- [ ] add player inventory of only one possible token
- [ ] show player inventory on screen
- [ ] add ability to pick up tokens by clicking cells
- [ ] limit inventory to one token
- [ ] limit radius of interactable cells
- [ ] add ability to place tokens on empty cells to empty inventory
- [ ] add crafting if a token is placed on a cell with an equivalent value
- [ ] swap values if placed on a cell with a different value
- [ ] add win condition when a token of value 8 is in the inventory
