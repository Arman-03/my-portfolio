/**
 * Every piece of text on the site lives here.
 * Update this file to update the world — no game code changes needed.
 *
 * TODO(Akthar): items marked TODO still carry info from the old (2025) site.
 */

export const profile = {
  name: 'Akthar',
  fullName: 'K N Akthar Shaik',
  tagline: 'CSE @ IIIT Hyderabad · builder · organizer · runs on chai',
  location: 'Hyderabad, India',
  email: 'akthar.shai@students.iiit.in',
  github: 'https://github.com/Arman-03',
  linkedin: 'https://linkedin.com/in/k-n-akthar-shaik',
  /** Put a PDF at public/resume.pdf and set this to 'resume.pdf' to show download buttons. */
  resumeUrl: '' as string,
};

export interface Project {
  id: string;
  name: string;
  oneLiner: string;
  description: string;
  stack: string[];
  highlights: string[];
  links?: { label: string; url: string }[];
}

// TODO(Akthar): add GitHub/demo links, real stacks and 2–3 concrete highlights per project.
export const projects: Project[] = [
  {
    id: 'nfs',
    name: 'Network File System',
    oneLiner: 'A distributed file system. Like Google Drive… kinda.',
    description: 'Built a distributed file system with a naming server and storage servers.',
    stack: ['Distributed systems', 'Networking'],
    highlights: ['Naming server + storage servers architecture'],
  },
  {
    id: 'buysell',
    name: 'BuySell@IIIT',
    oneLiner: 'A mini OLX for the IIIT-H campus.',
    description: 'A campus marketplace for IIIT-H students to buy and sell with each other.',
    stack: ['Web', 'JWT auth'],
    highlights: ['JWT-based authentication'],
  },
  {
    id: 'picsysnap',
    name: 'PicsySnap',
    oneLiner: 'Turns images into video magic.',
    description: 'A web app that turns a set of images into a video.',
    stack: ['Python', 'Flask', 'MoviePy'],
    highlights: ['Image-to-video generation with MoviePy'],
  },
  {
    id: 'taxmanager',
    name: 'Income Tax Manager',
    oneLiner: 'Calculates taxes so you don’t cry over Excel sheets.',
    description: 'A database-backed tax calculator, built with SQL.',
    stack: ['SQL'],
    highlights: ['Tax computation backed by a relational database'],
  },
];

export const skills = {
  Languages: ['C', 'C++', 'Python', 'JavaScript', 'Dart'],
  'Frameworks & Tools': ['React', 'Node.js', 'Express', 'Flutter', 'Firebase', 'Flask', 'Git'],
  Databases: ['MongoDB', 'MySQL', 'CockroachDB'],
  Concepts: ['OOP', 'Data Structures & Algorithms', 'Operating Systems', 'DBMS'],
};
export const funSkill = 'Can debug while listening to Bollywood heartbreak songs.';

export interface Role {
  title: string;
  org: string;
  period: string;
  detail: string;
}

// TODO(Akthar): update tense/dates and add Megathon 2025 results + any internships.
export const roles: Role[] = [
  {
    title: 'Coordinator',
    org: 'E-Cell IIIT-H',
    period: 'Apr 2025 – Present',
    detail:
      'Organizing Megathon 2025 for 700+ participants: sponsorships, operations and all of the (fun) chaos.',
  },
  {
    title: 'House Captain',
    org: 'Vayu House',
    period: 'Jul 2025 – Present',
    detail:
      'Leading the house through inter-house cultural events. Loud cheers, louder celebrations. Vayu faad hai!',
  },
  {
    title: 'Apex Mentor',
    org: 'IIIT-H',
    period: 'Aug 2024 – May 2025',
    detail: 'Mentored freshers through academic life and made sure nobody panicked on day one.',
  },
];

export const achievements = [
  {
    title: 'Uber She++ 2025',
    detail: 'One of 100 selected from 11,000+ students across India. Beat the odds — and a ton of coding rounds.',
  },
];

export const about = {
  intro: [
    'Hi, I’m Akthar — a tech enthusiast who codes in caffeine and dreams in pixels.',
    'I’m a Computer Science undergrad at IIIT Hyderabad — with a learning curve that’s 🔥.',
    'Outside code, I organize Megathon with E-Cell, captain Vayu House, and have mentored freshers.',
  ],
  facts: [
    ['Based in', 'Hyderabad, India'],
    ['Studying', 'Computer Science, IIIT Hyderabad'],
    ['Fuel', 'Chai. Lots of it.'],
    ['Currently', 'Building, organizing, and vibing'],
  ] as [string, string][],
};

/** Short lines used by signs, NPCs and the world. */
export const lines = {
  welcomeSign: [
    'Welcome to Akthar’s World!',
    'Every building is a part of my story. Walk up to a door and press E (or tap it) to step in.',
    'Tip: press M for the map, or hit “Résumé” up top if you’re in a hurry.',
  ],
  akthar: [
    'Hey, you made it! I’m Akthar. 👋',
    'This little town is my portfolio. My projects live in the Lab to the east, my story is at home in the west.',
    'There are 10 places to discover — and at least one secret. Have fun exploring!',
  ],
  aktharAfterAll: [
    'You found everything. Even the secret. I’m impressed.',
    'Seriously though — if you’d like to work together, the Post Office is open. 📬',
  ],
  chai: [
    '☕ One cutting chai, coming right up!',
    'Fun fact: this entire portfolio was booted with curiosity and runs on chai.',
    'Pro tip: the best debugging happens between the first and second cup.',
  ],
  lakeSign: ['🌊 The Lake of Unfinished Side Projects', 'Every developer has one. Mine is quite deep.'],
  goalsSign: ['🎯 Target Range', 'Next targets: ship more, learn systems deeply, and build things people actually use.'],
  ruinSign: ['The stones are carved with strange glyphs:', '“sudo”'],
  fresher: ['Is this the way to the Library? I have a DSA exam tomorrow…', 'I heard Akthar mentors freshers. Nobody panics on day one!'],
  knight: ['I am the Code Reviewer.', 'None shall pass… without writing tests.'],
  wizard: ['Ah, a visitor. I am Professor Merge Conflict.', 'Resolve thy differences, young one. Always pull before you push.'],
  captain: ['VAYU! VAYU! VAYU! 💨', 'Our captain leads with loud cheers and louder celebrations.'],
  ghost: ['Boooo… I am the ghost of deadlines past…', '…I was due last Friday at 11:59 PM.'],
  bug: ['🐛 You squashed a bug!', 'It was a missing semicolon. It is always a missing semicolon.'],
  rootChest: ['The chest is labelled /root.', 'Inside, a note: “With great sudo comes great responsibility.”'],
  dungeonEnter: ['You found the secret /root directory!', 'Careful — there are bugs down here.'],
};

/** Location metadata shared by the world, HUD, minimap and résumé view. */
export type LocationId =
  | 'about'
  | 'projects'
  | 'skills'
  | 'hall'
  | 'ecell'
  | 'vayu'
  | 'contact'
  | 'terminal'
  | 'lake'
  | 'secret';

export const locations: Record<LocationId, { name: string; icon: string; hint: string }> = {
  about: { name: 'Akthar’s Home', icon: '🏠', hint: 'About me' },
  projects: { name: 'Project Lab', icon: '🧪', hint: 'Things I built' },
  skills: { name: 'The Library', icon: '📚', hint: 'Skills' },
  hall: { name: 'Hall of Fame', icon: '🏆', hint: 'Achievements' },
  ecell: { name: 'E-Cell HQ', icon: '🚀', hint: 'Leadership' },
  vayu: { name: 'Vayu House', icon: '💨', hint: 'House captain' },
  contact: { name: 'Post Office', icon: '📬', hint: 'Contact' },
  terminal: { name: 'Old Terminal', icon: '💻', hint: 'Portfolio v1' },
  lake: { name: 'Side-Project Lake', icon: '🌊', hint: 'A quiet spot' },
  secret: { name: '/root', icon: '🗝️', hint: 'Secret' },
};
