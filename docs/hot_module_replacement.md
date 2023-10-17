# Hot Module Replacement (HMR)

_The How and Why with Parcel and Phaser_

Testing changes to a game's code can be a laborious process. A big part of that work is often manually getting the game into the state required for testing a certain scenario after applying each tweak. This is because, in order to see how the latest change effects the scenario, it's necessary to reload the game, which resets its state. For example, if we're developing a platformer game and we want to test whether the player can jump up to a certain platform, we'd have to change the code, restart the game, then play through until we get back to the point with the platform in question. Even if the developer is a world-class speed runner, this can be a rather slow and distraction-prone feedback loop, making the developer's task much more difficult than it needs to be.

Enter [Hot Module Replacement](https://parcel2-docs.vercel.app/features/hmr/), an advanced technique which allows a developer to load in changes to the game's code without loosing its state. To get this working in an app being built with Parcel is straightforward, as Parcel has explicit out-of-the-box support for HMR.

In the rest of this article, we'll create an extremely minimal platformer in Phaser that opts-in to Parcel's HMR feature, allowing us to move the player around and make changes to the code (e.g. gravity) without our sprite's position being reset to its initial position.

## Let's code!

### package.json

Point Parcel's development server to our `index.html`.

```json
{
  "name": "parcel_playground",
  "packageManager": "yarn@3.6.4",
  "source": "src/index.html",
  "scripts": {
    "start": "parcel serve --lazy",
  },
  "devDependencies": {
    "parcel": "^2.9.3",
  },
  "dependencies": {
    "phaser": "^3.60.0",
  }
}
```
Aside: I would recommend using the `--lazy` flag with parcel's `serve` command to ensure snappy rebuilds.

### index.html

Load our game's TypeScript and create a DOM container for Phaser.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8"/>
    <title>My Parcel+Phaser HMR Example</title>
    <script type="module" src="./game.ts"></script>
  </head>
  <body>
    <div id="game"></div>
  </body>
</html>
```

### game.ts

The code for a simple platformer style game in Phaser. We can move our character left and right with the arrow keys, and jump with SPACE. We have some module-level declarations. It's nice to declare constants at the module level, near the top, so they're easy to adjust later. The fact that the sprite and game instances are declared at the module level will be important momentarily.

```typescript
import * as Phaser from "phaser";
import type { Types as PhaserTypes } from "phaser";

const GRAVITY_Y = 400;

let _player: PhaserTypes.Physics.Arcade.SpriteWithDynamicBody;
let _game: Phaser.Game;

class MyScene extends Phaser.Scene {
  #cursors: PhaserTypes.Input.Keyboard.CursorKeys | undefined;
  create() {
    console.log("creating player!");
    _player = this.physics.add.sprite(50, 300, "player");
    _player.setBounce(0.1);
    _player.setCollideWorldBounds(true);
    _player.setGravityY(GRAVITY_Y);

    this.#cursors = this.input.keyboard!.createCursorKeys();
  }
  update() {
    // Control the player with left or right keys
    if (this.#cursors!.left.isDown) {
      _player!.setVelocityX(-200);
    } else if (this.#cursors!.right.isDown) {
      _player!.setVelocityX(200);
    } else {
      // If no keys are pressed, the player keeps still
      _player!.setVelocityX(0);
      // Only show the idle animation if the player is footed
      // If this is not included, the player would look idle while jumping
    }

    // Player can jump while walking any direction by pressing the space bar
    // or the 'UP' arrow
    if (
      (this.#cursors!.space.isDown || this.#cursors!.up.isDown) &&
      _player!.body.onFloor()
    ) {
      _player!.setVelocityY(-350);
    }
    if (_player!.body.velocity.x > 0) {
      _player!.setFlipX(false);
    } else if (_player!.body.velocity.x < 0) {
      // otherwise, make them face the other side
      _player!.setFlipX(true);
    }
  }
}

_game = new Phaser.Game({
  parent: "game", // element ID
  type: Phaser.AUTO, // try WebGL, fallback to Canvas
  width: 800,
  height: 640,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: MyScene,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
    },
  },
});

console.log("finished evaluating module scope");
```

Note: this code is a simplified, TypeScript version of [StackAbuse's excellent Phaser Platformer example](https://stackabuse.com/phaser-3-and-tiled-building-a-platformer/).

### HMR Opt-in

To use Parcel's HMR support, we must opt in to it using the `module.hot` API. Add the follow to `game.ts`, just below the `_game` declaration, but before the Game instance is actually created:

```typescript
interface HMRData {
  player: PhaserTypes.Physics.Arcade.SpriteWithDynamicBody;
}

if (module.hot) {
  module.hot.dispose((data: HMRData) => {
    console.log("dispose module");
    data.player = _player;
    // NOTE: it's critical to destroy the old Phaser.Game instance for HMR to work correctly.
    game.destroy(true);
  });
  module.hot.accept(() => {
    console.log("reload module");
    _player = module.hot!.data.player;
  });
}
 ```

 This order of operations ensures that the `accept` callback is called before Phaser calls the `create` method of the scene, a possible race-condition.

Aside: You may need to install the `@types/webpack-env` package if the TypeScript compiler doesn't know about `module.hot`.

Now, whenever `game.ts` has been updated, Parcel will call the `dispose` callback, which saves the current player sprite in `module.hot.data` and [destroys the current Phaser game instance](#destroying-the-game-instance). Then, Parcel does the hot module replacement itself, updating the code for `game.ts` in the browser's module cache, causing the module-level scope to be re-evaluated. Then it calls the `accept` callback, which assigns the player sprite from the previous module to the module-level declaration. Then, the module-level re-evaluation triggers another call to our scene's `create` method.

So, in order for this to work, we also need to change some in the scene's `create` method so that we handle the two possible cases: `_player` is undefined, implying HMR has not occurred yet or when it is defined, implying that is has. In either case, we must create a new player sprite because we've destroyed the old game instance and created a new one, and the new instance is not aware of our old player sprite. Finally, we copy the position from the old sprite to the new one, and overwrite the old sprite.

```typescript.diff
   create() {
-    console.log("creating player sprite!");
-    _player = this.physics.add.sprite(50, 300, "player");
-    _player.setBounce(0.1);
-    _player.setCollideWorldBounds(true);
-    _player.setGravityY(GRAVITY_Y);
+    console.log("creating player!");
+    const player = this.physics.add.sprite(50, 300, "player");
+    player.setBounce(0.1);
+    player.setCollideWorldBounds(true);
+    player.setGravityY(GRAVITY_Y);
+    if (_player) {
+      // Copy the old position
+      player.setPosition(_player.x, _player.y);
+    }
+    _player = player;
   }
```

If all goes well, we should now be able to move our player, change the `GRAVITY_Y` constant, and immediately see that our player is in the same position as before, but now experiences more or less gravity than before! Any other changes should also be immediately reflected without loosing the player's position.

# Footnotes

## Destroying the Game instance

The necessity of destroying the current game instance actually took me a while to figure out. Before I realized this, the logs in the developer console would make it seem like the HMR was working, but the player would remain frozen in place when I used the arrow keys in the game. This was probably because the old game instance was still in control of the canvas though it was disconnected from keyboard input events. It'd probably be valuable to know for certain what's actually happening here. I'll update this article as soon as I find out.

