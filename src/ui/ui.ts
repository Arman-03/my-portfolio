/**
 * All DOM UI layered over the Phaser canvas. Text lives in the DOM (crisp at any
 * zoom, selectable, accessible, links clickable); the canvas only draws the world.
 */
import { lines as allLines, locations, profile, projects, type LocationId } from '../content.ts';
import { bus, state, TOTAL_PLACES, prefersReducedMotion } from '../state.ts';
import { sfx, unlockAudio } from '../audio.ts';
import { esc, projectCard, resumeHTML, sectionHTML } from './sections.ts';
import { createTerminal } from './terminal.ts';
import type { WorldData } from '../world/worldMap.ts';
import { DUNGEON } from '../world/tiles.ts';

export interface GameApi {
  fastTravel(id: LocationId): void;
  interact(): void;
  playerTile(): { tx: number; ty: number; area: 'world' | 'dungeon' };
  shake(): void;
}

export const PLAYABLE = [DUNGEON.adventurer, DUNGEON.princess, DUNGEON.ranger, DUNGEON.hoodie];
const CHAR_NAMES = ['Adventurer', 'Princess', 'Ranger', 'Hooded Hacker'];

const $ = <E extends HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<E>(sel)!;

function spriteStyle(frame: number, scale: number) {
  const x = (frame % 12) * 16 * scale;
  const y = Math.floor(frame / 12) * 16 * scale;
  return `background-image:url(assets/dungeon.png);background-size:${192 * scale}px ${176 * scale}px;background-position:-${x}px -${y}px;width:${16 * scale}px;height:${16 * scale}px`;
}

type Overlay = 'panel' | 'dialog' | 'map' | 'resume' | 'terminal' | 'help' | 'panic' | null;

export function createUI(world: WorldData) {
  const root = $('#ui');
  root.innerHTML = `
    <div id="tint" aria-hidden="true"></div>
    <section id="title" class="screen" aria-labelledby="title-h">
      <div class="title-card">
        <p class="eyebrow">a portfolio you can walk around in</p>
        <h1 id="title-h" class="logo"><span>Akthar’s</span><span>World</span></h1>
        <p class="title-sub">${esc(profile.tagline)}</p>
        <fieldset class="chars"><legend>Choose your explorer</legend>
          ${PLAYABLE.map(
            (f, i) => `<label class="char"><input type="radio" name="char" value="${f}" ${i === 0 ? 'checked' : ''}/>
              <span class="char-sprite" style="${spriteStyle(f, 4)}" aria-hidden="true"></span><span class="char-name">${CHAR_NAMES[i]}</span></label>`,
          ).join('')}
        </fieldset>
        <button id="start" class="btn btn-primary btn-play">Start exploring</button>
        <p class="title-alt">In a hurry? <a href="#resume" id="title-resume">View the plain résumé →</a></p>
        <p class="controls-hint no-touch"><kbd>WASD</kbd> / <kbd>arrows</kbd> move · <kbd>E</kbd> interact · <kbd>M</kbd> map · or just click around</p>
        <p class="controls-hint touch-only">Use the stick to walk · tap <b>A</b> or tap anything to interact</p>
      </div>
    </section>

    <div id="hud" hidden>
      <div class="hud-left">
        <div id="loc" class="pill" aria-live="polite"></div>
        <button id="progress" class="pill progress" title="Places discovered — open map"></button>
      </div>
      <div class="hud-right">
        <button class="hud-btn" id="btn-map" title="Map (M)" aria-label="Open map">🗺️<span>Map</span></button>
        <button class="hud-btn" id="btn-resume" title="Plain résumé view" aria-label="Open résumé view">📄<span>Résumé</span></button>
        <button class="hud-btn" id="btn-sound" title="Toggle sound" aria-label="Toggle sound"></button>
        <button class="hud-btn" id="btn-help" title="Help (?)" aria-label="Help">?</button>
      </div>
    </div>

    <div id="prompt" class="prompt" hidden></div>
    <div id="toasts" aria-live="polite"></div>

    <div id="dialog" class="dialog" hidden role="dialog" aria-live="polite">
      <div class="dialog-name"></div>
      <p class="dialog-text"></p>
      <div class="dialog-choices"></div>
      <span class="dialog-next" aria-hidden="true">▼</span>
    </div>

    <div id="panel" class="modal" hidden role="dialog" aria-modal="true" aria-labelledby="panel-title">
      <div class="modal-box">
        <header class="modal-head"><h2 id="panel-title"></h2><button class="close" aria-label="Close">✕</button></header>
        <div class="modal-body"></div>
        <footer class="modal-foot"><span class="muted">Esc to close</span></footer>
      </div>
    </div>

    <div id="map" class="modal" hidden role="dialog" aria-modal="true" aria-labelledby="map-title">
      <div class="modal-box map-box">
        <header class="modal-head"><h2 id="map-title">🗺️ Map</h2><button class="close" aria-label="Close">✕</button></header>
        <div class="map-wrap"><canvas id="map-canvas"></canvas><div class="map-markers"></div></div>
        <p class="muted center">Click a place to fast-travel there.</p>
      </div>
    </div>

    <div id="help" class="modal" hidden role="dialog" aria-modal="true" aria-labelledby="help-title">
      <div class="modal-box">
        <header class="modal-head"><h2 id="help-title">How to play</h2><button class="close" aria-label="Close">✕</button></header>
        <div class="modal-body">
          <ul class="keys">
            <li><span><kbd>WASD</kbd> <kbd>↑↓←→</kbd></span>Move (hold <kbd>Shift</kbd> to run)</li>
            <li><span><kbd>E</kbd> <kbd>Space</kbd> <kbd>Enter</kbd></span>Talk / enter / read</li>
            <li><span>Click / tap</span>Walk somewhere, or straight to a building</li>
            <li><span><kbd>M</kbd></span>Map &amp; fast travel</li>
            <li><span><kbd>R</kbd></span>Plain résumé view</li>
            <li><span><kbd>Esc</kbd></span>Close windows</li>
          </ul>
          <p>Discover all ${TOTAL_PLACES} places. One of them is a secret… 🗝️</p>
          <p><button class="btn btn-small" id="reset-progress">Reset progress</button></p>
          <p class="muted">Pixel art: Kenney “Tiny Town” &amp; “Tiny Dungeon” (CC0). Built with Phaser.</p>
        </div>
      </div>
    </div>

    <div id="resume" class="resume" hidden role="dialog" aria-modal="true" aria-label="Résumé">
      <div class="resume-bar">
        <button class="btn btn-small" id="resume-back">« Back to the world</button>
        <button class="btn btn-small" id="resume-print">Print</button>
      </div>
      <div class="resume-page"></div>
    </div>

    <div id="terminal" class="term-overlay" hidden></div>
    <div id="panic" class="panic" hidden aria-live="assertive"></div>
    <canvas id="confetti" aria-hidden="true"></canvas>

    <div id="touch" hidden>
      <div class="stick" aria-hidden="true"><div class="knob"></div></div>
      <button class="a-btn" aria-label="Interact">A</button>
    </div>
  `;

  let api: GameApi | null = null;
  let overlay: Overlay = null;
  const setOverlay = (o: Overlay) => {
    overlay = o;
    state.uiBlocking = o !== null;
    if (o) hidePrompt();
  };

  // ------------------------------------------------------------------ title
  const title = $('#title');
  const startBtn = $<HTMLButtonElement>('#start');
  if (state.character >= 0) {
    const r = title.querySelector<HTMLInputElement>(`input[value="${state.character}"]`);
    if (r) r.checked = true;
  }
  title.querySelectorAll<HTMLInputElement>('input[name=char]').forEach((r) =>
    r.addEventListener('change', () => {
      unlockAudio();
      sfx('blip');
    }),
  );
  let onStart: ((frame: number) => void) | null = null;
  startBtn.addEventListener('click', () => {
    unlockAudio();
    sfx('select');
    const frame = Number(title.querySelector<HTMLInputElement>('input[name=char]:checked')!.value);
    state.character = frame;
    state.started = true;
    title.classList.add('leaving');
    setTimeout(() => (title.hidden = true), prefersReducedMotion() ? 0 : 600);
    $('#hud').hidden = false;
    updateProgress();
    onStart?.(frame);
    bus.emit('game-start');
  });
  $('#title-resume').addEventListener('click', (e) => {
    e.preventDefault();
    openResume();
  });

  // ------------------------------------------------------------------ HUD
  const loc = $('#loc');
  function setLocation(name: string) {
    if (loc.textContent === name) return;
    loc.textContent = name;
    loc.classList.remove('flash');
    void loc.offsetWidth;
    loc.classList.add('flash');
  }
  const progressBtn = $<HTMLButtonElement>('#progress');
  function updateProgress() {
    const found = state.discovered;
    const icons = (Object.keys(locations) as LocationId[])
      .map((id) => `<i class="${found.has(id) ? 'on' : ''}" title="${found.has(id) ? esc(locations[id].name) : '???'}">${found.has(id) ? locations[id].icon : '·'}</i>`)
      .join('');
    progressBtn.innerHTML = `<b>${found.size}/${TOTAL_PLACES}</b> discovered <span class="icons">${icons}</span>`;
  }
  progressBtn.addEventListener('click', () => openMap());
  bus.on('progress', updateProgress);

  const soundBtn = $<HTMLButtonElement>('#btn-sound');
  const renderSound = () => {
    soundBtn.innerHTML = state.sound ? '🔊<span>Sound</span>' : '🔇<span>Muted</span>';
    soundBtn.setAttribute('aria-pressed', String(state.sound));
  };
  renderSound();
  soundBtn.addEventListener('click', () => {
    unlockAudio();
    state.sound = !state.sound;
    renderSound();
    sfx('select');
  });
  $('#btn-map').addEventListener('click', () => openMap());
  $('#btn-resume').addEventListener('click', () => openResume());
  $('#btn-help').addEventListener('click', () => openModal('help'));
  $('#reset-progress').addEventListener('click', () => {
    state.resetProgress();
    toast('Progress reset. Happy re-exploring!');
  });

  // ------------------------------------------------------------------ toasts
  const toasts = $('#toasts');
  function toast(html: string, kind: 'info' | 'discover' = 'info') {
    const t = document.createElement('div');
    t.className = `toast ${kind}`;
    t.innerHTML = html;
    toasts.appendChild(t);
    setTimeout(() => t.classList.add('out'), 3200);
    setTimeout(() => t.remove(), 3700);
  }
  bus.on('discover', (id) => {
    sfx('discover');
    toast(`<small>New place discovered</small><b>${locations[id].icon} ${esc(locations[id].name)}</b>`, 'discover');
    if (state.discovered.size === TOTAL_PLACES) {
      setTimeout(() => {
        sfx('complete');
        confetti();
        toast('<b>🎉 You discovered everything!</b><small>Go say hi to Akthar in the square.</small>', 'discover');
      }, 900);
    }
  });

  // ------------------------------------------------------------------ prompt
  const prompt = $('#prompt');
  function showPrompt(text: string, x: number, y: number) {
    if (overlay) return;
    prompt.hidden = false;
    const key = matchMedia('(pointer: coarse)').matches ? 'A' : 'E';
    const html = `<kbd>${key}</kbd> ${esc(text)}`;
    if (prompt.innerHTML !== html) prompt.innerHTML = html;
    prompt.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
  }
  function hidePrompt() {
    prompt.hidden = true;
  }

  // ------------------------------------------------------------------ dialog
  const dlg = $('#dialog');
  const dlgName = $('.dialog-name', dlg);
  const dlgText = $('.dialog-text', dlg);
  const dlgChoices = $('.dialog-choices', dlg);
  let dlgAdvance: (() => void) | null = null;

  /** Shows lines one by one. Resolves with the chosen index if `choices` were given on the last line. */
  function dialog(lines: string[], opts: { speaker?: string; choices?: string[] } = {}): Promise<number> {
    return new Promise((resolve) => {
      setOverlay('dialog');
      dlg.hidden = false;
      dlgName.textContent = opts.speaker ?? '';
      dlgName.hidden = !opts.speaker;
      let i = 0;
      let typing = 0;
      let full = '';
      const reduced = prefersReducedMotion();
      const typeLine = () => {
        full = lines[i];
        dlgChoices.innerHTML = '';
        dlg.classList.remove('done');
        if (reduced) {
          dlgText.textContent = full;
          return finishLine();
        }
        let n = 0;
        dlgText.textContent = '';
        window.clearInterval(typing);
        typing = window.setInterval(() => {
          n += 1;
          dlgText.textContent = full.slice(0, n);
          if (n % 3 === 1 && full[n - 1] !== ' ') sfx('blip');
          if (n >= full.length) finishLine();
        }, 22);
      };
      const finishLine = () => {
        window.clearInterval(typing);
        typing = 0;
        dlgText.textContent = full;
        dlg.classList.add('done');
        if (i === lines.length - 1 && opts.choices) {
          dlgChoices.innerHTML = opts.choices.map((c, k) => `<button class="btn btn-small" data-k="${k}">${esc(c)}</button>`).join('');
          dlgChoices.querySelectorAll<HTMLButtonElement>('button').forEach((b) =>
            b.addEventListener('click', (e) => {
              e.stopPropagation();
              close(Number(b.dataset.k));
            }),
          );
          dlgChoices.querySelector<HTMLButtonElement>('button')?.focus();
        }
      };
      const close = (choice: number) => {
        window.clearInterval(typing);
        dlg.hidden = true;
        dlgAdvance = null;
        setOverlay(null);
        resolve(choice);
      };
      dlgAdvance = () => {
        if (typing) return finishLine();
        if (i === lines.length - 1 && opts.choices) return; // must pick a choice
        i += 1;
        if (i >= lines.length) return close(-1);
        sfx('blip');
        typeLine();
      };
      typeLine();
    });
  }
  dlg.addEventListener('click', () => dlgAdvance?.());

  // ------------------------------------------------------------------ modals
  const panel = $('#panel');
  function openModal(which: 'panel' | 'map' | 'help') {
    closeAll(false);
    const el = $(`#${which}`);
    el.hidden = false;
    setOverlay(which);
    sfx('open');
    requestAnimationFrame(() => el.querySelector<HTMLElement>('.close')?.focus({ preventScroll: true }));
  }
  function closeAll(playSound = true) {
    if (overlay === 'dialog' || overlay === 'panic') return;
    let closed = false;
    for (const id of ['panel', 'map', 'help', 'resume', 'terminal']) {
      const el = $(`#${id}`);
      if (!el.hidden) {
        el.hidden = true;
        closed = true;
      }
    }
    if (closed && playSound) sfx('close');
    if (location.hash === '#resume') history.replaceState(null, '', location.pathname + location.search);
    setOverlay(null);
    if (!state.started) startBtn.focus();
  }
  root.querySelectorAll('.modal .close').forEach((b) => b.addEventListener('click', () => closeAll()));
  root.querySelectorAll<HTMLElement>('.modal').forEach((m) =>
    m.addEventListener('click', (e) => {
      if (e.target === m) closeAll();
    }),
  );

  function openSection(id: LocationId) {
    const { title, body } = sectionHTML(id);
    $('#panel-title').textContent = title;
    $('.modal-body', panel).innerHTML = body;
    panel.dataset.section = id;
    openModal('panel');
    $('.modal-body', panel).scrollTop = 0;
    state.discover(id);
  }
  function openProject(projectId: string) {
    const p = projects.find((x) => x.id === projectId);
    if (!p) return;
    $('#panel-title').textContent = `🧪 ${p.name}`;
    $('.modal-body', panel).innerHTML = projectCard(p);
    panel.dataset.section = 'projects';
    openModal('panel');
  }

  // ------------------------------------------------------------------ map
  const mapCanvas = $<HTMLCanvasElement>('#map-canvas');
  const markers = $('.map-markers');
  const W = world.areas.world.w, H = world.areas.world.h;
  const PX = 8;
  /** Renders the world at half scale from the real tilesheets, so the map is a true miniature. */
  const sheetImgs = ['town', 'dungeon', 'custom'].map((n) => {
    const img = new Image();
    img.src = `assets/${n}.png`;
    return img;
  });
  const FIRST = [1, 133, 265];
  let mapDrawn = false;
  function drawMap() {
    if (mapDrawn || !sheetImgs.every((i) => i.complete && i.naturalWidth)) return;
    mapDrawn = true;
    mapCanvas.width = W * PX;
    mapCanvas.height = H * PX;
    const g = mapCanvas.getContext('2d')!;
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    for (const layer of [world.ground, world.decor, world.objects, world.above])
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const gid = layer[y][x];
          if (gid < 0) continue;
          const k = gid >= FIRST[2] ? 2 : gid >= FIRST[1] ? 1 : 0;
          const i = gid - FIRST[k];
          g.drawImage(sheetImgs[k], (i % 12) * 16, Math.floor(i / 12) * 16, 16, 16, x * PX, y * PX, PX, PX);
        }
  }
  sheetImgs.forEach((img) => img.addEventListener('load', drawMap));
  const markerTarget: Partial<Record<LocationId, { tx: number; ty: number }>> = {};
  for (const it of world.interactables) {
    if (it.kind.type === 'location' && !markerTarget[it.kind.id]) markerTarget[it.kind.id] = { tx: it.tx, ty: it.ty };
    if (it.kind.type === 'terminal') markerTarget.terminal = { tx: it.tx, ty: it.ty };
    if (it.key === 'lakeSign') markerTarget.lake = { tx: 20, ty: 10 };
    if (it.key === 'portal-a') markerTarget.secret = { tx: it.tx, ty: it.ty };
  }
  function renderMarkers() {
    const found = state.discovered;
    const p = api?.playerTile();
    markers.innerHTML =
      (Object.keys(markerTarget) as LocationId[])
        .map((id) => {
          const t = markerTarget[id]!;
          const secret = id === 'secret' && !found.has('secret');
          const label = secret ? '???' : locations[id].name;
          return `<button class="marker ${found.has(id) ? 'found' : ''} ${secret ? 'secret' : ''}" data-id="${id}" ${secret ? 'disabled' : ''}
            style="left:${((t.tx + 0.5) / W) * 100}%;top:${((t.ty + 0.5) / H) * 100}%" aria-label="Travel to ${esc(label)}">
            <span class="m-icon">${secret ? '❔' : locations[id].icon}</span><span class="m-label">${esc(label)}</span></button>`;
        })
        .join('') +
      (p && p.area === 'world'
        ? `<span class="you" style="left:${((p.tx + 0.5) / W) * 100}%;top:${((p.ty + 0.5) / H) * 100}%" aria-label="You are here"></span>`
        : '');
    markers.querySelectorAll<HTMLButtonElement>('.marker:not([disabled])').forEach((b) =>
      b.addEventListener('click', () => {
        const id = b.dataset.id as LocationId;
        closeAll(false);
        sfx('portal');
        api?.fastTravel(id);
      }),
    );
  }
  function openMap() {
    if (!state.started) return;
    drawMap();
    renderMarkers();
    openModal('map');
  }

  // ------------------------------------------------------------------ résumé
  const resume = $('#resume');
  $('.resume-page', resume).innerHTML = resumeHTML();
  function openResume() {
    closeAll(false);
    resume.hidden = false;
    setOverlay('resume');
    resume.scrollTop = 0;
    if (location.hash !== '#resume') history.replaceState(null, '', '#resume');
    $<HTMLButtonElement>('#resume-back').focus({ preventScroll: true });
  }
  $('#resume-back').addEventListener('click', () => closeAll());
  $('#resume-print').addEventListener('click', () => window.print());

  // ------------------------------------------------------------------ terminal
  const termRoot = $('#terminal');
  const terminal = createTerminal(termRoot, {
    onExit: () => closeAll(),
    onPanic: () => {
      closeAll(false);
      void panic();
    },
    onResume: () => openResume(),
  });
  function openTerminal() {
    closeAll(false);
    termRoot.hidden = false;
    setOverlay('terminal');
    sfx('open');
    terminal.open();
    state.discover('terminal');
  }

  // ------------------------------------------------------------------ kernel panic easter egg
  const panicEl = $('#panic');
  async function panic() {
    setOverlay('panic');
    sfx('error');
    api?.shake();
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    await wait(450);
    panicEl.hidden = false;
    panicEl.innerHTML = '';
    const out = [
      'rm: removing /bin … done',
      'rm: removing /home/akthar/portfolio … done',
      'rm: removing /home/akthar/sleep_schedule … (already gone)',
      'rm: removing /usr/share/chai … <b>FATAL</b>',
      '',
      'Kernel panic - not syncing: Attempted to kill chai supply!',
      'CPU: 0 PID: 1 Comm: akthar Tainted: G   memes  6.9.420',
      'Call Trace:',
      '  run_on_chai+0x42/0x1337',
      '  hustle_loop+0xdead/0xbeef',
      '',
      'Rebooting in 3… 2… 1…',
    ];
    for (const line of out) {
      const div = document.createElement('div');
      div.innerHTML = line || '&nbsp;';
      panicEl.appendChild(div);
      await wait(prefersReducedMotion() ? 0 : line.startsWith('Rebooting') ? 900 : 140);
    }
    await wait(600);
    panicEl.classList.add('reboot');
    panicEl.innerHTML = '<div class="reboot-msg">Just kidding. 😄<br/>Nothing was deleted. Please don’t do that on a real machine.</div>';
    await wait(2200);
    panicEl.classList.remove('reboot');
    panicEl.hidden = true;
    setOverlay(null);
  }

  // ------------------------------------------------------------------ confetti
  function confetti() {
    if (prefersReducedMotion()) return;
    const c = $<HTMLCanvasElement>('#confetti');
    const g = c.getContext('2d')!;
    c.width = innerWidth;
    c.height = innerHeight;
    c.style.display = 'block';
    const colors = ['#84c669', '#f9c74f', '#ff89b8', '#5aaaf5', '#eaa56c', '#ffffff'];
    const bits = Array.from({ length: 160 }, () => ({
      x: Math.random() * c.width,
      y: -20 - Math.random() * c.height * 0.5,
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 3,
      s: 4 + Math.floor(Math.random() * 3) * 2,
      col: colors[Math.floor(Math.random() * colors.length)],
    }));
    const start = performance.now();
    const frame = (now: number) => {
      g.clearRect(0, 0, c.width, c.height);
      for (const b of bits) {
        b.x += b.vx;
        b.y += b.vy;
        b.vy += 0.03;
        g.fillStyle = b.col;
        g.fillRect(Math.round(b.x), Math.round(b.y), b.s, b.s);
      }
      if (now - start < 4500) requestAnimationFrame(frame);
      else c.style.display = 'none';
    };
    requestAnimationFrame(frame);
  }

  // ------------------------------------------------------------------ keyboard
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement && e.target.classList.contains('term-input')) return;
    if (overlay === 'dialog') {
      if (['e', 'E', ' ', 'Enter', 'Escape'].includes(e.key)) {
        e.preventDefault();
        if (!(e.repeat && e.key !== 'Escape')) dlgAdvance?.();
      }
      return;
    }
    if (overlay === 'panic') return;
    if (e.key === 'Escape') {
      if (overlay) {
        e.preventDefault();
        closeAll();
      }
      return;
    }
    if (!state.started) {
      if (e.key === 'Enter' && !overlay && document.activeElement?.tagName !== 'A') {
        e.preventDefault();
        startBtn.click();
      }
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      if (overlay === 'map') closeAll();
      else if (!overlay) openMap();
    } else if ((e.key === 'r' || e.key === 'R') && !overlay) {
      openResume();
    } else if (e.key === '?' && !overlay) {
      openModal('help');
    }
  });

  // ------------------------------------------------------------------ touch controls
  const touch = $('#touch');
  const stick = $('.stick', touch);
  const knob = $('.knob', touch);
  const vec = { x: 0, y: 0 };
  const showTouch = () => {
    if (state.started) touch.hidden = false;
  };
  if (matchMedia('(pointer: coarse)').matches) bus.on('game-start', showTouch);
  window.addEventListener('touchstart', showTouch, { once: true, passive: true });
  let stickId: number | null = null;
  const moveStick = (e: PointerEvent) => {
    const r = stick.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const max = r.width / 2;
    const len = Math.hypot(dx, dy);
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const dead = 0.2;
    vec.x = Math.abs(dx / max) > dead ? dx / max : 0;
    vec.y = Math.abs(dy / max) > dead ? dy / max : 0;
  };
  stick.addEventListener('pointerdown', (e) => {
    stickId = e.pointerId;
    stick.setPointerCapture(e.pointerId);
    moveStick(e);
  });
  stick.addEventListener('pointermove', (e) => e.pointerId === stickId && moveStick(e));
  const release = (e: PointerEvent) => {
    if (e.pointerId !== stickId) return;
    stickId = null;
    vec.x = vec.y = 0;
    knob.style.transform = '';
  };
  stick.addEventListener('pointerup', release);
  stick.addEventListener('pointercancel', release);
  $('.a-btn', touch).addEventListener('pointerdown', (e) => {
    e.preventDefault();
    unlockAudio();
    if (overlay === 'dialog') dlgAdvance?.();
    else if (!overlay) api?.interact();
  });

  // ------------------------------------------------------------------ time-of-day tint
  const tint = $('#tint');
  const applyTint = () => {
    const h = new Date().getHours() + new Date().getMinutes() / 60;
    tint.className = h >= 20 || h < 5.5 ? 'night' : h >= 17.5 ? 'dusk' : h < 7 ? 'dawn' : '';
  };
  applyTint();
  setInterval(applyTint, 60_000);

  return {
    attach(gameApi: GameApi) {
      api = gameApi;
    },
    onStart(fn: (frame: number) => void) {
      onStart = fn;
    },
    get touchVector() {
      return vec;
    },
    get busy() {
      return overlay !== null;
    },
    get isNight() {
      return tint.className === 'night';
    },
    dialog,
    dialogKey: (key: keyof typeof allLines, speaker?: string) => dialog(allLines[key], { speaker }),
    openSection,
    openProject,
    openTerminal,
    openResume,
    panic,
    toast,
    setLocation,
    showPrompt,
    hidePrompt,
  };
}

export type UI = ReturnType<typeof createUI>;
