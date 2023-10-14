import * as Phaser from 'phaser';
import type { Types as PhaserTypes } from 'phaser';

if (module.hot) {
  module.hot.accept(() => {
  });
}

class MyScene extends Phaser.Scene {
  #player: PhaserTypes.Physics.Arcade.SpriteWithDynamicBody | undefined;
  #cursors: PhaserTypes.Input.Keyboard.CursorKeys | undefined;
  preload () {
    this.load.image('background', 'assets/images/background.png');
    this.load.image('spike', 'assets/images/spike.png');
    // Atlas image must be loaded with its JSON
    this.load.atlas('player', 'assets/images/kenney_player.png','assets/images/kenney_player_atlas.json');
    this.load.image('tiles', 'assets/tilesets/platformPack_tilesheet.png');
    // Load the export Tiled JSON
    this.load.tilemapTiledJSON('map', 'assets/tilemaps/example.json');
  }
  create () {
    // TODO(fps): Try using a transparent canvas and use CSS to set the background image behind the canvas
    const backgroundImage = this.add.image(0, 0,'background').setOrigin(0, 0);
    backgroundImage.setScale(2, 0.8);

    const map = this.make.tilemap({ key: 'map' });
    const tileset = map.addTilesetImage('kenny_simple_platformer', 'tiles')!;
    const platforms = map.createLayer('Platforms', tileset, 0, 200)!;
    platforms.setCollisionByExclusion([-1], true);

    this.#player = this.physics.add.sprite(50, 300, 'player');
    this.#player.setBounce(0.1);
    this.#player.setCollideWorldBounds(true);
    this.physics.add.collider(this.#player, platforms);

    this.anims.create({
      key: 'idle',
      frames: [{ key: 'player', frame: 'robo_player_0' }],
      frameRate: 10,
    })

    this.anims.create({
      key: 'walk',
      frames: this.anims.generateFrameNames('player', {
        prefix: 'robo_player_',
        start: 2,
        end: 3,
      }),
      frameRate: 10,
      repeat: -1
    });

    this.anims.create({
      key: 'jump',
      frames: [{ key: 'player', frame: 'robo_player_1' }],
      frameRate: 10,
    });

    this.#cursors = this.input.keyboard!.createCursorKeys();
  }
  update () {
    // Control the player with left or right keys
    if (this.#cursors!.left.isDown) {
      this.#player!.setVelocityX(-200);
      if (this.#player!.body.onFloor()) {
        this.#player!.play('walk', true);
      }
    } else if (this.#cursors!.right.isDown) {
      this.#player!.setVelocityX(200);
      if (this.#player!.body.onFloor()) {
        this.#player!.play('walk', true);
      }
    } else {
      // If no keys are pressed, the player keeps still
      this.#player!.setVelocityX(0);
      // Only show the idle animation if the player is footed
      // If this is not included, the player would look idle while jumping
      if (this.#player!.body.onFloor()) {
        this.#player!.play('idle', true);
      }
    }

    // Player can jump while walking any direction by pressing the space bar
    // or the 'UP' arrow
    if ((this.#cursors!.space.isDown || this.#cursors!.up.isDown) && this.#player!.body.onFloor()) {
      this.#player!.setVelocityY(-350);
      this.#player!.play('jump', true);
    }
  }
}

const game = new Phaser.Game({
  parent: 'game', // element ID
  type: Phaser.AUTO, // try WebGL, fallback to Canvas
  width: 800,
  height: 640,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: MyScene,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: {x: 0, y: 200},
    },
  }
});

// function setGravity(vec: PhaserTypes.Math.Vector2Like) {
//   for(const scene of game.scene.getScenes()) {
//     // TODO put game objects in a global queryable data sctructure
//   }
// }
