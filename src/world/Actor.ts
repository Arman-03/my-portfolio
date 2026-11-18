import Phaser from 'phaser';

/**
 * A character = an invisible physics body at the feet + a sprite and shadow that
 * follow it. Keeping visuals separate lets the sprite bob while walking without
 * the bob affecting collisions or the camera.
 */
export class Actor {
  readonly body: Phaser.GameObjects.Zone;
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly shadow: Phaser.GameObjects.Image;
  private walkTime = 0;
  moving = false;

  constructor(scene: Phaser.Scene, x: number, y: number, frame: number) {
    this.body = scene.add.zone(x, y, 10, 6);
    scene.physics.add.existing(this.body);
    this.arcade.setCollideWorldBounds(true);
    this.shadow = scene.add.image(x, y + 2, 'shadow').setDepth(9);
    this.sprite = scene.add.sprite(x, y - 5, 'dungeon', frame);
  }

  get arcade() {
    return this.body.body as Phaser.Physics.Arcade.Body;
  }
  get x() {
    return this.body.x;
  }
  get y() {
    return this.body.y;
  }

  setPosition(x: number, y: number) {
    this.arcade.reset(x, y);
    this.sync(0);
  }

  face(dx: number) {
    if (dx < -0.1) this.sprite.setFlipX(true);
    else if (dx > 0.1) this.sprite.setFlipX(false);
  }

  /** Call every frame after physics. */
  sync(delta: number) {
    const v = this.arcade.velocity;
    this.moving = Math.abs(v.x) + Math.abs(v.y) > 1;
    let bob = 0;
    if (this.moving) {
      this.walkTime += delta;
      // whole-pixel hop keeps the pixel art crisp
      bob = Math.floor(this.walkTime / 130) % 2 === 0 ? -1 : 0;
      this.face(v.x);
    } else {
      this.walkTime = 0;
    }
    this.sprite.setPosition(this.body.x, this.body.y - 5 + bob);
    this.sprite.setDepth(10 + this.body.y / 10000);
    this.shadow.setPosition(this.body.x, this.body.y + 2);
  }

  setVisible(v: boolean) {
    this.sprite.setVisible(v);
    this.shadow.setVisible(v);
  }

  destroy() {
    this.sprite.destroy();
    this.shadow.destroy();
    this.body.destroy();
  }
}
