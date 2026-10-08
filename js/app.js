/* =============================================
   PERSONAL DASHBOARD — app.js
   ============================================= */

'use strict';

/* -----------------------------------------------
   STORAGE HELPERS
----------------------------------------------- */
const Storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('localStorage write failed:', e);
    }
  },
};

/* -----------------------------------------------
   1. THEME (Light / Dark mode)
----------------------------------------------- */
const ThemeModule = (() => {
  const STORAGE_KEY = 'dashboard_theme';
  const html         = document.documentElement;
  const toggleBtn    = document.getElementById('theme-toggle');

  function apply(theme) {
    html.setAttribute('data-theme', theme);
    Storage.set(STORAGE_KEY, theme);
  }

  function toggle() {
    const current = html.getAttribute('data-theme');
    apply(current === 'dark' ? 'light' : 'dark');
  }

  function init() {
    const saved = Storage.get(STORAGE_KEY, 'light');
    apply(saved);
    toggleBtn.addEventListener('click', toggle);
  }

  return { init };
})();

/* -----------------------------------------------
   2. CLOCK & GREETING
----------------------------------------------- */
const ClockModule = (() => {
  const timeEl     = document.getElementById('time-display');
  const greetEl    = document.getElementById('greeting-text');
  const dateEl     = document.getElementById('date-display');

  function getGreeting(hour) {
    if (hour >= 5  && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 21) return 'Good evening';
    return 'Good night';
  }

  function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
      hour:   '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }

  function formatDate(date) {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year:    'numeric',
      month:   'long',
      day:     'numeric',
    });
  }

  function tick() {
    const now  = new Date();
    const hour = now.getHours();

    timeEl.textContent = formatTime(now);
    dateEl.textContent = formatDate(now);

    const name     = NameModule.getName();
    const greeting = getGreeting(hour);
    greetEl.textContent = name
      ? `${greeting}, ${name}! 👋`
      : `${greeting}! 👋`;
  }

  function init() {
    tick();
    setInterval(tick, 1000);
  }

  return { init, tick };
})();

/* -----------------------------------------------
   3. CUSTOM NAME (Challenge)
----------------------------------------------- */
const NameModule = (() => {
  const STORAGE_KEY  = 'dashboard_name';
  const nameDisplay  = document.getElementById('name-display');
  const editBtn      = document.getElementById('edit-name-btn');
  const modal        = document.getElementById('name-modal');
  const backdrop     = modal.querySelector('.modal__backdrop');
  const nameInput    = document.getElementById('name-input');
  const saveBtn      = document.getElementById('save-name-btn');
  const cancelBtn    = document.getElementById('cancel-name-btn');

  function getName() {
    return Storage.get(STORAGE_KEY, '');
  }

  function setName(value) {
    Storage.set(STORAGE_KEY, value.trim());
    updateDisplay();
  }

  function updateDisplay() {
    const name = getName();
    nameDisplay.textContent = name ? `Hi, ${name}!` : '';
  }

  function openModal() {
    nameInput.value = getName();
    modal.classList.remove('hidden');
    nameInput.focus();
  }

  function closeModal() {
    modal.classList.add('hidden');
  }

  function save() {
    const val = nameInput.value.trim();
    setName(val);
    ClockModule.tick(); // refresh greeting immediately
    closeModal();
  }

  function init() {
    updateDisplay();
    editBtn.addEventListener('click', openModal);
    saveBtn.addEventListener('click', save);
    cancelBtn.addEventListener('click', closeModal);
    backdrop.addEventListener('click', closeModal);
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') save();
      if (e.key === 'Escape') closeModal();
    });
  }

  return { init, getName };
})();

/* -----------------------------------------------
   4. FOCUS TIMER (with custom duration — Challenge)
----------------------------------------------- */
const TimerModule = (() => {
  const STORAGE_KEY_DURATION = 'dashboard_timer_duration';

  const displayEl   = document.getElementById('timer-display');
  const progressBar = document.getElementById('timer-progress-bar');
  const statusEl    = document.getElementById('timer-status');
  const startBtn    = document.getElementById('timer-start');
  const stopBtn     = document.getElementById('timer-stop');
  const resetBtn    = document.getElementById('timer-reset');
  const durationInput = document.getElementById('timer-duration');
  const card        = document.querySelector('.timer-card');

  let totalSeconds  = 0;
  let remaining     = 0;
  let intervalId    = null;
  let running       = false;

  function getDurationMinutes() {
    const val = parseInt(durationInput.value, 10);
    return isNaN(val) || val < 1 ? 25 : Math.min(val, 120);
  }

  function formatTime(secs) {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function updateDisplay() {
    displayEl.textContent = formatTime(remaining);
    const pct = totalSeconds > 0
      ? ((totalSeconds - remaining) / totalSeconds) * 100
      : 0;
    progressBar.style.width = `${pct}%`;
  }

  function setButtons(state) {
    // state: 'idle' | 'running' | 'paused' | 'done'
    startBtn.disabled = state === 'running';
    stopBtn.disabled  = state === 'idle' || state === 'done';
    startBtn.textContent = state === 'paused' ? '▶ Resume' : '▶ Start';
  }

  function finish() {
    clearInterval(intervalId);
    intervalId = null;
    running    = false;
    card.classList.remove('running');
    statusEl.textContent = '✅ Time\'s up! Great work!';
    setButtons('done');
    remaining = 0;
    updateDisplay();
  }

  function tick() {
    if (remaining <= 0) { finish(); return; }
    remaining--;
    updateDisplay();
    if (remaining <= 0) finish();
  }

  function start() {
    if (running) return;
    // If idle (not paused), reset from duration input
    if (remaining === 0 || remaining === totalSeconds) {
      const mins   = getDurationMinutes();
      totalSeconds = mins * 60;
      remaining    = totalSeconds;
      Storage.set(STORAGE_KEY_DURATION, mins);
      durationInput.value = mins;
    }
    running    = true;
    card.classList.add('running');
    statusEl.textContent = '⏱ Focusing…';
    setButtons('running');
    intervalId = setInterval(tick, 1000);
    updateDisplay();
  }

  function pause() {
    if (!running) return;
    clearInterval(intervalId);
    intervalId = null;
    running    = false;
    card.classList.remove('running');
    statusEl.textContent = '⏸ Paused';
    setButtons('paused');
  }

  function reset() {
    clearInterval(intervalId);
    intervalId = null;
    running    = false;
    card.classList.remove('running');
    const mins   = getDurationMinutes();
    totalSeconds = mins * 60;
    remaining    = totalSeconds;
    statusEl.textContent = 'Ready to focus!';
    setButtons('idle');
    updateDisplay();
  }

  function init() {
    const savedMins = Storage.get(STORAGE_KEY_DURATION, 25);
    durationInput.value = savedMins;

    const mins   = getDurationMinutes();
    totalSeconds = mins * 60;
    remaining    = totalSeconds;

    updateDisplay();
    setButtons('idle');

    startBtn.addEventListener('click', start);
    stopBtn.addEventListener('click', pause);
    resetBtn.addEventListener('click', reset);

    durationInput.addEventListener('change', () => {
      if (!running) reset();
    });
  }

  return { init };
})();

/* -----------------------------------------------
   5. TO-DO LIST
      Challenges: prevent duplicates, sort tasks
----------------------------------------------- */
const TodoModule = (() => {
  const STORAGE_KEY = 'dashboard_todos';

  const listEl      = document.getElementById('todo-list');
  const inputEl     = document.getElementById('todo-input');
  const addBtn      = document.getElementById('todo-add-btn');
  const errorEl     = document.getElementById('todo-error');
  const emptyEl     = document.getElementById('todo-empty');
  const sortSelect  = document.getElementById('sort-select');

  let todos = []; // [{ id, text, done, createdAt }]

  /* --- Persistence --- */
  function load() {
    todos = Storage.get(STORAGE_KEY, []);
  }
  function save() {
    Storage.set(STORAGE_KEY, todos);
  }

  /* --- Helpers --- */
  function isDuplicate(text) {
    return todos.some(
      (t) => t.text.trim().toLowerCase() === text.trim().toLowerCase()
    );
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
    setTimeout(() => errorEl.classList.add('hidden'), 3000);
  }

  function getSorted() {
    const mode = sortSelect.value;
    const copy = [...todos];
    if (mode === 'az')   return copy.sort((a, b) => a.text.localeCompare(b.text));
    if (mode === 'za')   return copy.sort((a, b) => b.text.localeCompare(a.text));
    if (mode === 'done') return copy.sort((a, b) => Number(a.done) - Number(b.done));
    return copy; // default: insertion order
  }

  /* --- Render --- */
  function render() {
    listEl.innerHTML = '';
    const sorted = getSorted();

    if (sorted.length === 0) {
      emptyEl.classList.remove('hidden');
      return;
    }
    emptyEl.classList.add('hidden');

    sorted.forEach((todo) => {
      const li = createTodoEl(todo);
      listEl.appendChild(li);
    });
  }

  function createTodoEl(todo) {
    const li = document.createElement('li');
    li.className = `todo-item${todo.done ? ' done' : ''}`;
    li.dataset.id = todo.id;

    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type    = 'checkbox';
    checkbox.checked = todo.done;
    checkbox.className = 'todo-item__checkbox';
    checkbox.setAttribute('aria-label', `Mark "${todo.text}" as done`);
    checkbox.addEventListener('change', () => toggleDone(todo.id));

    // Text span
    const textSpan = document.createElement('span');
    textSpan.className   = 'todo-item__text';
    textSpan.textContent = todo.text;

    // Actions container
    const actions = document.createElement('div');
    actions.className = 'todo-item__actions';

    // Edit button
    const editBtn = document.createElement('button');
    editBtn.className = 'todo-item__btn';
    editBtn.textContent = '✏️';
    editBtn.setAttribute('aria-label', `Edit "${todo.text}"`);
    editBtn.addEventListener('click', () => startEdit(todo.id, li, textSpan, actions));

    // Delete button
    const delBtn = document.createElement('button');
    delBtn.className = 'todo-item__btn todo-item__btn--delete';
    delBtn.textContent = '🗑️';
    delBtn.setAttribute('aria-label', `Delete "${todo.text}"`);
    delBtn.addEventListener('click', () => deleteTodo(todo.id));

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    li.appendChild(checkbox);
    li.appendChild(textSpan);
    li.appendChild(actions);

    return li;
  }

  /* --- Inline edit --- */
  function startEdit(id, li, textSpan, actions) {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    // Replace text span with input
    const editInput = document.createElement('input');
    editInput.type      = 'text';
    editInput.value     = todo.text;
    editInput.className = 'todo-item__edit-input';
    editInput.maxLength = 100;
    li.replaceChild(editInput, textSpan);
    editInput.focus();
    editInput.select();

    // Replace action buttons with save/cancel
    actions.innerHTML = '';

    const saveBtn = document.createElement('button');
    saveBtn.className   = 'todo-item__btn todo-item__btn--save';
    saveBtn.textContent = '✅';
    saveBtn.setAttribute('aria-label', 'Save edit');
    saveBtn.addEventListener('click', () => commitEdit(id, editInput, li));

    const cancelBtn = document.createElement('button');
    cancelBtn.className   = 'todo-item__btn';
    cancelBtn.textContent = '✖️';
    cancelBtn.setAttribute('aria-label', 'Cancel edit');
    cancelBtn.addEventListener('click', render);

    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);

    editInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter')  commitEdit(id, editInput, li);
      if (e.key === 'Escape') render();
    });
  }

  function commitEdit(id, editInput, li) {
    const newText = editInput.value.trim();
    if (!newText) { showError('Task cannot be empty.'); return; }

    const todo = todos.find((t) => t.id === id);
    // Duplicate check — allow keeping the same text
    if (
      newText.toLowerCase() !== todo.text.toLowerCase() &&
      isDuplicate(newText)
    ) {
      showError(`"${newText}" already exists in your list.`);
      return;
    }

    todo.text = newText;
    save();
    render();
  }

  /* --- Actions --- */
  function addTodo(text) {
    text = text.trim();
    if (!text) { showError('Please enter a task.'); return; }

    // Challenge: prevent duplicates
    if (isDuplicate(text)) {
      showError(`"${text}" is already in your list.`);
      return;
    }

    todos.push({
      id:        crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      text,
      done:      false,
      createdAt: Date.now(),
    });
    save();
    render();
    inputEl.value = '';
    inputEl.focus();
  }

  function toggleDone(id) {
    const todo = todos.find((t) => t.id === id);
    if (todo) { todo.done = !todo.done; save(); render(); }
  }

  function deleteTodo(id) {
    todos = todos.filter((t) => t.id !== id);
    save();
    render();
  }

  /* --- Init --- */
  function init() {
    load();
    render();

    addBtn.addEventListener('click', () => addTodo(inputEl.value));
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addTodo(inputEl.value);
    });
    sortSelect.addEventListener('change', render);
  }

  return { init };
})();

/* -----------------------------------------------
   6. QUICK LINKS
----------------------------------------------- */
const LinksModule = (() => {
  const STORAGE_KEY   = 'dashboard_links';

  const gridEl        = document.getElementById('links-grid');
  const emptyEl       = document.getElementById('links-empty');
  const nameInputEl   = document.getElementById('link-name-input');
  const urlInputEl    = document.getElementById('link-url-input');
  const addBtn        = document.getElementById('link-add-btn');
  const errorEl       = document.getElementById('link-error');

  let links = []; // [{ id, name, url }]

  /* --- Persistence --- */
  function load() { links = Storage.get(STORAGE_KEY, getDefaults()); }
  function save() { Storage.set(STORAGE_KEY, links); }

  function getDefaults() {
    return [
      { id: '1', name: 'Google',    url: 'https://google.com' },
      { id: '2', name: 'YouTube',   url: 'https://youtube.com' },
      { id: '3', name: 'GitHub',    url: 'https://github.com' },
      { id: '4', name: 'RevoU',     url: 'https://revou.co' },
    ];
  }

  /* --- Helpers --- */
  function normalizeUrl(url) {
    url = url.trim();
    if (url && !url.match(/^https?:\/\//i)) url = 'https://' + url;
    return url;
  }

  function isValidUrl(url) {
    try { new URL(url); return true; } catch { return false; }
  }

  function getFavicon(url) {
    try {
      const origin = new URL(url).origin;
      return `https://www.google.com/s2/favicons?sz=32&domain_url=${origin}`;
    } catch {
      return '';
    }
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
    setTimeout(() => errorEl.classList.add('hidden'), 3000);
  }

  /* --- Render --- */
  function render() {
    gridEl.innerHTML = '';

    if (links.length === 0) {
      emptyEl.classList.remove('hidden');
      return;
    }
    emptyEl.classList.add('hidden');

    links.forEach((link) => {
      const a = document.createElement('a');
      a.className = 'link-item';
      a.href      = link.url;
      a.target    = '_blank';
      a.rel       = 'noopener noreferrer';

      const favicon = document.createElement('img');
      favicon.src    = getFavicon(link.url);
      favicon.alt    = '';
      favicon.width  = 16;
      favicon.height = 16;
      favicon.className = 'link-item__favicon';
      favicon.onerror = () => { favicon.style.display = 'none'; };

      const nameSpan = document.createElement('span');
      nameSpan.textContent = link.name;

      const delBtn = document.createElement('button');
      delBtn.className   = 'link-item__delete';
      delBtn.textContent = '✕';
      delBtn.setAttribute('aria-label', `Remove ${link.name}`);
      delBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        deleteLink(link.id);
      });

      a.appendChild(favicon);
      a.appendChild(nameSpan);
      a.appendChild(delBtn);
      gridEl.appendChild(a);
    });
  }

  /* --- Actions --- */
  function addLink() {
    const name = nameInputEl.value.trim();
    const url  = normalizeUrl(urlInputEl.value);

    if (!name) { showError('Please enter a name for the link.'); nameInputEl.focus(); return; }
    if (!url)  { showError('Please enter a URL.'); urlInputEl.focus(); return; }
    if (!isValidUrl(url)) { showError('Please enter a valid URL (e.g. https://example.com).'); urlInputEl.focus(); return; }

    links.push({
      id:   crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      name,
      url,
    });
    save();
    render();
    nameInputEl.value = '';
    urlInputEl.value  = '';
    nameInputEl.focus();
  }

  function deleteLink(id) {
    links = links.filter((l) => l.id !== id);
    save();
    render();
  }

  /* --- Init --- */
  function init() {
    load();
    render();

    addBtn.addEventListener('click', addLink);
    urlInputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addLink();
    });
    nameInputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') urlInputEl.focus();
    });
  }

  return { init };
})();

/* -----------------------------------------------
   BOOTSTRAP — init all modules
----------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  ThemeModule.init();
  NameModule.init();   // must come before ClockModule so getName() works
  ClockModule.init();
  TimerModule.init();
  TodoModule.init();
  LinksModule.init();
});
