import * as Phaser from "phaser";
import type { Types as PhaserTypes } from "phaser";

const GRAVITY_Y = 400;

let _game: Phaser.Game | undefined;

let _player: PhaserTypes.Physics.Arcade.SpriteWithDynamicBody;

let _reloadCount = 0;

interface HMRData {
  game: Phaser.Game;
  player: PhaserTypes.Physics.Arcade.SpriteWithDynamicBody;
  reloadCount: number;
}


if (module.hot) {
  module.hot.dispose((data: HMRData) => {
    console.log("dispose module (reload #" + _reloadCount + ")");
    data.game = _game!;
    data.player = _player;
    data.reloadCount = _reloadCount;
  });
  module.hot.accept(() => {
    _reloadCount = module.hot!.data.reloadCount
    console.log("accept module (reload #" + _reloadCount + ")");
    _reloadCount++;
    _game = module.hot!.data.game;
    _player = module.hot!.data.player;
    _player.setGravityY(GRAVITY_Y);
  });

  setTimeout(() => {
    console.log("next tick after evaluating module");
    if(!_game) {
      _game = createGame();
    }
  }, 0)
} else {
  _game = createGame();
}

function createGame() {
  return new Phaser.Game({
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
}


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


console.log("finished evaluating module scope");
