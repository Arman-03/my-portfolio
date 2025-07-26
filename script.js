document.addEventListener('DOMContentLoaded', () => {
  const output = document.getElementById('output');
  const inputText = document.getElementById('input-text');
  const cursor = document.getElementById('cursor');
  const hiddenInput = document.getElementById('hidden-input');
  const terminal = document.getElementById('terminal');

  let currentInput = '';
  const commandHistory = [];
  let historyIndex = 0;

const neofetch = `<div class="command-output neofetch-box">
<div style="display: flex; flex-direction: row; gap: 2em; align-items: flex-start; flex-wrap: wrap;">
  
  <pre style="font-family: 'Fira Code', monospace; color: #f8f8f2; margin: 0;">
<span style="color:#bd93f9;">guest@akhtar.portfolio</span>
────────────────────────────────────────────
<span style="color:#ff79c6;">OS</span>:              <span style="color:#f8f8f2;">IIIT-HumanOS 1.0</span>
<span style="color:#f1fa8c;">Shell</span>:           <span style="color:#f8f8f2;">Humor + Hustle + Zsh</span>
<span style="color:#8be9fd;">Uptime</span>:          <span style="color:#f8f8f2;">~21 years (and counting)</span>
<span style="color:#50fa7b;">Packages</span>:        <span style="color:#f8f8f2;">JS, C++, Python, Dart, React, Flutter, Mongo, Assembly</span>
<span style="color:#ffb86c;">Memory</span>:          <span style="color:#f8f8f2;">9.0/11.0 CGPA (working on optimization)</span>
<span style="color:#bd93f9;">CPU</span>:             <span style="color:#f8f8f2;">BrainCore i7 (overheats during finals)</span>
<span style="color:#ff5555;">GPU</span>:             <span style="color:#f8f8f2;">Eyeball RTX (rendering memes in 4K)</span>
<span style="color:#f8f8f2;">IDE</span>:             <span style="color:#f8f8f2;">VS Code (with 1000+ tabs open)</span>
<span style="color:#8be9fd;">Terminal</span>:        <span style="color:#f8f8f2;">This beautiful one, made with ❤️</span>
<span style="color:#ff79c6;">Current Project</span>: <span style="color:#f8f8f2;">Megathon 2025, Vayu House Captainship, and vibing.</span>
────────────────────────────────────────────
<span style="color:#ffb86c;">💻 "Booted with curiosity. Running on chai."</span>
  </pre>

  <pre style="font-family: 'Fira Code', monospace; color: #00bcd4; margin: 0;">
_____________ ______________  ________________ 
___    |__  //_/__  __/__  / / /__    |__  __ \\                  
    /| |_  ,<  __  /  __  /_/ /__  /| |_  /_/ /
_  ___ |  /| | _  /   _  __  / _  ___ |  _, _/ 
/_/  |_/_/ |_| /_/    /_/ /_/  /_/  |_/_/ |_|
  </pre>

</div>
</div>`;

output.innerHTML = neofetch;

const welcomeMessage = `Welcome to my terminal portfolio! Type <span style="color:#00ff00;">'help'</span> to see available commands.`;
output.innerHTML += `<div class="command-output">${welcomeMessage}</div>`;

  terminal.addEventListener('click', () => hiddenInput.focus());

  hiddenInput.addEventListener('input', (e) => {
      currentInput = e.target.value;
      inputText.textContent = currentInput;
      updateCursor();
      historyIndex = commandHistory.length;
  });

  hiddenInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          processCommand();
      } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          navigateHistory(-1);
      } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          navigateHistory(1);
      } else {
          setTimeout(updateCursor, 0);
      }
  });


  function updateCursor() {
      const textWidth = inputText.offsetWidth;
      cursor.style.left = textWidth + 'px';
  }

  function navigateHistory(direction) {
      if (commandHistory.length === 0) return;
      historyIndex = Math.max(0, Math.min(historyIndex + direction, commandHistory.length));
      currentInput = historyIndex < commandHistory.length ? commandHistory[historyIndex] : '';
      updateInput();
  }
  
  function updateInput() {
      hiddenInput.value = currentInput;
      inputText.textContent = currentInput;
      hiddenInput.selectionStart = hiddenInput.selectionEnd = currentInput.length;
      updateCursor();
  }

  function processCommand() {
      const command = currentInput.trim();

      const commandLine = document.createElement('div');
      commandLine.innerHTML = `<span class="prompt">guest@akhtar.portfolio:~$ </span><span class="command-history">${command}</span>`;
      output.appendChild(commandLine);

      if (command && command !== commandHistory[commandHistory.length - 1]) {
          commandHistory.push(command);
      }
      historyIndex = commandHistory.length;

      const commandOutputElement = document.createElement('div');
      commandOutputElement.classList.add('command-output');

      switch (command) {
          case 'help':
              commandOutputElement.innerHTML = `
  <span style="color:#00ff00;">whoami</span>          → Who are you?
  <span style="color:#00ff00;">about</span>           → A not-so-boring intro of a CSE student who occasionally sleeps.
  <span style="color:#00ff00;">skills</span>          → Things I *claim* to know (and might actually be good at).
  <span style="color:#00ff00;">projects</span>        → Stuff I’ve built instead of touching grass.
  <span style="color:#00ff00;">roles</span>           → My leadership, mentoring, and captainship adventures.
  <span style="color:#00ff00;">contact</span>         → Say hi! Or send memes. Both work.
  <span style="color:#00ff00;">clear</span>           → Clears the terminal. Not your overthinking.
  <span style="color:#00ff00;">neofetch</span>        → A colorful neofetch-style snapshot of me (yes, I'm the system).  
  <span style="color:#00ff00;">sudo</span>            → Try me. I dare you.
  <span style="color:#00ff00;">help</span>            → This very list. A self-call.`;
              break;

          case 'whoami':
              commandOutputElement.textContent = `
  The paradox of “Who am I?” is: we never know, but, we constantly find out.`;
              break;

          case 'about':
              commandOutputElement.textContent = `
  Hi, I'm Akhtar — a tech enthusiast who codes in caffeine and dreams in pixels.  
  Currently a CSE undergrad at IIIT Hyderabad, with a CGPA that's not great but a learning curve that's 🔥.`;
              break;

          case 'skills':
              commandOutputElement.textContent = `
  Languages: C, C++, Python, JavaScript, Dart  
  Frameworks & Tools: React, Node, Express, Flutter, Firebase, Flask, Git  
  Databases: MongoDB, MySQL, CockroachDB  
  Concepts: OOP, DSA, OS, DBMS  
  Fun skill: Can debug while listening to Bollywood heartbreak songs.`;
              break;

          case 'projects':
              commandOutputElement.innerHTML = `
  - Network File System (NFS): Built a distributed file system with naming and storage servers. Yes, like Google Drive… kinda.
  - BuySell@IIIT: A mini OLX for IIIT-H with JWT auth.
  - PicsySnap: Turned images into video magic using Flask and moviepy.
  - Income Tax Manager: Calculates taxes so you don’t have to cry over Excel sheets. Done using SQL.`;
              break;

              case 'sudo':
                commandOutputElement.innerHTML = `
  ⚠️ You are not authorized to sudo my life decisions.`;
                break;

              case 'roles':
                commandOutputElement.innerHTML = `
<strong>Leadership & Roles</strong>

• <span style="color:#00ff00;">Coordinator, E-Cell IIIT-H</span> (Apr 2025 – Present)  
  → Gonna organize Megathon 2025 with expected 700+ participants, managing sponsorships, ops, and the chaos (fun chaos).
  
  • <span style="color:#00ff00;">House Captain, Vayu House</span> (Jul 2025 – Present)  
  → Leading house to glory in inter-house cultural events. Loud cheers and louder celebrations. Vayu faad hai, Vayu waale faad hai...
  
  • <span style="color:#00ff00;">Apex Mentor, IIIT-H</span> (Aug 2024 – May 2025)  
    → Mentored freshers through academic life and made sure they didn’t panic on day one.

<strong>Achievements</strong>

• Selected for <span style="color:#00ff00;">Uber She++ 2025</span>  
  → One of 100 selected from 11,000+ students across India. Beat the odds — and a ton of coding rounds.`;
                break;
            

          case 'contact':
              commandOutputElement.innerHTML = `
  Email: <a href="mailto:akthar.shai@students.iiit.in">akthar.shai@students.iiit.in</a>
  GitHub: <a href="https://github.com/Arman-03" target="_blank" rel="noopener noreferrer">github.com/Arman-03</a>
  LinkedIn: <a href="https://linkedin.com/in/k-n-akthar-shaik" target="_blank" rel="noopener noreferrer">linkedin.com/in/k-n-akthar-shaik</a>`;
              break;

          case 'clear':
              output.innerHTML = '';
              break;

          case 'neofetch':
              commandOutputElement.innerHTML = neofetch;
              output.appendChild(commandOutputElement);
              break;

          default:
              if (command) {
                  commandOutputElement.textContent = `${command}: command not found`;
              }
              break;
      }

      if (command !== 'clear' && commandOutputElement.innerHTML) {
          output.appendChild(commandOutputElement);
      }

      currentInput = '';
      updateInput();
      
      terminal.scrollTop = terminal.scrollHeight;
  }

  hiddenInput.focus();
  updateCursor();
});