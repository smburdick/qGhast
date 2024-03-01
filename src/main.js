import kaboom from "kaboom"

kaboom()

loadSprite("pc", "sprites/pc.png")
// FIXME: These are the wrong sprite names.
loadSprite("z", "sprites/x-error.png")
loadSprite("x", "sprites/z-error.png")

setBackground(141, 183, 255)

const SPEED = 320
const ENEMY_SPEED = 160
const BULLET_SPEED = 800
const TOPOLOGICAL_ERROR_RATE = 0.1;

// Add player game object
const player = add([
	sprite("pc"),
	scale(0.5),
	pos(80, 80),
	area(),
	anchor("center"),
])

player.xDamage = 0

loop(1, () => {
	// If xDamage or ZDamage is greater than 10, the game is over
	if (!player.exists() || player.xDamage > 10 || player.zDamage > 10) {
		console.log("Game over")
		go("gameover", { score: 20 - player.xDamage + player.zDamage })
	}
	const poll = Math.round(rand(1 / TOPOLOGICAL_ERROR_RATE));
	if (poll === 2) {
		const xError = add([
			sprite("x"),
			scale(0.5),
			pos(rand(0, width()), rand(0, height())),
			area(),
			anchor("center"),
			state("move", [ "idle", "attack", "move" ]),
		])
		// Run the callback once every time we enter "idle" state.
		// Here we stay "idle" for 0.5 second, then enter "attack" state.
		xError.onStateEnter("idle", async () => {
			await wait(0.5)
			xError.enterState("attack")
		})
		// When we enter "attack" state, we fire a bullet, and enter "move" state after 1 sec
		xError.onStateEnter("attack", async () => {
			// Don't do anything if player doesn't exist anymore
			if (player.exists()) {
				const dir = player.pos.sub(xError.pos).unit()
				const bullet = add([
					pos(xError.pos),
					move(dir, BULLET_SPEED),
					rect(12, 12),
					area(),
					offscreen({ destroy: true }),
					anchor("center"),
					color(BLUE),
				])
				bullet.onCollide("pc", () => {
					destroy(bullet)
					player.xDamage += 1
				})
			}
			await wait(1)
			xError.enterState("move")
		})
		xError.onStateEnter("move", async () => {
			await wait(2)
			xError.enterState("idle")
		})
		// Like .onUpdate() which runs every frame, but only runs when the current state is "move"
		// Here we move towards the player every frame if the current state is "move"
		xError.onStateUpdate("move", () => {
			if (!player.exists()) return
			const dir = player.pos.sub(xError.pos).unit()
			xError.move(dir.scale(ENEMY_SPEED))
		})
		xError.onCollide("pc", () => {
			console.log("[X] Collided with player")
			player.xDamage += 1
		})
	} else if (poll === 1) {
		const zError = add([
			sprite("z"),
			scale(0.5),
			pos(rand(0, width()), rand(0, height())),
			area(),
			anchor("center"),
			state("move", [ "idle", "attack", "move", "lunge" ]),
		]);
		zError.onStateEnter("move", async () => {
			await wait(2)
			zError.enterState("idle")
		})
		zError.onStateUpdate("move", () => {
			if (!player.exists()) return
			const dir = player.pos.sub(zError.pos).unit()
			zError.move(dir.scale(ENEMY_SPEED))
		})
		zError.onStateEnter("idle", async () => {
			await wait(0.5)
			zError.enterState("attack")
		})
		zError.onStateEnter("lunge", async () => {
			zError.lungePoints++;
			if (zError.lungePoints > 10) {
				zError.enterState("move")
			} else {
				const dir = player.pos.sub(zError.pos).unit()
				zError.move(dir.scale(ENEMY_SPEED * 20))
				await wait(0.01)	
				zError.enterState("lunge")
			}
		})
		zError.onStateEnter("attack", async () => {
			// Lunge at the player, if they are close enough
			await wait(1)
			zError.lungePoints = 0;
			zError.enterState("lunge")
		})
		zError.onCollide("pc", () => {
			player.zDamage += 1
		})
}});


// Register input handlers & movement
onKeyDown("left", () => {
	player.move(-SPEED, 0)
})

onKeyDown("right", () => {
	// player.flipX(true)
	player.move(SPEED, 0)
})

onKeyDown("up", () => {
	player.move(0, -SPEED)
})

onKeyDown("down", () => {
	player.move(0, SPEED)
})

// MAZE FUNCTIONS

function cells(grid) {
	var { width, height } = grid
	var cells = new Array(width * height)
	for (var y = 0; y < height; y++) {
		for (var x = 0; x < width; x++) {
			var cell = { x, y }
			cells[locate(grid, cell)] = cell
		}
	}
	return cells
}

function locate(grid, cell) {
	return cell.y * grid.width + cell.x
}

const abs = Math.abs

function adjacent(a, b) {
	return abs(b.x - a.x) + abs(b.y - a.y) === 2
}

function choose(array) {
	return array[Math.floor(Math.random() * array.length)]
}

function connect(maze, world) {
	for (var [node, neighbors] of maze) {
		world.tiles[locate(world, node)] = 'floor'
		for (var neighbor of neighbors) {
			var midpoint = {
				x: node.x + (neighbor.x - node.x) / 2,
				y: node.y + (neighbor.y - node.y) / 2
			}
			world.tiles[locate(world, midpoint)] = 'floor'
		}
	}
}

function renderMazeASCII(world) {
	var view = ''
	for (var cell of cells(world)) {
		var tile = world.tiles[locate(world, cell)]
		var sprite = sprites[tile]
		if (!cell.x && cell.y) {
			view += '\n' + sprite
		} else {
			view += sprite
		}
	}
	return view
}

const sprites = {
	floor: '  ',
	wall: String.fromCharCode(0x2588).repeat(2)
}

function generateMaze () {
	const generate = require('maze');
	var world = {
		width: 15,
		height: 15,
		tiles: new Array(15 * 15).fill('wall')
	}

	var nodes = cells(world).filter(cell => cell.x % 2 && cell.y % 2)
	var maze = generate(nodes, adjacent, choose)
	connect(maze, world)

	var view = renderMazeASCII(world)
	console.log(view)

	return world
}

const maze = generateMaze();

// Add maze elements to the game
for (var cell of cells(maze)) {
	var tile = maze.tiles[locate(maze, cell)]
	if (tile === 'wall') {
		add([
			rect(32, 32),
			pos(cell.x * 32, cell.y * 32),
			color(0, 0, 0),
			area(),
			center()
		])
	}
}
