import Phaser from 'phaser';
import '@fontsource/press-start-2p/400.css';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import './ui/styles.css';
import { buildWorld } from './world/worldMap.ts';
import { createUI } from './ui/ui.ts';
import { WorldScene } from './scenes/WorldScene.ts';

const world = buildWorld();
const ui = createUI(world);

const boot = document.getElementById('boot');
const ready = () => {
  boot?.classList.add('done');
  setTimeout(() => boot?.remove(), 500);
  if (location.hash === '#resume') ui.openResume();
};

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#3d8a49',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  physics: { default: 'arcade', arcade: { debug: false } },
  input: { keyboard: true, touch: true },
  banner: false,
  scene: [new WorldScene(world, ui, ready)],
});

// Handy for debugging in the browser console during development.
if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
