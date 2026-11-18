import Phaser from 'phaser';
import { lines, locations, type LocationId } from '../content.ts';
import { state, prefersReducedMotion } from '../state.ts';
import { sfx } from '../audio.ts';
import type { UI } from '../ui/ui.ts';
import { Actor } from '../world/Actor.ts';
import { findPath } from '../world/pathfind.ts';
import { C, CUSTOM, D, DUNGEON, TILE } from '../world/tiles.ts';
import type { Interactable, NpcSpawn, WorldData } from '../world/worldMap.ts';

type Area = 'world' | 'dungeon';

interface Npc {
  spawn: NpcSpawn;
  actor: Actor;
  home: { x: number; y: number };
  nextThink: number;
  talking: boolean;
  bubble?: Phaser.GameObjects.Image;
}

type Target = { kind: 'interactable'; it: Interactable } | { kind: 'npc'; npc: Npc };

const WALK = 70;
const RUN = 115;
const REACH = 13;
const NPC_REACH = 20;

export class WorldScene extends Phaser.Scene {
  private world: WorldData;
  private ui: UI;
  private player!: Actor;
  private npcs: Npc[] = [];
  private area: Area = 'world';
  private collision!: Phaser.Tilemaps.TilemapLayer;
  private groundLayer!: Phaser.Tilemaps.TilemapLayer;
  private objectLayer!: Phaser.Tilemaps.TilemapLayer;
  private keys!: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd' | 'shift', Phaser.Input.Keyboard.Key>;
  private path: { x: number; y: number }[] = [];
  private pathGoal: Target | null = null;
  private focused: Target | null = null;
  private bumpLock: string | null = null;
  private busyLastFrame = false;
  private inputCooldownUntil = 0;
  private transitioning = false;
  private playing = false;
  private zoneId = '';
  private stepTimer = 0;
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
  private attractTween?: Phaser.Tweens.Tween;
  private clouds: Phaser.GameObjects.Image[] = [];
  private fireflies: Phaser.GameObjects.Image[] = [];
  private onReady: () => void;

  constructor(world: WorldData, ui: UI, onReady: () => void) {
    super('world');
    this.world = world;
    this.ui = ui;
    this.onReady = onReady;
  }

  preload() {
    const sheet = { frameWidth: TILE, frameHeight: TILE };
    this.load.spritesheet('town', 'assets/town.png', sheet);
    this.load.spritesheet('dungeon', 'assets/dungeon.png', sheet);
    this.load.spritesheet('custom', 'assets/custom.png', sheet);
  }

  create() {
    this.makeTextures();
    this.buildTilemap();

    const s = this.world.spawn;
    this.player = new Actor(this, (s.tx + 0.5) * TILE, (s.ty + 0.5) * TILE, state.character >= 0 ? state.character : DUNGEON.adventurer);
    this.player.setVisible(false);
    this.physics.add.collider(this.player.body, this.collision);

    for (const spawn of this.world.npcs) this.addNpc(spawn);

    this.dust = this.add.particles(0, 0, 'dust', {
      lifespan: 380,
      speed: { min: 4, max: 14 },
      angle: { min: 200, max: 340 },
      alpha: { start: 0.7, end: 0 },
      scale: { start: 1, end: 0.4 },
      emitting: false,
    });
    this.dust.setDepth(9.5);

    this.setupCamera();
    this.setupInput();
    this.setupAmbient();
    this.startAttractMode();

    this.ui.attach({
      fastTravel: (id) => this.fastTravel(id),
      interact: () => this.interactFocused(),
      playerTile: () => ({ tx: Math.floor(this.player.x / TILE), ty: Math.floor(this.player.y / TILE), area: this.area }),
      shake: () => {
        if (!prefersReducedMotion()) this.cameras.main.shake(500, 0.012);
      },
    });
    this.ui.onStart((frame) => this.begin(frame));
    this.onReady();
  }

  // ------------------------------------------------------------------ setup

  private makeTextures() {
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.28).fillEllipse(5, 2, 10, 4);
    g.generateTexture('shadow', 10, 4);
    g.clear().fillStyle(0xf3e3c5, 1).fillRect(0, 0, 2, 2);
    g.generateTexture('dust', 2, 2);
    g.clear().fillStyle(0xfff3a0, 1).fillRect(0, 0, 2, 2);
    g.generateTexture('firefly', 2, 2);
    // speech bubble "…" (pixel art)
    g.clear();
    g.fillStyle(0x3f2631, 1).fillRect(0, 0, 11, 8).fillRect(3, 8, 3, 2);
    g.fillStyle(0xffffff, 1).fillRect(1, 1, 9, 6).fillRect(4, 7, 1, 2);
    g.fillStyle(0x3f2631, 1).fillRect(3, 4, 1, 1).fillRect(5, 4, 1, 1).fillRect(7, 4, 1, 1);
    g.generateTexture('bubble', 11, 10);
    // soft cloud shadow
    g.clear();
    g.fillStyle(0x000000, 1);
    [[40, 30, 28], [70, 26, 32], [100, 34, 26], [60, 44, 26], [88, 46, 22]].forEach(([x, y, r]) => g.fillCircle(x, y, r));
    g.generateTexture('cloud', 140, 76);
    g.destroy();
  }

  private buildTilemap() {
    const { width, height } = this.world;
    const map = this.make.tilemap({ width, height, tileWidth: TILE, tileHeight: TILE });
    const tilesets = [
      map.addTilesetImage('town', 'town', TILE, TILE, 0, 0, 1)!,
      map.addTilesetImage('dungeon', 'dungeon', TILE, TILE, 0, 0, 133)!,
      map.addTilesetImage('custom', 'custom', TILE, TILE, 0, 0, 265)!,
    ];
    const make = (name: string, data: number[][], depth: number) => {
      const layer = map.createBlankLayer(name, tilesets, 0, 0, width, height)!;
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) if (data[y][x] >= 0) layer.putTileAt(data[y][x], x, y);
      return layer.setDepth(depth);
    };
    this.groundLayer = make('ground', this.world.ground, 0);
    make('decor', this.world.decor, 1);
    this.objectLayer = make('objects', this.world.objects, 2);
    make('above', this.world.above, 1000);
    this.collision = make('collision', this.world.solid.map((row) => row.map((s) => (s ? 1 : -1))), 0).setVisible(false);
    this.collision.setCollision(1);
    this.physics.world.setBounds(0, 0, width * TILE, height * TILE);

    // Animated water + flags.
    let frame = 0;
    this.time.addEvent({
      delay: 650,
      loop: true,
      callback: () => {
        frame ^= 1;
        const base = frame ? CUSTOM.waterB : CUSTOM.waterA;
        for (const c of this.world.waterCells) this.groundLayer.putTileAt(C(base + c.local), c.x, c.y);
        for (const f of this.world.flagCells) this.objectLayer.putTileAt(C(frame ? CUSTOM.flagB : CUSTOM.flagA), f.x, f.y);
      },
    });
  }

  private addNpc(spawn: NpcSpawn) {
    const x = (spawn.tx + 0.5) * TILE, y = (spawn.ty + 0.5) * TILE;
    const actor = new Actor(this, x, y, spawn.frame);
    actor.arcade.setImmovable(true);
    actor.arcade.pushable = false;
    this.physics.add.collider(actor.body, this.collision);
    this.physics.add.collider(this.player.body, actor.body);
    const npc: Npc = { spawn, actor, home: { x, y }, nextThink: 0, talking: false };
    if (spawn.key === 'akthar') {
      npc.bubble = this.add.image(x, y - 16, 'bubble').setDepth(999);
      this.tweens.add({ targets: npc.bubble, y: y - 18, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.npcs.push(npc);
  }

  private setupCamera() {
    const cam = this.cameras.main;
    cam.setRoundPixels(true);
    this.applyAreaCamera('world');
    const fit = () => {
      const { width, height } = this.scale;
      // ~22 tiles across on desktop, never fewer than ~11 on phones, integer zoom for crisp pixels
      const ideal = Math.min(width / (22 * TILE), height / (13 * TILE));
      const minForMap = Math.max(width / (this.world.areas.world.w * TILE), height / (this.world.areas.world.h * TILE));
      cam.setZoom(Math.max(2, Math.ceil(minForMap), Math.round(ideal)));
    };
    fit();
    this.scale.on(Phaser.Scale.Events.RESIZE, () => {
      fit();
      if (this.playing) this.applyAreaCamera(this.area);
    });
  }

  private applyAreaCamera(area: Area) {
    const cam = this.cameras.main;
    cam.setBackgroundColor(area === 'world' ? '#3d8a49' : '#472d3c');
    if (area === 'world') {
      const r = this.world.areas.world;
      cam.setBounds(r.x * TILE, r.y * TILE, r.w * TILE, r.h * TILE);
      if (this.playing) cam.startFollow(this.player.body, true, 0.15, 0.15);
      return;
    }
    // The dungeon is one small room: if it fits on screen, frame it; otherwise follow within it.
    const room = this.world.zones.find((z) => z.id === 'secret')!.rect;
    const pad = TILE;
    const rx = room.x * TILE - pad, ry = room.y * TILE - pad, rw = room.w * TILE + pad * 2, rh = room.h * TILE + pad * 2;
    const fits = cam.width / cam.zoom >= rw && cam.height / cam.zoom >= rh;
    if (fits) {
      cam.stopFollow();
      cam.removeBounds();
      cam.centerOn(rx + rw / 2, ry + rh / 2);
    } else {
      cam.setBounds(rx, ry, rw, rh);
      cam.startFollow(this.player.body, true, 0.15, 0.15);
    }
  }

  private setupInput() {
    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = kb.addKeys({
      up: K.UP, down: K.DOWN, left: K.LEFT, right: K.RIGHT,
      w: K.W, a: K.A, s: K.S, d: K.D, shift: K.SHIFT,
    }) as typeof this.keys;
    kb.addCapture([K.E, K.SPACE, K.ENTER]);

    // React to the key-down event itself rather than polling JustDown: a quick tap whose
    // down+up land in the same frame would otherwise be missed.
    const onInteractKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typingOrButton = t && t !== document.body && /^(INPUT|TEXTAREA|BUTTON|A|SELECT)$/.test(t.tagName);
      if (e.repeat || typingOrButton) return;
      if (!this.playing || this.ui.busy || this.transitioning || this.busyLastFrame) return;
      if (this.time.now < this.inputCooldownUntil) return;
      this.interactFocused();
    };
    kb.on('keydown-E', onInteractKey);
    kb.on('keydown-SPACE', onInteractKey);
    kb.on('keydown-ENTER', onInteractKey);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.playing || this.ui.busy || this.transitioning) return;
      const target = this.targetAt(p.worldX, p.worldY);
      const tx = Math.floor(p.worldX / TILE), ty = Math.floor(p.worldY / TILE);
      if (target) {
        if (this.inReach(target)) {
          this.path = [];
          this.pathGoal = null;
          return this.trigger(target);
        }
        const goal = this.approachTileFor(target);
        if (goal) this.walkTo(goal, target);
      } else if (!this.world.solid[ty]?.[tx]) {
        this.walkTo({ x: tx, y: ty }, null);
        this.flashMarker(tx, ty);
      }
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.playing) return;
      this.input.setDefaultCursor(this.targetAt(p.worldX, p.worldY) ? 'pointer' : 'default');
    });
  }

  private setupAmbient() {
    if (prefersReducedMotion()) return;
    const W = this.world.areas.world.w * TILE, H = this.world.areas.world.h * TILE;
    for (let i = 0; i < 5; i++) {
      const c = this.add.image(Math.random() * W, Math.random() * H, 'cloud').setAlpha(0.06).setDepth(1100).setScale(1.6 + Math.random());
      this.clouds.push(c);
    }
    if (this.ui.isNight) {
      for (let i = 0; i < 28; i++) {
        const f = this.add.image(0, 0, 'firefly').setDepth(1050).setBlendMode(Phaser.BlendModes.ADD);
        this.fireflies.push(f);
        this.respawnFirefly(f, true);
      }
    }
  }

  private respawnFirefly(f: Phaser.GameObjects.Image, anywhere = false) {
    const cam = this.cameras.main.worldView;
    const W = this.world.areas.world.w * TILE;
    const x = anywhere ? Math.random() * W : cam.x + Math.random() * cam.width;
    const y = anywhere ? Math.random() * this.world.areas.world.h * TILE : cam.y + Math.random() * cam.height;
    f.setPosition(x, y).setAlpha(0);
    this.tweens.add({
      targets: f,
      x: x + (Math.random() - 0.5) * 60,
      y: y + (Math.random() - 0.5) * 40,
      alpha: { from: 0, to: 0.9 },
      duration: 1600 + Math.random() * 1800,
      yoyo: true,
      ease: 'Sine.easeInOut',
      onComplete: () => this.respawnFirefly(f),
    });
  }

  private startAttractMode() {
    const cam = this.cameras.main;
    cam.centerOn(16 * TILE, 12 * TILE);
    if (prefersReducedMotion()) return;
    const pan = { x: 16 * TILE, y: 12 * TILE };
    this.attractTween = this.tweens.add({
      targets: pan,
      x: 46 * TILE,
      y: 32 * TILE,
      duration: 26000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: () => cam.centerOn(pan.x, pan.y),
    });
  }

  private begin(frame: number) {
    this.attractTween?.stop();
    this.player.sprite.setFrame(frame);
    this.player.setVisible(true);
    const cam = this.cameras.main;
    const firstVisit = state.discovered.size === 0;
    const startFollow = () => {
      cam.startFollow(this.player.body, true, 0.15, 0.15);
      this.playing = true;
      this.updateZone(true);
      if (firstVisit) {
        const akthar = this.npcs.find((n) => n.spawn.key === 'akthar');
        if (akthar) this.time.delayedCall(350, () => this.trigger({ kind: 'npc', npc: akthar }));
      }
    };
    if (prefersReducedMotion()) return startFollow();
    cam.pan(this.player.x, this.player.y, 900, 'Sine.easeInOut', true, (_c: unknown, progress: number) => {
      if (progress === 1) startFollow();
    });
    this.player.sprite.setAlpha(0);
    this.tweens.add({ targets: this.player.sprite, alpha: 1, duration: 500, delay: 600 });
  }

  // ------------------------------------------------------------------ loop

  update(_time: number, delta: number) {
    for (const c of this.clouds) {
      c.x += delta * 0.006;
      c.y += delta * 0.002;
      if (c.x > this.world.areas.world.w * TILE + 150) c.x = -150;
      if (c.y > this.world.areas.world.h * TILE + 80) c.y = -80;
    }
    this.updateNpcs(delta);
    if (!this.playing) return;

    const busy = this.ui.busy || this.transitioning;
    const kb = this.input.keyboard!;
    if (busy) {
      if (!this.busyLastFrame) kb.disableGlobalCapture();
      this.busyLastFrame = true;
      this.player.arcade.setVelocity(0, 0);
      this.player.sync(delta);
      this.ui.hidePrompt();
      return;
    }
    if (this.busyLastFrame) {
      // swallow the key press that closed the UI so it doesn't re-trigger an interaction
      this.busyLastFrame = false;
      kb.enableGlobalCapture();
      kb.resetKeys();
      this.inputCooldownUntil = this.time.now + 180;
    }

    this.movePlayer(delta);
    this.updateFocus();
    this.checkBump();
    this.updateZone();

  }

  private movePlayer(delta: number) {
    const k = this.keys;
    let vx = 0, vy = 0;
    if (k.left.isDown || k.a.isDown) vx -= 1;
    if (k.right.isDown || k.d.isDown) vx += 1;
    if (k.up.isDown || k.w.isDown) vy -= 1;
    if (k.down.isDown || k.s.isDown) vy += 1;
    const t = this.ui.touchVector;
    if (!vx && !vy && (t.x || t.y)) {
      vx = t.x;
      vy = t.y;
    }
    const manual = vx !== 0 || vy !== 0;
    if (manual) {
      this.path = [];
      this.pathGoal = null;
    }
    let speed = k.shift.isDown ? RUN : WALK;

    if (!manual && this.path.length) {
      const next = this.path[0];
      const nx = (next.x + 0.5) * TILE, ny = (next.y + 0.5) * TILE;
      const dx = nx - this.player.x, dy = ny - this.player.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 2) {
        this.path.shift();
        if (!this.path.length) {
          this.player.arcade.reset(nx, ny);
          const goal = this.pathGoal;
          this.pathGoal = null;
          if (goal && this.inReach(goal)) this.trigger(goal);
        }
      } else {
        vx = dx / dist;
        vy = dy / dist;
        speed = RUN * 0.9;
      }
    }

    const len = Math.hypot(vx, vy);
    if (len > 1) {
      vx /= len;
      vy /= len;
    }
    this.player.arcade.setVelocity(vx * speed, vy * speed);
    this.player.sync(delta);

    if (this.player.moving) {
      this.stepTimer -= delta;
      if (this.stepTimer <= 0) {
        this.stepTimer = speed > WALK ? 200 : 280;
        this.dust.emitParticleAt(this.player.x, this.player.y + 2, 1);
        sfx('step');
      }
    }
    if (this.area === 'world') {
      // dock end of the lake counts as discovering it
      const tx = Math.floor(this.player.x / TILE), ty = Math.floor(this.player.y / TILE);
      if (tx === 20 && ty === 11) state.discover('lake');
    }
  }

  private updateNpcs(delta: number) {
    const now = this.time.now;
    for (const n of this.npcs) {
      const a = n.actor;
      if (n.talking || n.spawn.wander === 0 || !this.playing) {
        a.arcade.setVelocity(0, 0);
      } else if (now > n.nextThink) {
        const r = n.spawn.wander * TILE;
        const away = Math.hypot(a.x - n.home.x, a.y - n.home.y) > r;
        if (away) {
          const ang = Math.atan2(n.home.y - a.y, n.home.x - a.x);
          a.arcade.setVelocity(Math.cos(ang) * 28, Math.sin(ang) * 28);
        } else if (Math.random() < 0.55) {
          const ang = Math.floor(Math.random() * 8) * (Math.PI / 4);
          const sp = n.spawn.squashable ? 34 : 24;
          a.arcade.setVelocity(Math.cos(ang) * sp, Math.sin(ang) * sp);
        } else {
          a.arcade.setVelocity(0, 0);
        }
        n.nextThink = now + 600 + Math.random() * 1800;
      }
      a.sync(delta);
      if (n.bubble) n.bubble.setX(a.x);
    }
  }

  // ------------------------------------------------------------------ interaction

  private interactablesHere() {
    const r = this.world.areas[this.area];
    return this.world.interactables.filter((it) => it.tx >= r.x && it.tx < r.x + r.w);
  }
  private npcsHere() {
    return this.npcs.filter((n) => n.spawn.area === this.area && n.actor.sprite.active);
  }

  private distToRect(px: number, py: number, it: Interactable) {
    const x0 = it.tx * TILE, y0 = it.ty * TILE, x1 = x0 + it.w * TILE, y1 = y0 + it.h * TILE;
    const dx = Math.max(x0 - px, 0, px - x1), dy = Math.max(y0 - py, 0, py - y1);
    return Math.hypot(dx, dy);
  }

  private inReach(t: Target) {
    if (t.kind === 'npc') return Math.hypot(t.npc.actor.x - this.player.x, t.npc.actor.y - this.player.y) <= NPC_REACH;
    return this.distToRect(this.player.x, this.player.y - 3, t.it) <= REACH;
  }

  private updateFocus() {
    let best: Target | null = null;
    let bestD = Infinity;
    for (const it of this.interactablesHere()) {
      const d = this.distToRect(this.player.x, this.player.y - 3, it);
      if (d <= REACH && d < bestD) {
        best = { kind: 'interactable', it };
        bestD = d;
      }
    }
    for (const npc of this.npcsHere()) {
      const d = Math.hypot(npc.actor.x - this.player.x, npc.actor.y - this.player.y) - 6;
      if (d <= NPC_REACH - 6 && d < bestD) {
        best = { kind: 'npc', npc };
        bestD = d;
      }
    }
    this.focused = best;
    if (!best) return this.ui.hidePrompt();
    const cam = this.cameras.main;
    let wx: number, wy: number, label: string;
    if (best.kind === 'npc') {
      wx = best.npc.actor.x;
      wy = best.npc.actor.y - 15;
      label = best.npc.spawn.squashable ? 'Squash bug' : `Talk to ${best.npc.spawn.name}`;
    } else {
      wx = (best.it.tx + best.it.w / 2) * TILE;
      wy = best.it.ty * TILE - 1;
      label = best.it.label;
    }
    this.ui.showPrompt(label, (wx - cam.worldView.x) * cam.zoom, (wy - cam.worldView.y) * cam.zoom);
  }

  private interactFocused() {
    if (this.focused && !this.ui.busy && !this.transitioning) this.trigger(this.focused);
  }

  /** Walking into a door/portal opens it, like in classic RPGs. */
  private checkBump() {
    const b = this.player.arcade;
    const probes: { blocked: boolean; x: number; y: number; dir: 'below' | 'above' }[] = [
      { blocked: b.blocked.up, x: this.player.x, y: this.player.y - 6, dir: 'below' },
      { blocked: b.blocked.down, x: this.player.x, y: this.player.y + 6, dir: 'above' },
    ];
    let hit: Interactable | null = null;
    for (const p of probes) {
      if (!p.blocked) continue;
      const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
      hit =
        this.interactablesHere().find(
          (it) => it.bump && (it.approach ?? 'below') === p.dir && tx >= it.tx && tx < it.tx + it.w && ty >= it.ty && ty < it.ty + it.h,
        ) ?? null;
      if (hit) break;
    }
    if (!hit) {
      this.bumpLock = null;
      return;
    }
    if (this.bumpLock === hit.key) return;
    this.bumpLock = hit.key;
    this.trigger({ kind: 'interactable', it: hit });
  }

  private async trigger(t: Target) {
    this.path = [];
    this.pathGoal = null;
    this.player.arcade.setVelocity(0, 0);
    if (t.kind === 'npc') return this.talkTo(t.npc);
    const it = t.it;
    const k = it.kind;
    switch (k.type) {
      case 'location':
        this.ui.openSection(k.id);
        break;
      case 'exhibit':
        this.ui.openProject(k.projectId);
        break;
      case 'terminal':
        this.ui.openTerminal();
        break;
      case 'dialog':
        await this.ui.dialogKey(k.lines);
        if (k.discover) state.discover(k.discover);
        break;
      case 'rootChest': {
        sfx('open');
        this.objectLayer.putTileAt(D(DUNGEON.chestOpen), it.tx, it.ty);
        const choice = await this.ui.dialog([...lines.rootChest, 'There’s a big red button labelled “sudo rm -rf /”. Press it?'], {
          choices: ['Press it 😈', 'Better not'],
        });
        if (choice === 0) await this.ui.panic();
        else await this.ui.dialog(['Wise choice. A true senior engineer.']);
        break;
      }
      case 'portal':
        this.goTo(k.to);
        break;
    }
  }

  private async talkTo(npc: Npc) {
    npc.talking = true;
    npc.actor.arcade.setVelocity(0, 0);
    npc.actor.face(this.player.x - npc.actor.x);
    this.player.face(npc.actor.x - this.player.x);
    if (npc.spawn.squashable) {
      sfx('squash');
      npc.actor.sprite.setScale(1.3, 0.5);
      this.dust.explode(10, npc.actor.x, npc.actor.y);
      this.time.delayedCall(140, () => npc.actor.destroy());
      this.npcs = this.npcs.filter((n) => n !== npc);
      state.addSquash();
      const left = this.npcs.filter((n) => n.spawn.squashable).length;
      await this.ui.dialog(
        left ? [...lines.bug, `${left} bug${left > 1 ? 's' : ''} left in this directory.`] : [...lines.bug, '✨ All bugs squashed. Ship it! (for now…)'],
      );
      return;
    }
    let text = lines[npc.spawn.lines];
    if (npc.spawn.key === 'akthar') {
      npc.bubble?.destroy();
      npc.bubble = undefined;
      if (state.discovered.size === Object.keys(locations).length) text = lines.aktharAfterAll;
    }
    await this.ui.dialog(text, { speaker: npc.spawn.name });
    npc.talking = false;
  }

  // ------------------------------------------------------------------ click-to-move

  private targetAt(wx: number, wy: number): Target | null {
    for (const npc of this.npcsHere()) {
      const s = npc.actor.sprite;
      if (Math.abs(wx - s.x) <= 8 && Math.abs(wy - s.y) <= 8) return { kind: 'npc', npc };
    }
    const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
    const it = this.interactablesHere().find((i) => tx >= i.tx && tx < i.tx + i.w && ty >= i.ty && ty < i.ty + i.h);
    return it ? { kind: 'interactable', it } : null;
  }

  private approachTileFor(t: Target): { x: number; y: number } | null {
    const px = Math.floor(this.player.x / TILE), py = Math.floor(this.player.y / TILE);
    const free = (x: number, y: number) => !this.world.solid[y]?.[x];
    let candidates: { x: number; y: number }[];
    if (t.kind === 'npc') {
      const nx = Math.floor(t.npc.actor.x / TILE), ny = Math.floor(t.npc.actor.y / TILE);
      candidates = [{ x: nx, y: ny + 1 }, { x: nx - 1, y: ny }, { x: nx + 1, y: ny }, { x: nx, y: ny - 1 }];
    } else {
      const it = t.it;
      if (it.bump) candidates = [{ x: it.tx, y: it.approach === 'above' ? it.ty - 1 : it.ty + it.h }];
      else {
        candidates = [];
        for (let x = it.tx; x < it.tx + it.w; x++) candidates.push({ x, y: it.ty + it.h }, { x, y: it.ty - 1 });
        for (let y = it.ty; y < it.ty + it.h; y++) candidates.push({ x: it.tx - 1, y }, { x: it.tx + it.w, y });
      }
    }
    return (
      candidates
        .filter((c) => free(c.x, c.y))
        .sort((a, b) => Math.hypot(a.x - px, a.y - py) - Math.hypot(b.x - px, b.y - py))[0] ?? null
    );
  }

  private walkTo(goal: { x: number; y: number }, target: Target | null) {
    const from = { x: Math.floor(this.player.x / TILE), y: Math.floor(this.player.y / TILE) };
    const path = findPath(this.world.solid, from, goal);
    if (!path) return;
    this.path = path;
    this.pathGoal = target;
    if (!path.length && target && this.inReach(target)) this.trigger(target);
    else if (!path.length) {
      this.path = [goal];
    }
  }

  private flashMarker(tx: number, ty: number) {
    const m = this.add.rectangle((tx + 0.5) * TILE, (ty + 0.5) * TILE, 10, 10).setStrokeStyle(1, 0xffffff, 0.9).setDepth(8);
    this.tweens.add({ targets: m, scale: 0.3, alpha: 0, duration: 400, onComplete: () => m.destroy() });
  }

  // ------------------------------------------------------------------ travel

  private teleport(area: Area, tx: number, ty: number, after?: () => void) {
    this.transitioning = true;
    this.path = [];
    this.pathGoal = null;
    const cam = this.cameras.main;
    const done = () => {
      this.area = area;
      this.player.setPosition((tx + 0.5) * TILE, (ty + 0.5) * TILE);
      cam.centerOn(this.player.x, this.player.y);
      this.applyAreaCamera(area);
      this.updateZone(true);
      if (prefersReducedMotion()) {
        this.transitioning = false;
        after?.();
        return;
      }
      cam.fadeIn(260, 0, 0, 0);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, () => {
        this.transitioning = false;
        after?.();
      });
    };
    if (prefersReducedMotion()) return done();
    cam.fadeOut(220, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, done);
  }

  private goTo(to: Area) {
    sfx('portal');
    if (to === 'dungeon') {
      const s = this.world.dungeonSpawn;
      this.teleport('dungeon', s.tx, s.ty, () => {
        if (state.discover('secret')) void this.ui.dialogKey('dungeonEnter');
      });
    } else {
      const e = this.world.worldExit;
      this.teleport('world', e.tx, e.ty);
    }
  }

  private fastTravel(id: LocationId) {
    if (id === 'secret') return this.goTo('dungeon');
    let dest: { x: number; y: number } | null = null;
    if (id === 'lake') dest = { x: 20, y: 12 };
    else {
      const it = this.world.interactables.find(
        (i) => (i.kind.type === 'location' && i.kind.id === id) || (id === 'terminal' && i.kind.type === 'terminal'),
      );
      if (it) dest = { x: it.tx, y: it.ty + it.h };
    }
    if (dest) this.teleport('world', dest.x, dest.y);
  }

  private updateZone(force = false) {
    const tx = this.player.x / TILE, ty = this.player.y / TILE;
    const z = this.world.zones.find((zz) => zz.area === this.area && tx >= zz.rect.x && tx < zz.rect.x + zz.rect.w && ty >= zz.rect.y && ty < zz.rect.y + zz.rect.h);
    const id = z?.id ?? `${this.area}-outside`;
    if (id === this.zoneId && !force) return;
    this.zoneId = id;
    this.ui.setLocation(z ? z.name : this.area === 'world' ? 'Akthar’s World' : '/root');
  }
}

