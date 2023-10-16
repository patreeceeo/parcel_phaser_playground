import * as Phaser from "phaser";
import type { Types as PhaserTypes } from "phaser";

const GRAVITY_Y = 400;

let _player: PhaserTypes.Physics.Arcade.SpriteWithDynamicBody;

class MyScene extends Phaser.Scene {
  #spikes: Phaser.Physics.Arcade.Group | undefined;
  #cursors: PhaserTypes.Input.Keyboard.CursorKeys | undefined;
  preload() {
    this.load.image(
      "player",
      "assets/images/kenney_player.png",
    );
  }
  create() {
    console.log("creating player!");
    const player = this.physics.add.sprite(50, 300, "player");
    player.setBounce(0.1);
    player.setCollideWorldBounds(true);
    player.setGravityY(GRAVITY_Y);
    if (_player) {
      // Copy the old position
      player.setPosition(_player.x, _player.y);
    }
    _player = player;

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
    _player = module.hot!.data.player;
    _reloadCount = module.hot!.data.reloadCount + 1;
  });
}
console.log("finished evaluating module scope");
