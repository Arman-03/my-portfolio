import { about, achievements, funSkill, locations, profile, projects, roles, skills, type LocationId, type Project } from '../content.ts';

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const ext = (url: string, label: string) =>
  `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;

const chips = (items: string[]) => `<ul class="chips">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;

const roleCard = (r: (typeof roles)[number]) => `
  <article class="card">
    <header><h3>${esc(r.title)} · ${esc(r.org)}</h3><span class="period">${esc(r.period)}</span></header>
    <p>${esc(r.detail)}</p>
  </article>`;

export function projectCard(p: Project) {
  const links = p.links?.length ? `<p class="links">${p.links.map((l) => ext(l.url, l.label)).join(' · ')}</p>` : '';
  return `
  <article class="card project" data-project="${esc(p.id)}">
    <header><h3>${esc(p.name)}</h3></header>
    <p class="lead">${esc(p.oneLiner)}</p>
    <p>${esc(p.description)}</p>
    ${p.highlights.length ? `<ul class="bullets">${p.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
    ${chips(p.stack)}
    ${links}
  </article>`;
}

export function contactBlock() {
  const resume = profile.resumeUrl
    ? `<a class="btn" href="${esc(profile.resumeUrl)}" download>Download résumé (PDF)</a>`
    : '';
  return `
  <ul class="contact">
    <li><span>Email</span><a href="mailto:${esc(profile.email)}">${esc(profile.email)}</a></li>
    <li><span>GitHub</span>${ext(profile.github, profile.github.replace('https://', ''))}</li>
    <li><span>LinkedIn</span>${ext(profile.linkedin, profile.linkedin.replace('https://', ''))}</li>
  </ul>
  ${resume}`;
}

/** Content shown when entering a building. */
export function sectionHTML(id: LocationId): { title: string; body: string } {
  const title = `${locations[id].icon} ${locations[id].name}`;
  switch (id) {
    case 'about':
      return {
        title,
        body: `
          ${about.intro.map((p) => `<p>${esc(p)}</p>`).join('')}
          <dl class="facts">${about.facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`,
      };
    case 'projects':
      return {
        title,
        body: `<p class="muted">Each project also has its own sign in the yard outside.</p>${projects.map((p) => projectCard(p)).join('')}`,
      };
    case 'skills':
      return {
        title,
        body: `
          ${Object.entries(skills)
            .map(([group, list]) => `<h3>${esc(group)}</h3>${chips(list)}`)
            .join('')}
          <p class="muted">Bonus skill: ${esc(funSkill)}</p>`,
      };
    case 'hall':
      return {
        title,
        body: achievements
          .map((a) => `<article class="card trophy"><header><h3>🏆 ${esc(a.title)}</h3></header><p>${esc(a.detail)}</p></article>`)
          .join(''),
      };
    case 'ecell':
      return {
        title,
        body: `<p class="muted">Leadership, organizing and mentoring.</p>${roles.map(roleCard).join('')}`,
      };
    case 'vayu': {
      const r = roles.find((x) => x.org === 'Vayu House');
      return {
        title,
        body: `${r ? roleCard(r) : ''}<p class="chant">💨 Vayu faad hai, Vayu waale faad hai! 💨</p>`,
      };
    }
    case 'contact':
      return {
        title,
        body: `<p>Want to build something, hire me, or just send memes? All work.</p>${contactBlock()}`,
      };
    default:
      return { title, body: '' };
  }
}

/** The full, game-free version of the site. */
export function resumeHTML() {
  return `
  <header class="resume-head">
    <div>
      <h1>${esc(profile.fullName)}</h1>
      <p class="tagline">${esc(profile.tagline)}</p>
    </div>
    ${contactBlock()}
  </header>
  <section><h2>About</h2>${about.intro.map((p) => `<p>${esc(p)}</p>`).join('')}</section>
  <section><h2>Projects</h2><div class="grid">${projects.map((p) => projectCard(p)).join('')}</div></section>
  <section><h2>Leadership</h2>${roles.map(roleCard).join('')}</section>
  <section><h2>Achievements</h2>${achievements
    .map((a) => `<article class="card"><header><h3>${esc(a.title)}</h3></header><p>${esc(a.detail)}</p></article>`)
    .join('')}</section>
  <section><h2>Skills</h2>${Object.entries(skills)
    .map(([g, l]) => `<h3>${esc(g)}</h3>${chips(l)}`)
    .join('')}</section>`;
}
