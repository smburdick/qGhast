import kaboom from "kaboom"

kaboom()

loadSprite("pc", "sprites/pc.png")
loadSprite("x", "sprites/x-error.png")
loadSprite("z", "sprites/z-error.png")

setBackground(141, 183, 255)

const SPEED = 320
const ENEMY_SPEED = 160
const BULLET_SPEED = 800

// Add player game object
const player = add([
	sprite("pc"),
	scale(0.5),
	pos(80, 80),
	area(),
	anchor("center"),
])

// Each second, there is a 1 in 10 chance of spawning a new enemy
loop(1, () => {
	const errorRate = 0.1;
	const poll = Math.round(rand(1 / errorRate));
	console.log(poll)
	if (poll === 0) {
		const xError = add([
			sprite("z"),
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
				add([
					pos(xError.pos),
					move(dir, BULLET_SPEED),
					rect(12, 12),
					area(),
					offscreen({ destroy: true }),
					anchor("center"),
					color(BLUE),
					"bullet",
				])
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
	} else if (poll === 1) {
		const zError = add([
			sprite("x"),
			scale(0.5),
			pos(rand(0, width()), rand(0, height())),
			area(),
			anchor("center"),
			state("move", [ "idle", "attack", "move" ]),
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
	}
})

// Taking a bullet makes us disappear
player.onCollide("bullet", (bullet) => {
	destroy(bullet)
	destroy(player)
	addKaboom(bullet.pos)
})

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

export default function generateMaze () {
	const nmg = require('node-maze-generator');
	const generator = new nmg.generators.generator([{ generator: nmg.generators.maze, options: { width: 10, height: 10 } }]);
	return new nmg.renderer(generator);
}

const maze = generateMaze()
