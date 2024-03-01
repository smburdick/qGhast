import kaboom from "kaboom";

kaboom();

// Characters
loadSprite("pc", "sprites/pc.png");
loadSprite("xError", "sprites/x-error.png");
loadSprite("zError", "sprites/z-error.png");

// Static objects
loadSprite("z-stabilizer", "sprites/z-stabilizer.png");
loadSprite("x-stabilizer", "sprites/x-stabilizer.png");
loadSprite("block", "sprites/block.png");

setBackground(141, 183, 255);

const { abs, random, round } = Math;

const SPEED = 320;
const ENEMY_SPEED = 160;
const BULLET_SPEED = 800;
const ERROR_RATE = 0.1;
const STABILIZER_INSERTION_RATE = 0.1;
const WAIT_TIME = 2;
const BLOCK_DIMENSION = 32;

// Add player game object
const player = add([
  sprite("pc"),
  scale(0.5),
  pos(80, 80),
  area(),
  // anchor("center"),
]);

player.xDamage = 0;
player.zDamage = 0;

let ticks = 0;

loop(1, () => {
  if (!player.exists() || player.xDamage >= 3 || player.zDamage >= 3) {
    console.log("Game over");
    go("gameover", { score: 20 - player.xDamage + player.zDamage });
  }
  const poll = ticks++ > WAIT_TIME ? round(random() * (1 / ERROR_RATE)) : 0;
  if (poll === 2) {
    const zError = add([
      sprite("zError"),
      scale(0.5),
      pos(rand(0, width()), rand(0, height())),
      area(),
      // anchor("center"),
      state("move", ["idle", "attack", "move"]),
      "zError",
    ]);
    // Run the callback once every time we enter "idle" state.
    // Here we stay "idle" for 0.5 second, then enter "attack" state.
    zError.onStateEnter("idle", async () => {
      await wait(0.5);
      zError.enterState("attack");
    });
    // When we enter "attack" state, we fire a bullet,
    // and enter "move" state after 1 sec
    zError.onStateEnter("attack", async () => {
      // Don't do anything if player doesn't exist anymore
      if (player.exists()) {
        const dir = player.pos.sub(zError.pos).unit();
        add([
          pos(zError.pos),
          move(dir, BULLET_SPEED),
          rect(12, 12),
          area(),
          offscreen({ destroy: true }),
          // anchor("center"),
          color(RED),
          "bullet",
        ]);
      }
      await wait(1);
      zError.enterState("move");
    });
    zError.onStateEnter("move", async () => {
      await wait(2);
      zError.enterState("idle");
    });
    zError.onStateUpdate("move", () => {
      if (!player.exists()) return;
      const dir = player.pos.sub(zError.pos).unit();
      zError.move(dir.scale(ENEMY_SPEED));
    });
  } else if (poll === 1) {
    const xError = add([
      sprite("xError"),
      scale(0.5),
      pos(rand(0, width()), rand(0, height())),
      area(),
      // anchor("center"),
      state("move", ["idle", "attack", "move", "lunge"]),
      "zError",
    ]);
    xError.onStateEnter("move", async () => {
      await wait(2);
      xError.enterState("idle");
    });
    xError.onStateUpdate("move", () => {
      if (!player.exists()) return;
      const dir = player.pos.sub(xError.pos).unit();
      xError.move(dir.scale(ENEMY_SPEED));
    });
    xError.onStateEnter("idle", async () => {
      await wait(0.5);
      xError.enterState("attack");
    });
    xError.onStateEnter("lunge", async () => {
      xError.lungePoints++;
      if (xError.lungePoints > 10) {
        xError.enterState("move");
      } else {
        const dir = player.pos.sub(xError.pos).unit();
        xError.move(dir.scale(ENEMY_SPEED * 20));
        await wait(0.01);
        xError.enterState("lunge");
      }
    });
    xError.onStateEnter("attack", async () => {
      await wait(1);
      xError.lungePoints = 0;
      xError.enterState("lunge");
    });
  }
});

player.onCollide("xError", () => {
  player.xDamage += 1;
});

player.onCollide("zError", () => {
  player.zDamage += 1;
});

player.onCollide("bullet", (bullet) => {
  player.xDamage += 1;
  destroy(bullet);
});

player.onCollide("x-stabilizer", (stabilizer) => {
  player.zDamage -= 1;
  destroy(stabilizer);
});

player.onCollide("z-stabilizer", (stabilizer) => {
  player.xDamage -= 1;
  destroy(stabilizer);
});

// Register input handlers & movement
onKeyDown("left", () => {
  player.move(-SPEED, 0);
});

onKeyDown("right", () => {
  // player.flipX(true)
  player.move(SPEED, 0);
});

onKeyDown("up", () => {
  player.move(0, -SPEED);
});

onKeyDown("down", () => {
  player.move(0, SPEED);
});

// MAZE FUNCTIONS

function cellsASCII(grid) {
  var { width, height } = grid;
  var cells = new Array(width * height);
  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var cell = { x, y };
      cells[locate(grid, cell)] = cell;
    }
  }
  return cells;
}

function locate(grid, cell) {
  return cell.y * grid.width + cell.x;
}

function adjacent(a, b) {
  return abs(b.x - a.x) + abs(b.y - a.y) === 2;
}

function choose(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function connect(maze, world) {
  for (var [node, neighbors] of maze) {
    world.tiles[locate(world, node)] = "floor";
    for (var neighbor of neighbors) {
      var midpoint = {
        x: node.x + (neighbor.x - node.x) / 2,
        y: node.y + (neighbor.y - node.y) / 2,
      };
      world.tiles[locate(world, midpoint)] = "floor";
    }
  }
}

function worldView(world) {
  var view = "";
  for (var cell of cellsASCII(world)) {
    var tile = world.tiles[locate(world, cell)];
    var sprite = spritesASCII[tile];
    if (!cell.x && cell.y) {
      view += "\n" + sprite;
    } else {
      view += sprite;
    }
  }
  return view;
}

const floorChar = " ";
const wallChar = "#";

const spritesASCII = {
  floor: floorChar,
  wall: wallChar,
};

const MAZE_WIDTH = 15;
const MAZE_HEIGHT = MAZE_WIDTH;

function generateMaze() {
  const generate = require("maze");
  var world = {
    width: MAZE_WIDTH,
    height: MAZE_HEIGHT,
    tiles: new Array(MAZE_HEIGHT * MAZE_WIDTH).fill("wall"),
  };

  var nodes = cellsASCII(world).filter((cell) => cell.x % 2 && cell.y % 2);
  var maze = generate(nodes, adjacent, choose);
  connect(maze, world);

  maze = worldView(world);

  replaceAt = function (str, index, replacement) {
    return (
      str.substring(0, index) +
      replacement +
      str.substring(index + replacement.length)
    );
  };

  for (let i = 0; i < maze.length; i++) {
    if (maze[i] === floorChar) {
      const randomNumber = round(random() * 20);
      if (randomNumber === 2) {
        maze = replaceAt(maze, i, xSpot);
      } else if (randomNumber === 1) {
        maze = replaceAt(maze, i, zSpot);
      }
    }
  }
  return maze; // string representation of the maze
}

const xSpot = "X";
const zSpot = "Z";
var maze = generateMaze();

console.log(maze);

const mazeTileSettings = {
  wallChar: () => [
    sprite("block"),
    solid(),
    area(),
    rect(BLOCK_DIMENSION, BLOCK_DIMENSION),
    "block",
  ],
  xSpot: () => [
    sprite("x-stabilizer"),
    area(),
    rect(BLOCK_DIMENSION, BLOCK_DIMENSION),
    "x-stabilizer",
  ],
  zSpot: () => [
    sprite("z-stabilizer"),
    area(),
    rect(BLOCK_DIMENSION, BLOCK_DIMENSION),
    "z-stabilizer",
  ],
};

// FIXME: This is not working
// addLevel([maze], {
//   tileWidth: BLOCK_DIMENSION,
//   tileHeight: BLOCK_DIMENSION,
//   tiles: mazeTileSettings,
// });
