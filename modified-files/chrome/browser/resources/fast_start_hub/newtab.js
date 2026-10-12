'use strict';

const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : (JSON.parse(raw) ?? fallback);
    } catch { return fallback; }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      showSaved();
      return true;
    } catch {
      const node = document.getElementById('saveState');
      if (node) node.textContent = 'Storage full: export your data';
      return false;
    }
  },
};

const defaults = {
  theme: 'dark',
  wallpaper: 'brand',
  tasks: [],
  links: [
    {name:'ChatGPT', url:'https://chatgpt.com'},
    {name:'Gmail', url:'https://mail.google.com'},
    {name:'YouTube', url:'https://youtube.com'}
  ],
  notes: '',
  order: ['clock','weather','world','focus','links','tasks','notes'],
  hidden: [],
  sizes: {clock:'small', weather:'small', world:'small', focus:'small', links:'medium', tasks:'medium', notes:'medium'},
  zones: ['Asia/Dubai','Europe/London','America/New_York'],
  weather: null,
  focusMinutes: 25,
  layoutVersion: 5,
};

const widgetIds = [...defaults.order];
const widgetNames = {clock:'Local time',weather:'Weather',world:'World clocks',focus:'Focus',links:'Quick links',tasks:'Tasks',notes:'Notes'};
const allowedSizes = ['small','medium','large','full'];
const timezones = [
  ['UTC','UTC'],

  ['Asia/Dubai','Dubai'],
  ['Asia/Dubai','Abu Dhabi'],
  ['Asia/Tehran','Tehran'],
  ['Asia/Riyadh','Riyadh'],
  ['Asia/Qatar','Doha'],
  ['Asia/Kuwait','Kuwait City'],
  ['Asia/Bahrain','Manama'],
  ['Asia/Muscat','Muscat'],
  ['Asia/Baghdad','Baghdad'],
  ['Asia/Jerusalem','Jerusalem'],
  ['Asia/Beirut','Beirut'],
  ['Asia/Amman','Amman'],

  ['Europe/Athens','Athens'],
  ['Europe/London','London'],
  ['Europe/Paris','Paris'],
  ['Europe/Berlin','Berlin'],
  ['Europe/Rome','Rome'],
  ['Europe/Madrid','Madrid'],
  ['Europe/Amsterdam','Amsterdam'],
  ['Europe/Brussels','Brussels'],
  ['Europe/Vienna','Vienna'],
  ['Europe/Zurich','Zurich'],
  ['Europe/Prague','Prague'],
  ['Europe/Warsaw','Warsaw'],
  ['Europe/Budapest','Budapest'],
  ['Europe/Bucharest','Bucharest'],
  ['Europe/Helsinki','Helsinki'],
  ['Europe/Stockholm','Stockholm'],
  ['Europe/Oslo','Oslo'],
  ['Europe/Copenhagen','Copenhagen'],
  ['Europe/Dublin','Dublin'],
  ['Europe/Lisbon','Lisbon'],
  ['Europe/Istanbul','Istanbul'],
  ['Europe/Moscow','Moscow'],

  ['Asia/Kolkata','New Delhi'],
  ['Asia/Kolkata','Mumbai'],
  ['Asia/Kolkata','Kolkata'],
  ['Asia/Karachi','Karachi'],
  ['Asia/Dhaka','Dhaka'],
  ['Asia/Kathmandu','Kathmandu'],
  ['Asia/Colombo','Colombo'],

  ['Asia/Bangkok','Bangkok'],
  ['Asia/Singapore','Singapore'],
  ['Asia/Kuala_Lumpur','Kuala Lumpur'],
  ['Asia/Jakarta','Jakarta'],
  ['Asia/Manila','Manila'],
  ['Asia/Hong_Kong','Hong Kong'],
  ['Asia/Shanghai','Beijing'],
  ['Asia/Shanghai','Shanghai'],
  ['Asia/Taipei','Taipei'],
  ['Asia/Seoul','Seoul'],
  ['Asia/Tokyo','Tokyo'],

  ['Australia/Sydney','Sydney'],
  ['Australia/Melbourne','Melbourne'],
  ['Australia/Brisbane','Brisbane'],
  ['Australia/Perth','Perth'],
  ['Pacific/Auckland','Auckland'],

  ['Africa/Cairo','Cairo'],
  ['Africa/Johannesburg','Johannesburg'],
  ['Africa/Nairobi','Nairobi'],
  ['Africa/Casablanca','Casablanca'],
  ['Africa/Lagos','Lagos'],
  ['Africa/Accra','Accra'],
  ['Africa/Addis_Ababa','Addis Ababa'],

  ['America/New_York','New York'],
  ['America/Chicago','Chicago'],
  ['America/Denver','Denver'],
  ['America/Los_Angeles','Los Angeles'],
  ['America/Toronto','Toronto'],
  ['America/Vancouver','Vancouver'],
  ['America/Miami','Miami'],
  ['America/Mexico_City','Mexico City'],
  ['America/Sao_Paulo','São Paulo'],
  ['America/Argentina/Buenos_Aires','Buenos Aires'],
  ['America/Santiago','Santiago'],
  ['America/Lima','Lima'],
  ['America/Bogota','Bogotá']
];


function safeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Enter a web address.');
  let text = value.trim();
  if (!/^https?:\/\//i.test(text)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(text) && !/^localhost:\d+/i.test(text)) {
      throw new Error('Only HTTP and HTTPS links are allowed.');
    }
    text = `https://${text}`;
  }
  const url = new URL(text);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Use a web address without embedded credentials.');
  }
  return url.href;
}
function cleanTasks(value) {
  return (Array.isArray(value) ? value : []).filter(t => t && typeof t.text === 'string')
    .slice(0, 500).map(t => ({text: t.text.slice(0, 160), done: t.done === true}));
}
function cleanLinks(value) {
  return (Array.isArray(value) ? value : defaults.links).slice(0, 100).flatMap(link => {
    try { return [{name: String(link.name || 'Website').slice(0, 40), url: safeUrl(link.url)}]; }
    catch { return []; }
  });
}
function cleanOrder(value) {
  return [...new Set([...(Array.isArray(value) ? value : []), ...widgetIds])].filter(id => widgetIds.includes(id));
}
function cleanSizes(value) {
  const result = {...defaults.sizes};
  if (value && typeof value === 'object') widgetIds.forEach(id => {
    if (allowedSizes.includes(value[id])) result[id] = value[id];
  });
  return result;
}
const timezoneKey = ([zone,name]) => `${zone}::${name}`;

function resolveTimezoneEntry(value) {
  if (typeof value !== 'string') return null;
  return timezones.find((entry) => timezoneKey(entry) === value) ||
         timezones.find(([zone]) => zone === value) ||
         null;
}

function cleanZones(value) {
  return defaults.zones.map((fallback, i) => {
    const requested = Array.isArray(value) ? value[i] : null;
    const entry = resolveTimezoneEntry(requested) || resolveTimezoneEntry(fallback);
    return entry ? timezoneKey(entry) : timezoneKey(timezones[i]);
  });
}
function cleanWeather(value) {
  if (!value || typeof value !== 'object' || typeof value.city !== 'string' ||
      !Number.isFinite(value.latitude) || Math.abs(value.latitude) > 90 ||
      !Number.isFinite(value.longitude) || Math.abs(value.longitude) > 180) return null;
  return {city: value.city.slice(0, 80), country: String(value.country || '').slice(0, 80),
    latitude: value.latitude, longitude: value.longitude, timezone: 'auto'};
}
const rawTheme = store.get('fast.theme', defaults.theme);
const rawWallpaper = store.get('fast.wallpaper', defaults.wallpaper);
const rawTextColorMode = store.get('fast.textColorMode', 'auto');
const rawTextColorCustom = store.get('fast.textColorCustom', '#ffffff');
const rawHidden = store.get('fast.hiddenWidgets', []);
const state = {
  theme: ['dark','light','system'].includes(rawTheme) ? rawTheme : 'dark',
  wallpaper: ['brand','gradient','plain'].includes(rawWallpaper) ? rawWallpaper : 'brand',
  textColorMode:
      ['auto','white','gray','blue','green','custom'].includes(rawTextColorMode)
          ? rawTextColorMode : 'auto',
  textColorCustom:
      /^#[0-9a-f]{6}$/i.test(rawTextColorCustom)
          ? rawTextColorCustom : '#ffffff',
  tasks: cleanTasks(store.get('fast.tasks', [])),
  links: cleanLinks(store.get('fast.links', defaults.links)),
  notes: String(store.get('fast.notes', '')).slice(0, 12000),
  order: cleanOrder(store.get('fast.widgetOrder', defaults.order)),
  hidden: new Set((Array.isArray(rawHidden) ? rawHidden : []).filter(id => widgetIds.includes(id))),
  sizes: cleanSizes(store.get('fast.widgetSizes', defaults.sizes)),
  zones: cleanZones(store.get('fast.zones', defaults.zones)),
  weather: cleanWeather(store.get('fast.weather', null)),
  focusMinutes: Math.min(90, Math.max(5, Math.round(Number(store.get('fast.focusMinutes', 25)) || 25))),
  focusRemaining: null, focusRunning: false, focusTimer: null,
};

const $ = (id) => document.getElementById(id);
const body = document.body;
let savedTimer = null;
function showSaved() {
  const node = $('saveState');
  if (!node) return;
  node.textContent = 'Saved';
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => { node.textContent = 'Saved locally'; }, 1100);
}

function resolvedTheme() {
  if (state.theme !== 'system') return state.theme;
  return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}
function applyTheme() {
  const theme = resolvedTheme();
  body.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  body.dataset.wallpaper = state.wallpaper;
  $('themeSelect').value = state.theme;
  $('wallpaperSelect').value = state.wallpaper;
  const textColors = {
    white: '#ffffff',
    gray: '#d9e1e8',
    blue: '#9fd4ff',
    green: '#a9e8c5'
  };

  const selectedTextColor =
      state.textColorMode === 'custom'
          ? state.textColorCustom
          : textColors[state.textColorMode];

  if (selectedTextColor) {
    body.style.setProperty('--text', selectedTextColor);
    body.style.setProperty(
        '--muted',
        `color-mix(in srgb, ${selectedTextColor} 72%, transparent)`
    );
    body.dataset.userTextColor = 'true';
  } else {
    body.style.removeProperty('--text');
    body.style.removeProperty('--muted');
    delete body.dataset.userTextColor;
  }

  $('textColorSelect').value = state.textColorMode;
  $('textColorCustom').value = state.textColorCustom;
  $('textColorCustomRow').hidden =
      state.textColorMode !== 'custom';
  $('brandLogo').src = resolvedTheme() === 'dark' ? 'assets/logo-white.png' : 'assets/logo-dark.png';
}
matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { if (state.theme === 'system') applyTheme(); });

function tickClocks() {
  const now = new Date();
  $('clockTime').textContent = new Intl.DateTimeFormat(undefined,{hour:'2-digit',minute:'2-digit'}).format(now);
  $('clockDate').textContent = new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric'}).format(now);
  renderWorldClocks(now);
}
function renderWorldClocks(now = new Date()) {
  const wrap = $('worldClocks');
  wrap.textContent = '';
  state.zones.forEach((entryKey) => {
    const meta = resolveTimezoneEntry(entryKey);
    const zone = meta ? meta[0] : String(entryKey).split('::')[0];
    const label = meta ? meta[1] : zone;
    const row = document.createElement('div'); row.className = 'world-row';
    const name = document.createElement('span'); name.textContent = label;
    const time = document.createElement('span'); time.className = 'world-time';
    try { time.textContent = new Intl.DateTimeFormat(undefined,{timeZone:zone,hour:'2-digit',minute:'2-digit'}).format(now); }
    catch { time.textContent = '--:--'; }
    row.append(name,time); wrap.append(row);
  });
}

function looksLikeUrl(text) {
  return /^https?:\/\//i.test(text) || /^localhost(?::\d+)?(?:\/|$)/i.test(text) || /^[^\s]+\.[^\s]+/.test(text);
}
$('searchForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = $('searchInput').value.trim();
  if (!text) return;
  if (looksLikeUrl(text)) {
    try { location.href = safeUrl(text); } catch (err) { alert(err.message); }
    return;
  }
  if (globalThis.chrome?.search?.query) {
    try { await chrome.search.query({text, disposition:'CURRENT_TAB'}); }
    catch { alert('Search failed. Check the default search engine in browser settings.'); }
  }
});
$('brandButton').addEventListener('click', () => $('searchInput').focus());
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault(); $('searchInput').focus(); $('searchInput').select();
  } else if (e.key === '/' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) {
    e.preventDefault(); $('searchInput').focus();
  }
});

function renderTasks() {
  const list = $('taskList'); list.textContent = '';
  const openCount = state.tasks.filter((t) => !t.done).length;
  $('taskCount').textContent = state.tasks.length ? String(openCount) : '';
  $('clearCompleted').hidden = !state.tasks.some((t) => t.done);
  state.tasks.forEach((task,index) => {
    const li = document.createElement('li'); li.className = `task-item${task.done?' done':''}`;
    const check = document.createElement('input'); check.type='checkbox'; check.checked=!!task.done; check.title='Mark complete';
    check.addEventListener('change',()=>{state.tasks[index].done=check.checked;store.set('fast.tasks',state.tasks);renderTasks();});
    const label = document.createElement('span'); label.className='task-label'; label.textContent=task.text;
    const edit = document.createElement('button'); edit.className='task-edit'; edit.type='button'; edit.textContent='✎'; edit.title='Edit task';
    edit.addEventListener('click',()=>{
      const next = prompt('Edit task', task.text);
      if (next === null) return;
      const text = next.trim();
      if (!text) return;
      state.tasks[index].text = text.slice(0,160); store.set('fast.tasks',state.tasks); renderTasks();
    });
    const del = document.createElement('button'); del.className='delete-task'; del.type='button'; del.textContent='×'; del.title='Delete task';
    del.addEventListener('click',()=>{state.tasks.splice(index,1);store.set('fast.tasks',state.tasks);renderTasks();});
    li.append(check,label,edit,del); list.append(li);
  });
}
$('taskForm').addEventListener('submit',(e)=>{
  e.preventDefault(); const input=$('taskInput'); const text=input.value.trim(); if(!text)return;
  state.tasks.unshift({text:text.slice(0,160),done:false}); store.set('fast.tasks',state.tasks); input.value=''; renderTasks();
});
$('clearCompleted').addEventListener('click',()=>{state.tasks=state.tasks.filter((t)=>!t.done);store.set('fast.tasks',state.tasks);renderTasks();});

function normalizeUrl(value) { return safeUrl(value); }
function renderLinks() {
  const box=$('quickLinks'); box.textContent='';
  state.links.forEach((link,index)=>{
    const a=document.createElement('a'); a.className='quick-link'; a.href=link.url;
    const badge=document.createElement('span'); badge.className='link-badge';
    const fallback=document.createElement('span'); fallback.textContent=(link.name||'?').slice(0,1).toUpperCase(); badge.append(fallback);
    const name=document.createElement('span'); name.className='link-name'; name.textContent=link.name;
    const del=document.createElement('button'); del.className='link-remove'; del.type='button'; del.textContent='×'; del.title='Remove shortcut';
    del.addEventListener('click',(e)=>{e.preventDefault();e.stopPropagation();state.links.splice(index,1);store.set('fast.links',state.links);renderLinks();});
    a.append(badge,name,del); box.append(a);
  });
}
$('addLinkButton').addEventListener('click',()=>$('linkDialog').showModal());
$('linkForm').addEventListener('submit',(e)=>{
  if(e.submitter?.value==='cancel')return;
  e.preventDefault();
  const name=$('linkName').value.trim(), raw=$('linkUrl').value.trim(); if(!name||!raw)return;
  let url; try { url = normalizeUrl(raw); } catch (err) { alert(err.message); return; }
  state.links.push({name,url}); store.set('fast.links',state.links); renderLinks(); e.target.reset(); $('linkDialog').close();
});

$('notes').value=state.notes;
$('notesCount').textContent=String(state.notes.length);
let noteTimer=null;
$('notes').addEventListener('input',()=>{
  state.notes=$('notes').value; $('notesCount').textContent=String(state.notes.length);
  clearTimeout(noteTimer); noteTimer=setTimeout(()=>store.set('fast.notes',state.notes),220);
});

function buildSettings() {
  const toggles=$('widgetToggles'); toggles.textContent='';
  const sizes=$('sizeControls'); sizes.textContent='';
  widgetIds.forEach((id)=>{
    const lab=document.createElement('label'); lab.className='toggle-item';
    const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=!state.hidden.has(id); cb.dataset.widgetToggle=id;
    cb.addEventListener('change',()=>{
      const w=document.querySelector(`[data-widget="${id}"]`); w.hidden=!cb.checked;
      if(cb.checked)state.hidden.delete(id); else state.hidden.add(id);
      store.set('fast.hiddenWidgets',[...state.hidden]);
    });
    lab.append(cb,document.createTextNode(widgetNames[id])); toggles.append(lab);

    const row=document.createElement('label'); row.className='size-row'; const span=document.createElement('span'); span.textContent=widgetNames[id];
    const sel=document.createElement('select');
    allowedSizes.forEach((size)=>{const op=document.createElement('option');op.value=size;op.textContent=size[0].toUpperCase()+size.slice(1);sel.append(op);});
    sel.value=state.sizes[id]||'medium'; sel.addEventListener('change',()=>{state.sizes[id]=sel.value;store.set('fast.widgetSizes',state.sizes);applyWidgetState();});
    row.append(span,sel); sizes.append(row);
  });

  let timezoneList=$('fastTimezoneOptions');
  if(!timezoneList){
    timezoneList=document.createElement('datalist');
    timezoneList.id='fastTimezoneOptions';

    timezones.forEach((entry)=>{
      const op=document.createElement('option');
      op.value=entry[1];
      op.label=entry[0];
      timezoneList.append(op);
    });

    document.body.append(timezoneList);
  }

  document.querySelectorAll('.tz-select').forEach((sel)=>{
    const idx=Number(sel.dataset.tzIndex);
    const fallbackEntry=timezones[idx]||timezones[0];
    const current=resolveTimezoneEntry(state.zones[idx])||fallbackEntry;

    const input=document.createElement('input');
    input.type='search';
    input.className='tz-search';
    input.setAttribute('list','fastTimezoneOptions');
    input.placeholder='Search city';
    input.autocomplete='off';
    input.value=current[1];

    const applyCity=()=>{
      const wanted=input.value.trim().toLocaleLowerCase();
      const entry=timezones.find((item)=>
        item[1].toLocaleLowerCase()===wanted
      );

      if(!entry){
        const existing=resolveTimezoneEntry(state.zones[idx])||fallbackEntry;
        input.value=existing[1];
        return;
      }

      state.zones[idx]=timezoneKey(entry);
      store.set('fast.zones',state.zones);
      input.value=entry[1];
      renderWorldClocks();
    };

    input.addEventListener('change',applyCity);

    input.addEventListener('keydown',(event)=>{
      if(event.key==='Enter'){
        event.preventDefault();
        applyCity();
        input.blur();
      }
    });

    sel.replaceWith(input);
  });
  $('focusMinutes').value=state.focusMinutes;
  if(state.weather?.city) $('weatherCityInput').value=state.weather.city;
}
$('settingsButton').addEventListener('click',()=>{$('settingsPanel').hidden=!$('settingsPanel').hidden;});
$('closeSettings').addEventListener('click',()=>{$('settingsPanel').hidden=true;});
$('themeSelect').addEventListener('change',()=>{state.theme=$('themeSelect').value;store.set('fast.theme',state.theme);applyTheme();});
$('wallpaperSelect').addEventListener('change',()=>{state.wallpaper=$('wallpaperSelect').value;store.set('fast.wallpaper',state.wallpaper);applyTheme();});
$('textColorSelect').addEventListener('change',()=>{
  state.textColorMode=$('textColorSelect').value;
  store.set('fast.textColorMode',state.textColorMode);
  applyTheme();

  if(state.textColorMode==='custom'){
    $('textColorCustom').focus();
  }
});

$('textColorCustom').addEventListener('input',()=>{
  const value=$('textColorCustom').value;

  if(/^#[0-9a-f]{6}$/i.test(value)){
    state.textColorCustom=value;
    store.set('fast.textColorCustom',value);

    if(state.textColorMode==='custom'){
      applyTheme();
    }
  }
});

function applyWidgetState() {
  const normalized = state.order.filter((id)=>widgetIds.includes(id));
  widgetIds.forEach((id)=>{if(!normalized.includes(id))normalized.push(id);});
  state.order=[...new Set(normalized)];
  state.order.forEach((id)=>{const w=document.querySelector(`[data-widget="${id}"]`);if(w)$('widgetGrid').append(w);});
  widgetIds.forEach((id)=>{
    const w=document.querySelector(`[data-widget="${id}"]`); if(!w)return;
    w.hidden=state.hidden.has(id); w.classList.remove('size-small','size-medium','size-large','size-full');
    w.classList.add(`size-${allowedSizes.includes(state.sizes[id])?state.sizes[id]:'medium'}`);
  });
}

let dragging = null;
let menuWidget = null;
let menuTrigger = null;
let pointerDrag = null;
function persistWidgetOrder() {
  state.order = [...$('widgetGrid').querySelectorAll('.widget')].map(w => w.dataset.widget);
  store.set('fast.widgetOrder', state.order);
}
function moveWidget(id, delta) {
  const visible = state.order.filter(x => !state.hidden.has(x));
  const from = visible.indexOf(id), to = from + delta;
  if (from < 0 || to < 0 || to >= visible.length) return;
  const target = visible[to];
  const copy = state.order.filter(x => x !== id);
  copy.splice(copy.indexOf(target) + (delta > 0 ? 1 : 0), 0, id);
  state.order = copy;
  store.set('fast.widgetOrder', copy); applyWidgetState();
}
function closeWidgetMenu(restoreFocus = false) {
  $('widgetMenu').hidden = true;
  if (menuTrigger) menuTrigger.setAttribute('aria-expanded', 'false');
  if (restoreFocus && menuTrigger && !menuTrigger.closest('.widget').hidden) menuTrigger.focus();
  menuWidget = null; menuTrigger = null;
}
function openWidgetMenu(button, widget) {
  closeWidgetMenu();
  menuWidget = widget; menuTrigger = button;
  const menu = $('widgetMenu');
  const id = widget.dataset.widget;
  const current = state.sizes[id] || defaults.sizes[id];
  button.setAttribute('aria-expanded', 'true');
  menu.querySelectorAll('[data-widget-action^="size-"]').forEach(b => {
    b.classList.toggle('is-current', b.dataset.widgetAction === `size-${current}`);
  });
  const visible = state.order.filter(x => !state.hidden.has(x));
  menu.querySelector('[data-widget-action="move-left"]').disabled = visible.indexOf(id) <= 0;
  menu.querySelector('[data-widget-action="move-right"]').disabled = visible.indexOf(id) === visible.length - 1;
  menu.hidden = false;
  const r = button.getBoundingClientRect(), m = menu.getBoundingClientRect();
  menu.style.left = `${Math.max(8, Math.min(r.right - m.width, innerWidth - m.width - 8))}px`;
  menu.style.top = `${r.bottom + 6 + m.height <= innerHeight - 8 ? r.bottom + 6 : Math.max(8, r.top - m.height - 6)}px`;
  menu.querySelector('button:not(:disabled)').focus();
}
function endPointerDrag(commit = false) {
  if (!pointerDrag) return;
  const {widget, target, after, handle, pointerId, moved} = pointerDrag;
  pointerDrag = null;
  if (commit && moved && target && target !== widget) {
    $('widgetGrid').insertBefore(widget, after ? target.nextSibling : target);
    persistWidgetOrder();
  }
  document.querySelectorAll('.widget').forEach(w => w.classList.remove('dragging','drag-over','drop-before','drop-after'));
  if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
  dragging = null;
}
document.querySelectorAll('.widget').forEach(widget => {
  widget.draggable = false;
  const handle = widget.querySelector('.widget-drag-handle');
  const menu = widget.querySelector('.widget-menu-button');
  handle.title = 'Drag to reorder; Alt + arrow keys also move this widget';
  handle.addEventListener('pointerdown', e => {
    if (e.button !== 0 || !e.isPrimary) return;
    e.preventDefault(); closeWidgetMenu();
    handle.focus(); handle.setPointerCapture(e.pointerId);
    pointerDrag = {widget, handle, pointerId: e.pointerId, x:e.clientX, y:e.clientY, moved:false, target:null, after:false};
  });
  handle.addEventListener('pointermove', e => {
    if (!pointerDrag || pointerDrag.handle !== handle || e.pointerId !== pointerDrag.pointerId) return;
    if (!pointerDrag.moved && Math.hypot(e.clientX-pointerDrag.x, e.clientY-pointerDrag.y) < 6) return;
    pointerDrag.moved = true; dragging = widget; widget.classList.add('dragging');
    document.querySelectorAll('.widget').forEach(w => w.classList.remove('drag-over','drop-before','drop-after'));
    const target = document.elementFromPoint(e.clientX,e.clientY)?.closest('.widget');
    pointerDrag.target = target && target !== widget && !target.hidden ? target : null;
    if (pointerDrag.target) {
      const r = target.getBoundingClientRect();
      const nearMiddle = e.clientY > r.top + r.height*.2 && e.clientY < r.bottom - r.height*.2;
      pointerDrag.after = nearMiddle ? e.clientX > r.left+r.width/2 : e.clientY > r.top+r.height/2;
      target.classList.add('drag-over', pointerDrag.after ? 'drop-after' : 'drop-before');
    }
    if (e.clientY < 40) window.scrollBy(0,-10);
    else if (e.clientY > innerHeight-40) window.scrollBy(0,10);
  });
  handle.addEventListener('pointerup', () => endPointerDrag(true));
  handle.addEventListener('pointercancel', () => endPointerDrag(false));
  handle.addEventListener('lostpointercapture', () => endPointerDrag(false));
  handle.addEventListener('keydown', e => {
    if (e.altKey && ['ArrowLeft','ArrowUp','ArrowRight','ArrowDown'].includes(e.key)) {
      e.preventDefault(); moveWidget(widget.dataset.widget, ['ArrowLeft','ArrowUp'].includes(e.key) ? -1 : 1); handle.focus();
    }
  });
  menu.addEventListener('click', e => {
    e.stopPropagation();
    if (menuWidget === widget && !$('widgetMenu').hidden) closeWidgetMenu(true);
    else openWidgetMenu(menu, widget);
  });
});
$('widgetMenu').addEventListener('click', e => {
  const button = e.target.closest('[data-widget-action]');
  if (!button || button.disabled || !menuWidget) return;
  const id = menuWidget.dataset.widget, action = button.dataset.widgetAction;
  if (action === 'move-left') moveWidget(id,-1);
  else if (action === 'move-right') moveWidget(id,1);
  else if (action === 'hide') {state.hidden.add(id);store.set('fast.hiddenWidgets',[...state.hidden]);applyWidgetState();buildSettings();}
  else if (action.startsWith('size-') && allowedSizes.includes(action.slice(5))) {
    state.sizes[id] = action.slice(5); store.set('fast.widgetSizes',state.sizes); applyWidgetState();buildSettings();
  }
  closeWidgetMenu(true);
});
$('widgetMenu').addEventListener('keydown', e => {
  const buttons = [...$('widgetMenu').querySelectorAll('button:not(:disabled)')];
  const index = buttons.indexOf(document.activeElement);
  if (['ArrowDown','ArrowUp','Home','End'].includes(e.key)) {
    e.preventDefault();
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length-1 : (index+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;
    buttons[next].focus();
  }
  if (e.key === 'Tab') closeWidgetMenu();
});
document.addEventListener('click', e => {if (!$('widgetMenu').hidden && !e.target.closest('#widgetMenu') && !e.target.closest('.widget-menu-button')) closeWidgetMenu();});
document.addEventListener('keydown', e => {if(e.key==='Escape') {closeWidgetMenu(true);endPointerDrag(false);}});
window.addEventListener('resize', () => closeWidgetMenu());
window.addEventListener('blur', () => endPointerDrag(false));
document.addEventListener('scroll', e => {if (!e.target.closest?.('#widgetMenu')) closeWidgetMenu();},true);
$('resetLayout').addEventListener('click',()=>{
  state.order=[...defaults.order]; state.hidden=new Set(); state.sizes={...defaults.sizes};
  store.set('fast.widgetOrder',state.order); store.set('fast.hiddenWidgets',[]); store.set('fast.widgetSizes',state.sizes);
  applyWidgetState(); buildSettings();
});

let focusEndAt=null;
function updateFocusDisplay() {
  const total=Math.max(1,state.focusMinutes*60);
  const remaining=state.focusRemaining ?? total;
  const m=Math.floor(remaining/60), s=remaining%60;
  $('focusTime').textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  const pct=Math.min(100,Math.max(0,100*(1-remaining/total)));
  $('focusProgress').style.width=`${pct}%`;
}
function stopFocus() {
  clearInterval(state.focusTimer); state.focusTimer=null; state.focusRunning=false; focusEndAt=null; $('focusToggle').textContent='Start';
}
function resetFocus() { stopFocus(); state.focusRemaining=state.focusMinutes*60; updateFocusDisplay(); }
function tickFocus() {
  if(!state.focusRunning||!focusEndAt)return;
  state.focusRemaining=Math.max(0,Math.ceil((focusEndAt-Date.now())/1000)); updateFocusDisplay();
  if(state.focusRemaining<=0){ stopFocus(); $('focusToggle').textContent='Done'; document.title='Focus complete — Fast Krozer'; setTimeout(()=>{document.title='Fast Krozer';},4000); }
}
$('focusToggle').addEventListener('click',()=>{
  if(state.focusRunning){ stopFocus(); return; }
  if(!state.focusRemaining || state.focusRemaining<=0) state.focusRemaining=state.focusMinutes*60;
  focusEndAt=Date.now()+state.focusRemaining*1000; state.focusRunning=true; $('focusToggle').textContent='Pause';
  clearInterval(state.focusTimer); state.focusTimer=setInterval(tickFocus,250); tickFocus();
});
$('focusReset').addEventListener('click',resetFocus);
$('focusMinutes').addEventListener('change',()=>{
  const n=Math.min(90,Math.max(5,Number($('focusMinutes').value)||25)); state.focusMinutes=n; store.set('fast.focusMinutes',n); resetFocus();
});

const weatherCodes = new Map([
  [0,['☀','Clear']], [1,['◔','Mostly clear']], [2,['◑','Partly cloudy']], [3,['☁','Overcast']],
  [45,['≋','Fog']], [48,['≋','Rime fog']], [51,['⋰','Light drizzle']], [53,['⋰','Drizzle']], [55,['⋰','Heavy drizzle']],
  [61,['☂','Light rain']], [63,['☂','Rain']], [65,['☂','Heavy rain']], [71,['✦','Light snow']], [73,['✦','Snow']], [75,['✦','Heavy snow']],
  [80,['☂','Rain showers']], [81,['☂','Rain showers']], [82,['☂','Heavy showers']], [85,['✦','Snow showers']], [86,['✦','Heavy snow showers']],
  [95,['ϟ','Thunderstorm']], [96,['ϟ','Thunderstorm with hail']], [99,['ϟ','Severe thunderstorm']]
]);
function weatherLabel(code){return weatherCodes.get(Number(code)) || ['○','Weather'];}
async function configureWeather(city) {
  const status=$('weatherStatus'); status.textContent='Finding city…';
  try {
    const geoUrl=`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
    const geo=await fetch(geoUrl,{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(10000)}).then((r)=>{if(!r.ok)throw new Error('City lookup failed');return r.json();});
    if(!geo.results?.length)throw new Error('City not found');
    const place=geo.results[0];
    state.weather={city:place.name,country:place.country||'',latitude:place.latitude,longitude:place.longitude,timezone:place.timezone||'auto'};
    store.set('fast.weather',state.weather); $('weatherCityInput').value=state.weather.city; status.textContent=`Using ${state.weather.city}${state.weather.country?', '+state.weather.country:''}.`;
    await refreshWeather();
  } catch(err) { status.textContent=err?.message||'Unable to set weather city.'; }
}
async function refreshWeather() {
  if(!state.weather){$('weatherEmpty').hidden=false;$('weatherData').hidden=true;return;}
  const {latitude,longitude,city,country}=state.weather;
  try {
    const url=`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&temperature_unit=celsius&timezone=auto&forecast_days=1`;
    const data=await fetch(url,{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(10000)}).then((r)=>{if(!r.ok)throw new Error('Forecast unavailable');return r.json();});
    const temp=Math.round(data.current?.temperature_2m); const code=data.current?.weather_code;
    const [icon,label]=weatherLabel(code);
    const hi=Math.round(data.daily?.temperature_2m_max?.[0]); const lo=Math.round(data.daily?.temperature_2m_min?.[0]);
    $('weatherIcon').textContent=icon; $('weatherTemp').textContent=Number.isFinite(temp)?`${temp}°`:'--°'; $('weatherCondition').textContent=label;
    $('weatherCity').textContent=city; $('weatherCity').title=`${city}${country?`, ${country}`:''}`; $('weatherRange').textContent=(Number.isFinite(hi)&&Number.isFinite(lo))?`H ${hi}°  •  L ${lo}°`:'--';
    $('weatherUpdated').textContent=`Updated ${new Intl.DateTimeFormat(undefined,{hour:'2-digit',minute:'2-digit'}).format(new Date())}`;
    $('weatherEmpty').hidden=true; $('weatherData').hidden=false;
  } catch(err) {
    $('weatherEmpty').hidden=false; $('weatherData').hidden=true; $('weatherEmpty').querySelector('div:nth-child(2)').textContent=err?.message||'Weather unavailable.';
  }
}
$('weatherSetupButton').addEventListener('click',()=>{$('settingsPanel').hidden=false;$('weatherCityInput').focus();});
$('weatherForm').addEventListener('submit',async(e)=>{e.preventDefault();const city=$('weatherCityInput').value.trim();if(city)await configureWeather(city);});
$('weatherRefresh').addEventListener('click',refreshWeather);

function exportHubData(){
  const data={version:1,exportedAt:new Date().toISOString(),theme:state.theme,wallpaper:state.wallpaper,textColorMode:state.textColorMode,textColorCustom:state.textColorCustom,tasks:state.tasks,links:state.links,notes:state.notes,order:state.order,hidden:[...state.hidden],sizes:state.sizes,zones:state.zones,weather:state.weather,focusMinutes:state.focusMinutes};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='fast-start-hub-settings.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('exportSettings').addEventListener('click',exportHubData);
$('importSettings').addEventListener('click',()=>$('importFile').click());
$('importFile').addEventListener('change',async()=>{
  const file=$('importFile').files?.[0]; if(!file)return;
  try {
    if(file.size > 1000000) throw new Error('File too large');
    const data=JSON.parse(await file.text());
    if(!data || typeof data!=='object' || Array.isArray(data) || data.version!==1) throw new Error('Invalid format');
    if(data.links!==undefined && (!Array.isArray(data.links) || data.links.length>100 || data.links.some(l=>!l || typeof l.name!=='string' || typeof l.url!=='string'))) throw new Error('Invalid links');
    if(data.links) data.links=data.links.map(l=>({name:l.name.slice(0,40),url:safeUrl(l.url)}));
    if(data.tasks!==undefined && (!Array.isArray(data.tasks) || data.tasks.length>500 || data.tasks.some(t=>!t || typeof t.text!=='string' || typeof t.done!=='boolean'))) throw new Error('Invalid tasks');
    if(data.tasks) data.tasks=cleanTasks(data.tasks);
    if(data.order) data.order=cleanOrder(data.order);
    if(data.sizes) data.sizes=cleanSizes(data.sizes);
    if(data.zones) data.zones=cleanZones(data.zones);
    if(data.weather) {data.weather=cleanWeather(data.weather);if(!data.weather)throw new Error('Invalid weather city');}

    if(data.theme&&['dark','light','system'].includes(data.theme)){state.theme=data.theme;store.set('fast.theme',data.theme);}
    if(data.wallpaper&&['brand','gradient','plain'].includes(data.wallpaper)){state.wallpaper=data.wallpaper;store.set('fast.wallpaper',data.wallpaper);}
    if(data.textColorMode &&
       ['auto','white','gray','blue','green','custom'].includes(data.textColorMode)){
      state.textColorMode=data.textColorMode;
      store.set('fast.textColorMode',data.textColorMode);
    }

    if(typeof data.textColorCustom==='string' &&
       /^#[0-9a-f]{6}$/i.test(data.textColorCustom)){
      state.textColorCustom=data.textColorCustom;
      store.set('fast.textColorCustom',data.textColorCustom);
    }
    if(Array.isArray(data.tasks)){state.tasks=data.tasks.slice(0,500);store.set('fast.tasks',state.tasks);}
    if(Array.isArray(data.links)){state.links=data.links.slice(0,100);store.set('fast.links',state.links);}
    if(typeof data.notes==='string'){state.notes=data.notes.slice(0,12000);store.set('fast.notes',state.notes);}
    if(Array.isArray(data.order)){state.order=data.order;store.set('fast.widgetOrder',state.order);}
    if(Array.isArray(data.hidden)){state.hidden=new Set(data.hidden.filter((x)=>widgetIds.includes(x)));store.set('fast.hiddenWidgets',[...state.hidden]);}
    if(data.sizes&&typeof data.sizes==='object'){state.sizes={...defaults.sizes,...data.sizes};store.set('fast.widgetSizes',state.sizes);}
    if(Array.isArray(data.zones)){state.zones=data.zones.slice(0,3);store.set('fast.zones',state.zones);}
    if(data.weather&&typeof data.weather==='object'){state.weather=data.weather;store.set('fast.weather',state.weather);}
    if(Number.isFinite(Number(data.focusMinutes))){state.focusMinutes=Math.min(90,Math.max(5,Number(data.focusMinutes)));store.set('fast.focusMinutes',state.focusMinutes);}
    if(data.weather === null){state.weather=null;store.set('fast.weather',null);}
    location.reload();
  } catch { alert('That file is not a valid Fast Start Hub settings export.'); }
});

function applyLayoutMigration(){
  const version=Number(store.get('fast.layoutVersion',0))||0;
  if(version<defaults.layoutVersion){
    store.set('fast.layoutBeforeRepair42',{order:[...state.order],hidden:[...state.hidden],sizes:{...state.sizes}});
    state.order=[...defaults.order]; state.hidden=new Set(); state.sizes={...defaults.sizes};
    localStorage.setItem('fast.widgetOrder',JSON.stringify(state.order));
    localStorage.setItem('fast.hiddenWidgets',JSON.stringify([]));
    localStorage.setItem('fast.widgetSizes',JSON.stringify(state.sizes));
    localStorage.setItem('fast.layoutVersion',JSON.stringify(defaults.layoutVersion));
  }
}

function init(){
  applyLayoutMigration(); applyTheme(); buildSettings(); applyWidgetState(); renderTasks(); renderLinks(); tickClocks(); setInterval(tickClocks,1000); resetFocus(); refreshWeather(); $('searchInput').focus();
}
init();

function flushNotes() {
  clearTimeout(noteTimer);
  if (state.notes !== store.get('fast.notes','')) store.set('fast.notes',state.notes);
}
window.addEventListener('pagehide', flushNotes);
document.addEventListener('visibilitychange', () => { if(document.hidden) flushNotes(); });
window.addEventListener('storage', e => {
  if (e.key === 'fast.tasks') { state.tasks=cleanTasks(store.get(e.key,[])); renderTasks(); }
  if (e.key === 'fast.links') { state.links=cleanLinks(store.get(e.key,defaults.links)); renderLinks(); }
  if (e.key === 'fast.notes' && document.activeElement !== $('notes')) {
    state.notes=String(store.get(e.key,'')).slice(0,12000); $('notes').value=state.notes; $('notesCount').textContent=String(state.notes.length);
  }
});


// Fast Browser: spacing before Weather city
function fastBrowserApplyWeatherCitySpacing() {
  const panel = document.getElementById('settingsPanel');
  if (!panel) return;

  const nodes = Array.from(panel.querySelectorAll('*'));
  const heading = nodes.find((el) =>
    el.children.length === 0 &&
    typeof el.textContent === 'string' &&
    el.textContent.trim() === 'Weather city');

  if (!heading) return;

  heading.style.display = 'block';
  heading.style.marginTop = '12px';
  heading.style.marginBottom = '8px';
}

window.addEventListener('load', fastBrowserApplyWeatherCitySpacing);

new MutationObserver(() => {
  fastBrowserApplyWeatherCitySpacing();
}).observe(document.documentElement, {
  childList: true,
  subtree: true,
});
