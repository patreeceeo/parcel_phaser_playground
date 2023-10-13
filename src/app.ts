import * as Phaser from 'phaser';
import type { Types as PhaserTypes } from 'phaser';

if (module.hot) {
  module.hot.accept(() => {
  });
}

class MyScene extends Phaser.Scene {
  preload () {
  }
  create () {
  }
  update () {
  }
}

const game = new Phaser.Game({
  type: Phaser.AUTO, // try WebGL, fallback to Canvas
  parent: 'game', // element ID
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
      gravity: {x: 0, y: 0},
    },
  }
});


