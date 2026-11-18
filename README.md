# Akthar's World

My portfolio, as a tiny pixel-art town you can walk around in.

Every building is a part of my story: projects live in the **Project Lab**, leadership roles at **E-Cell HQ** and **Vayu House**, skills in the **Library**, achievements in the **Hall of Fame**, and the contact details at the **Post Office**. Discover all 10 places (one of them is a secret 🗝️).

In a hurry? Every page has a **Résumé** button, and `/#resume` links straight to a plain, printable version.

## Features

- Walk with WASD or the arrow keys, click or tap to walk anywhere (A* pathfinding), or use the on-screen joystick on phones
- Walk into a door, or press <kbd>E</kbd>, to open a section; NPCs have things to say
- Map with fast travel (<kbd>M</kbd>), progress tracking, and a celebration when you find everything
- **Portfolio v1** lives on as a terminal kiosk in the town square (try `sudo rm -rf /`)
- Animated water and flags, drifting cloud shadows, and a sky tint that follows your local time (fireflies at night)
- Sound effects synthesised with WebAudio, no audio files
- Accessibility: all text is real DOM (selectable, screen-reader friendly), keyboard-only play, honours `prefers-reduced-motion`, plus the plain résumé view

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + map reachability check + production build into dist/
npm run preview    # serve dist/
```

`dist/` is a static site with relative paths, so it can be hosted anywhere (GitHub Pages, Netlify, Vercel…).

## Updating the content

All text is in **`src/content.ts`**: profile, projects, skills, roles, achievements, and every NPC and sign line. Edit it and the world, panels, terminal and résumé view all update.

To offer a résumé PDF, put it at `public/resume.pdf` and set `profile.resumeUrl = 'resume.pdf'`.

## How it's built

| Path | What |
| --- | --- |
| `src/world/worldMap.ts` | Builds the whole map in code (deterministic): forest autotiling, 9-slice water/dirt, buildings, groves, NPCs, the secret dungeon |
| `src/scenes/WorldScene.ts` | Phaser scene: tilemap, movement, collisions, interactions, camera, ambience |
| `src/ui/` | DOM overlay: title screen, HUD, dialogs, panels, map, résumé, terminal |
| `tools/check-map.ts` | Fails the build if any door, sign or NPC can't be reached on foot |
| `tools/render_map.py` | Renders the generated map to a PNG for previewing layout changes |
| `tools/make_custom_tiles.py` | Generates the extra tiles (water, dock, terminal, Vayu flag) in the same palette |
| `legacy/` | The original terminal portfolio |

Tech: TypeScript, [Phaser 4](https://phaser.io), Vite.

## Credits

- Pixel art: [Kenney](https://kenney.nl): *Tiny Town* and *Tiny Dungeon* (CC0). Licenses in `public/assets/`.
- Fonts: *Press Start 2P* and *Pixelify Sans* (SIL OFL), via Fontsource.
