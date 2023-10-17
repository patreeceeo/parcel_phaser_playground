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

let _reloadCount = 0;

interface HMRData {
  player: PhaserTypes.Physics.Arcade.SpriteWithDynamicBody;
  reloadCount: number;
}

if (module.hot) {
  module.hot.dispose((data: HMRData) => {
    console.log("dispose module (reload #" + _reloadCount + ")");
    data.player = _player;
    data.reloadCount = _reloadCount;
    // NOTE: it's critical to destroy the old Phaser.Game instance for HMR to work correctly.
    game.destroy(true);
  });
  module.hot.accept(() => {
    console.log("reload module (reload #" + _reloadCount + ")");
    _player = module.hot.data.player;
    _reloadCount = module.hot.data.reloadCount + 1;
  });
}
console.log("finished evaluating module scope");
