/**
 * Portfolio v1 lives on as a kiosk in the town square: the original terminal,
 * now with tab-completion and a few new tricks.
 */
import { about, achievements, profile, projects, roles, skills, funSkill } from '../content.ts';
import { esc } from './sections.ts';

const PROMPT = 'guest@akthar.world:~$';

const neofetch = () => `<div class="neo"><pre class="neo-art">
 █████╗ ██╗  ██╗
██╔══██╗██║ ██╔╝
███████║█████╔╝
██╔══██║██╔═██╗
██║  ██║██║  ██╗
╚═╝  ╚═╝╚═╝  ╚═╝</pre><pre><span class="c-pink">guest</span>@<span class="c-pink">akthar.world</span>
──────────────────────────────
<span class="c-cyan">OS</span>        IIIT-HumanOS 2.0 (pixel edition)
<span class="c-cyan">Shell</span>     Humor + Hustle + Zsh
<span class="c-cyan">Packages</span>  ${esc(Object.values(skills).flat().slice(0, 8).join(', '))}
<span class="c-cyan">CPU</span>       BrainCore i7 (overheats during finals)
<span class="c-cyan">GPU</span>       Eyeball RTX (rendering memes in 4K)
<span class="c-cyan">IDE</span>       VS Code (1000+ tabs open)
<span class="c-cyan">Uptime</span>    Booted with curiosity. Running on chai.
</pre></div>`;

type Cmd = (args: string[]) => string | void;

export interface TerminalHooks {
  onExit: () => void;
  onPanic: () => void;
  onResume: () => void;
}

export function createTerminal(root: HTMLElement, hooks: TerminalHooks) {
  root.innerHTML = `
    <div class="term-window" role="dialog" aria-label="Portfolio v1 terminal">
      <div class="term-bar"><span class="dots"><i></i><i></i><i></i></span><span>portfolio-v1 — bash</span>
        <button class="term-close" aria-label="Close terminal">✕</button></div>
      <div class="term-body" tabindex="-1">
        <div class="term-out" aria-live="polite"></div>
        <label class="term-line"><span class="term-prompt">${PROMPT}</span>
          <input class="term-input" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Command" /></label>
      </div>
    </div>`;
  const out = root.querySelector<HTMLDivElement>('.term-out')!;
  const input = root.querySelector<HTMLInputElement>('.term-input')!;
  const body = root.querySelector<HTMLDivElement>('.term-body')!;
  root.querySelector('.term-close')!.addEventListener('click', hooks.onExit);
  body.addEventListener('click', () => input.focus());

  const history: string[] = [];
  let hIndex = 0;

  const print = (html: string) => {
    const div = document.createElement('div');
    div.className = 'term-block';
    div.innerHTML = html;
    out.appendChild(div);
    body.scrollTop = body.scrollHeight;
  };

  const commands: Record<string, Cmd> = {
    help: () =>
      `<span class="c-green">Available commands</span>
${[
  ['whoami', 'Who are you?'],
  ['about', 'A not-so-boring intro'],
  ['skills', 'Things I claim to know'],
  ['projects', 'Stuff I built instead of touching grass'],
  ['roles', 'Leadership & captainship adventures'],
  ['achievements', 'Shiny things'],
  ['contact', 'Say hi! Or send memes.'],
  ['neofetch', 'A snapshot of me (I am the system)'],
  ['resume', 'Open the plain résumé view'],
  ['clear', 'Clears the screen. Not your overthinking.'],
  ['exit', 'Back to the world'],
  ['sudo', 'Try me. I dare you.'],
]
  .map(([c, d]) => `  <span class="c-green">${c.padEnd(13)}</span>${d}`)
  .join('\n')}`,
    whoami: () => 'The paradox of “Who am I?” is: we never know, but we constantly find out.',
    about: () => about.intro.map(esc).join('\n'),
    skills: () =>
      Object.entries(skills)
        .map(([g, l]) => `<span class="c-cyan">${esc(g)}:</span> ${esc(l.join(', '))}`)
        .join('\n') + `\n<span class="c-cyan">Fun skill:</span> ${esc(funSkill)}`,
    projects: () => projects.map((p) => `• <span class="c-green">${esc(p.name)}</span> — ${esc(p.oneLiner)}`).join('\n'),
    roles: () =>
      roles.map((r) => `• <span class="c-green">${esc(r.title)}, ${esc(r.org)}</span> (${esc(r.period)})\n  → ${esc(r.detail)}`).join('\n'),
    achievements: () => achievements.map((a) => `• <span class="c-green">${esc(a.title)}</span>\n  → ${esc(a.detail)}`).join('\n'),
    contact: () =>
      `Email:    <a href="mailto:${esc(profile.email)}">${esc(profile.email)}</a>
GitHub:   <a href="${esc(profile.github)}" target="_blank" rel="noopener noreferrer">${esc(profile.github.replace('https://', ''))}</a>
LinkedIn: <a href="${esc(profile.linkedin)}" target="_blank" rel="noopener noreferrer">${esc(profile.linkedin.replace('https://', ''))}</a>`,
    neofetch,
    resume: () => {
      hooks.onResume();
    },
    clear: () => {
      out.innerHTML = '';
    },
    exit: () => {
      hooks.onExit();
    },
    ls: () => 'about.txt  projects/  skills.json  roles.md  <span class="c-pink">.secret</span>',
    cat: (args) =>
      args[0] === '.secret'
        ? 'There is a ruin hidden in the north-east forest. 🌲🗝️'
        : args[0]
          ? `cat: ${esc(args[0])}: try 'about', 'projects' or 'skills' instead 😉`
          : 'cat: missing operand (meow?)',
    hire: () => `Excellent choice. 📬 <a href="mailto:${esc(profile.email)}">${esc(profile.email)}</a>`,
    sudo: (args) => {
      const joined = args.join(' ');
      if (/^rm\s+-(rf|fr)\s+\/\s*$/.test(joined) || joined === 'rm -rf /*') {
        setTimeout(hooks.onPanic, 350);
        return '<span class="c-red">Deleting / …</span>';
      }
      return '⚠️  You are not authorized to sudo my life decisions.';
    },
  };
  const names = Object.keys(commands);

  const run = (raw: string) => {
    const line = raw.trim();
    print(`<span class="term-prompt">${PROMPT}</span> <span class="c-pink">${esc(line)}</span>`);
    if (!line) return;
    if (line !== history[history.length - 1]) history.push(line);
    hIndex = history.length;
    const [name, ...args] = line.split(/\s+/);
    const cmd = commands[name.toLowerCase()];
    const result = cmd ? cmd(args) : `${esc(name)}: command not found. Type <span class="c-green">help</span>.`;
    if (typeof result === 'string') print(result);
  };

  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      run(input.value);
      input.value = '';
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (!history.length) return;
      hIndex = Math.max(0, Math.min(history.length, hIndex + (e.key === 'ArrowUp' ? -1 : 1)));
      input.value = history[hIndex] ?? '';
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const v = input.value.trim().toLowerCase();
      const matches = names.filter((n) => n.startsWith(v));
      if (matches.length === 1) input.value = matches[0] + ' ';
      else if (matches.length > 1) print(matches.join('  '));
    } else if (e.key === 'Escape') {
      hooks.onExit();
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      out.innerHTML = '';
    }
  });

  let booted = false;
  return {
    open() {
      if (!booted) {
        booted = true;
        print(neofetch());
        print(`Welcome to <span class="c-green">portfolio v1</span> — the terminal that started it all.
Type <span class="c-green">help</span> to see commands, <span class="c-green">exit</span> to return to the world.`);
      }
      requestAnimationFrame(() => input.focus());
    },
  };
}
