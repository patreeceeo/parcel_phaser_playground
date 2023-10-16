# Hot Module Replacement (HMR)

## The How and Why with Parcel and Phaser

Testing changes to a game's code can be a laborious process. Part of that work is often manually getting the game back into the state required for testing the changes after making each tweak, because in order to test the change, it's necessary to reload the game, which resets its state. For example, if we're developing a platformer game and we want to test whether the player can jump up to a certain platform, we'd have to change the code, restart the game, then play through until we get back to the point with the platform in question. This could be a rather slow feedback loop, making the developer's task much more difficult than it needs to be.

Enter [Hot Module Replacement](https://parcel2-docs.vercel.app/features/hmr/), an advanced technique which allows a developer to reload specific bits of the game's code without loosing its state. To get this working in an app being built with Parcel is straightforward, as Parcel has explicit out-of-the-box support for HMR.

Let's suppose we have the following code.

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
<aside>Aside: I would recommend using the `--lazy` flag with parcel's `serve` command to ensure snappy rebuilds.</aside>

### index.html

Load our game's TypeScript and create a DOM container for Phaser.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8"/>
    <title>My Parcel+Phaser HMR Example</title>
    <script type="module" src="./app.ts"></script>
  </head>
  <body>
    <div id="game"></div>
  </body>
</html>
```

### app.ts

NTS: Maybe this should be called game.ts?

The code for a simple platformer style game in Phaser. Note: this code is based on [StackAbuse's excellent Phaser Platformer example](https://stackabuse.com/phaser-3-and-tiled-building-a-platformer/).

```typescript
import * as Phaser from "phaser";
import type { Types as PhaserTypes } from "phaser";

const GRAVITY_Y = 400;

let _player: PhaserTypes.Physics.Arcade.SpriteWithDynamicBody;

class MyScene extends Phaser.Scene {
  #spikes: Phaser.Physics.Arcade.Group | undefined;
  #cursors: PhaserTypes.Input.Keyboard.CursorKeys | undefined;
  preload() {
    this.load.image("background", "assets/images/background.png");
    this.load.image("spike", "assets/images/spike.png");
    // Atlas image must be loaded with its JSON
    this.load.atlas(
      "player",
      "assets/images/kenney_player.png",
      "assets/images/kenney_player_atlas.json"
    );
    this.load.image("tiles", "assets/tilesets/platformPack_tilesheet.png");
    // Load the export Tiled JSON
    this.load.tilemapTiledJSON("map", "assets/tilemaps/example.json");
  }
  create() {
    // TODO(fps): Try using a transparent canvas and use CSS to set the background image behind the canvas
    const backgroundImage = this.add.image(0, 0, "background").setOrigin(0, 0);
    backgroundImage.setScale(2, 0.8);

    const map = this.make.tilemap({ key: "map" });
    const tileset = map.addTilesetImage("kenny_simple_platformer", "tiles")!;
    const platforms = map.createLayer("Platforms", tileset, 0, 200)!;
    platforms.setCollisionByExclusion([-1], true);

    console.log("creating player!");
    const player = this.physics.add.sprite(50, 300, "player");
    player.setBounce(0.1);
    player.setCollideWorldBounds(true);
    player.setGravityY(GRAVITY_Y);
    this.physics.add.collider(player, platforms);
    if (_player) {
      // Copy the old position
      player.setPosition(_player.x, _player.y);
    }
    _player = player;

    this.anims.create({
      key: "idle",
      frames: [{ key: "player", frame: "robo_player_0" }],
      frameRate: 10,
    });

    this.anims.create({
      key: "walk",
      frames: this.anims.generateFrameNames("player", {
        prefix: "robo_player_",
        start: 2,
        end: 3,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "jump",
      frames: [{ key: "player", frame: "robo_player_1" }],
      frameRate: 10,
    });

    this.#cursors = this.input.keyboard!.createCursorKeys();

    // Create a sprite group for all spikes, set common properties to ensure that
    // sprites in the group don't move via gravity or by player collisions
    this.#spikes = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    }) as any; // Phaser doesn't export the type we need here.

    // Let's get the spike objects, these are NOT sprites
    // We'll create spikes in our sprite group for each object in our map
    map.getObjectLayer("Spikes")!.objects.forEach((spike) => {
      // Add new spikes to our sprite group
      const spikeSprite = this.#spikes!.create(
        spike.x,
        spike!.y! + 200 - spike!.height!,
        "spike"
      ).setOrigin(0);
      spikeSprite.body
        .setSize(spike.width, spike.height! - 20)
        .setOffset(0, 20);
    });

    this.physics.add.collider(
      player,
      this.#spikes!,
      () => {
        player!.setVelocity(0, 0);
        player!.setX(50);
        player!.setY(300);
        player!.play("idle", true);
        player!.setAlpha(0);
        let tw = this.tweens.add({
          targets: player,
          alpha: 1,
          duration: 100,
          ease: "Linear",
          repeat: 5,
        });
      },

      undefined,
      this
    );
  }
  update() {
    // Control the player with left or right keys
    if (this.#cursors!.left.isDown) {
      _player!.setVelocityX(-200);
      if (_player!.body.onFloor()) {
        _player!.play("walk", true);
      }
    } else if (this.#cursors!.right.isDown) {
      _player!.setVelocityX(200);
      if (_player!.body.onFloor()) {
        _player!.play("walk", true);
      }
    } else {
      // If no keys are pressed, the player keeps still
      _player!.setVelocityX(0);
      // Only show the idle animation if the player is footed
      // If this is not included, the player would look idle while jumping
      if (_player!.body.onFloor()) {
        _player!.play("idle", true);
      }
    }

    // Player can jump while walking any direction by pressing the space bar
    // or the 'UP' arrow
    if (
      (this.#cursors!.space.isDown || this.#cursors!.up.isDown) &&
      _player!.body.onFloor()
    ) {
      _player!.setVelocityY(-350);
      _player!.play("jump", true);
    }
    if (_player!.body.velocity.x > 0) {
      _player!.setFlipX(false);
    } else if (_player!.body.velocity.x < 0) {
      // otherwise, make them face the other side
      _player!.setFlipX(true);
    }
  }
}

const game = new Phaser.Game({
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
