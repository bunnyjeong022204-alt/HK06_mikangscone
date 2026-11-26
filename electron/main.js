// Mikang Memo — 메인 프로세스
// 화면 전체를 덮는 투명한 "오버레이" 창 하나에 책갈피·캐릭터·메모지를 그린다.
// 오버레이는 평소 클릭이 아래 창으로 통과하고(click-through), 마우스가 책갈피/캐릭터/메모 위에 있을 때만 클릭을 받는다.
const path = require('path');
const {
  app, BrowserWindow, screen, ipcMain, Tray, Menu, Notification, globalShortcut,
  nativeImage, session, shell,
} = require('electron');
const store = require('./store');
const ai = require('./ai');
const { watchForeground } = require('./foreground');
const { getWeather } = require('./weather');

if (process.env.MIKKANG_USER_DATA) app.setPath('userData', process.env.MIKKANG_USER_DATA);
const pet = require('../dist-pet/main/index.cjs');

const ARGS = process.argv.slice(1);
const DEMO = ARGS.includes('--demo');            // 가짜 바탕화면 배경을 깔아 미리보기 (개발·스크린샷용)
const IS_MAC = process.platform === 'darwin';
const IS_WIN = process.platform === 'win32';

if (!app.requestSingleInstanceLock()) { app.quit(); }
app.setAppUserModelId('com.mikangscone.bookmarkmemo');
if (process.platform === 'linux') app.commandLine.appendSwitch('enable-transparent-visuals');

let win = null, tray = null, interactive = false, lastCursor = '', modeOverride = 'auto';
let display = null;
let quitting = false;
let stopBackground = () => {};
let petControls = null;
let proPreview = false;

const send = (ch, ...a) => { if (win && !win.isDestroyed()) win.webContents.send(ch, ...a); };

function placeOverlay() {
  if (!win || win.isDestroyed()) return;
  display = screen.getPrimaryDisplay();
  const wa = display.workArea;
  win.setBounds({ x: wa.x, y: wa.y, width: wa.width, height: wa.height });
  send('display', { width: wa.width, height: wa.height });
}

function createOverlay() {
  display = screen.getPrimaryDisplay();
  const wa = display.workArea;
  win = new BrowserWindow({
    x: wa.x, y: wa.y, width: wa.width, height: wa.height,
    transparent: !DEMO, backgroundColor: DEMO ? '#cdd9e6' : '#00000000',
    frame: false, resizable: false, movable: false, minimizable: false, maximizable: false,
    fullscreenable: false, skipTaskbar: true, hasShadow: false, alwaysOnTop: true,
    show: false, title: 'Mikang Memo',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false },
  });
  if (IS_MAC) {
    win.setAlwaysOnTop(true, 'floating');
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  } else {
    win.setAlwaysOnTop(true, 'pop-up-menu');
  }
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile(path.join(__dirname, '..', 'src', 'index.html'), { query: { demo: DEMO ? '1' : '' } });
  win.once('ready-to-show', () => { win.showInactive(); placeOverlay(); });
  win.on('blur', () => send('win-blur'));
  win.on('closed', () => {
    win = null;
    if (!quitting) app.quit();
  });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
}

function setInteractive(on) {
  if (!win || on === interactive) return;
  interactive = on;
  if (on) win.setIgnoreMouseEvents(false);
  else win.setIgnoreMouseEvents(true, { forward: true });
}

// 마우스 위치를 계속 렌더러에 알려준다 (가장자리 미리보기, 클릭 통과 판정에 사용).
function startCursorFeed() {
  return setInterval(() => {
    if (!win || !display) return;
    const p = screen.getCursorScreenPoint();
    const b = display.bounds, wa = display.workArea;
    const onPrimary = p.x >= b.x && p.x < b.x + b.width && p.y >= b.y && p.y < b.y + b.height;
    let edge = null;
    if (onPrimary && p.y > b.y + 40 && p.y < b.y + b.height - 40) {
      if (p.x <= b.x + 1) edge = 'left';
      else if (p.x >= b.x + b.width - 2) edge = 'right';
    }
    const msg = { x: p.x - wa.x, y: p.y - wa.y, edge, on: onPrimary };
    const sig = `${msg.x},${msg.y},${edge}`;
    if (sig !== lastCursor) { lastCursor = sig; send('cursor', msg); }
  }, 40);
}

function startForegroundWatch() {
  const ownPids = () => app.getAppMetrics().map((m) => m.pid).concat(process.pid);
  return watchForeground((info) => send('fg', info), ownPids);
}

function trayIcon() {
  const f = IS_MAC ? 'trayTemplate.png' : 'tray.png';
  const img = nativeImage.createFromPath(path.join(__dirname, '..', 'build', f));
  if (IS_MAC) img.setTemplateImage(true);
  return img.isEmpty() ? nativeImage.createFromPath(path.join(__dirname, '..', 'build', 'icon.png')).resize({ width: 18, height: 18 }) : img;
}
function buildTrayMenu() {
  const mode = (v, label) => ({ label, type: 'radio', checked: modeOverride === v, click: () => { modeOverride = v; send('cmd', 'mode:' + v); buildTrayMenu(); } });
  const menu = Menu.buildFromTemplate([
    { label: '책갈피 펼치기', accelerator: 'CommandOrControl+Shift+M', click: () => send('cmd', 'summon') },
    { label: '새 메모', click: () => send('cmd', 'new') },
    { label: '일정 보기', click: () => send('cmd', 'agenda') },
    { label: '전체보기', click: () => send('cmd', 'board') },
    { label: 'AI 비서', click: () => send('cmd', 'assistant') },
    petControls?.state().present
      ? { label: '데스크톱 펫 숨기기', click: () => pet.setPetVisible(false) }
      : { label: '펫 소환하기', click: () => petControls?.show() },
    { type: 'separator' },
    { label: '화면 모드', submenu: [mode('auto', '펫에서 열기'), mode('desktop', '책갈피 표시')] },
    { label: '설정…', click: () => send('cmd', 'settings') },
    { label: '데이터 폴더 열기', click: () => shell.openPath(store.dir()) },
    { type: 'separator' },
    { label: '종료', role: 'quit' },
  ]);
  tray.setContextMenu(menu);
}
function createTray() {
  tray = new Tray(trayIcon());
  tray.setToolTip('Mikang Memo');
  buildTrayMenu();
  if (IS_WIN) tray.on('click', () => send('cmd', 'summon'));
}

function registerShortcuts() {
  globalShortcut.register('CommandOrControl+Shift+M', () => send('cmd', 'summon'));
}

/* ───────── IPC ───────── */
ipcMain.handle('state:load', () => store.loadState());
ipcMain.handle('state:save', (_e, s) => { store.saveState(s); return true; });
ipcMain.on('win:interactive', (_e, on) => setInteractive(!!on));
ipcMain.on('win:focus', () => { if (win) { if (IS_MAC) app.focus({ steal: true }); win.focus(); } });
ipcMain.on('win:release', () => { if (win && IS_WIN) win.blur(); });
ipcMain.handle('app:info', () => ({ platform: process.platform, version: app.getVersion(), demo: DEMO, args: ARGS, proPreview: !app.isPackaged || DEMO }));
ipcMain.handle('memo-pet:visible', (event, visible) => {
  if (event.sender !== win?.webContents) return false;
  if (visible === true) petControls?.show();
  else if (visible === false) pet.setPetVisible(false);
  return petControls?.state().present ?? false;
});
ipcMain.handle('memo-pet:controls', async (event, action, id) => {
  if (!win || event.sender !== win.webContents || !petControls) return null;
  if (action === 'show') petControls.show(typeof id === 'string' ? id : undefined);
  if (action === 'photo' && proPreview && typeof id === 'string') {
    petControls.importPhoto(id);
  }
  return petControls.state();
});
ipcMain.handle('memo-pet:schedule-speech', (event, text) => {
  if (event.sender !== win?.webContents || typeof text !== 'string') return false;
  const line = text.trim().slice(0, 160);
  return line ? (petControls?.speakSchedule(line) ?? false) : false;
});
ipcMain.on('memo-pet:show-briefing', (event, id, text) => {
  if (event.sender === win?.webContents && typeof id === 'string' && typeof text === 'string') {
    petControls?.showBriefing(id, text.slice(0, 600));
  }
});
ipcMain.on('app:openData', () => shell.openPath(store.dir()));
ipcMain.on('app:quit', () => app.quit());
ipcMain.on('settings:apply', (event, s) => {
  if (!s) return;
  if (event.sender === win?.webContents && typeof s.proPreview === 'boolean') {
    proPreview = (!app.isPackaged || DEMO) && s.proPreview;
  }
  if (typeof s.launchAtLogin === 'boolean' && app.isPackaged) {
    const portable = IS_WIN && process.env.PORTABLE_EXECUTABLE_FILE;
    app.setLoginItemSettings({ openAtLogin: s.launchAtLogin, openAsHidden: true, ...(portable ? { path: portable } : {}) });
  }
  if (s.modeOverride && s.modeOverride !== modeOverride) { modeOverride = s.modeOverride; if (tray) buildTrayMenu(); }
});

ipcMain.on('notify', (_e, { title, body, noteId }) => {
  if (!Notification.isSupported()) return;
  const n = new Notification({ title, body, silent: false });
  n.on('click', () => { send('open-note', noteId); });
  n.show();
});

ipcMain.handle('keys:status', () => store.keyStatus());
ipcMain.handle('keys:set', (_e, name, value) => { if (name === 'anthropic') store.setKey(name, value); return store.keyStatus(); });

// 아이폰 HEIC 사진 → JPEG (화면 쪽 보안 규칙을 느슨하게 하지 않도록 메인 프로세스에서 변환)
ipcMain.handle('image:heic', async (_e, buf) => {
  const convert = require('heic-convert');
  const out = await convert({ buffer: Buffer.from(buf), format: 'JPEG', quality: 0.85 });
  return new Uint8Array(out);
});
ipcMain.handle('ai:summarize', async (_e, payload) => {
  const key = store.getKey('anthropic');
  if (!key) return { ok: false, reason: 'nokey' };
  try { return { ok: true, text: await ai.summarizeAll(key, payload || {}) }; }
  catch (e) { return { ok: false, reason: 'error', error: ai.describeError(e) }; }
});
ipcMain.handle('ai:search-notes', async (event, payload) => {
  if (event.sender !== win?.webContents || typeof payload?.query !== 'string' || !Array.isArray(payload.notes)) {
    return { ok: false };
  }
  const key = store.getKey('anthropic');
  if (!key) return { ok: false, reason: 'nokey' };
  const query = payload.query.trim().slice(0, 300);
  const notes = payload.notes.slice(0, 40).map((note) => ({
    title: typeof note?.title === 'string' ? note.title.slice(0, 300) : '',
    text: typeof note?.text === 'string' ? note.text.slice(0, 2600) : '',
  }));
  if (!query || !notes.length) return { ok: true, indexes: [] };
  try { return { ok: true, indexes: await ai.searchNotes(key, { query, notes }) }; }
  catch (e) { return { ok: false, reason: 'error', error: ai.describeError(e) }; }
});
ipcMain.handle('weather:get', async (_e, city) => {
  try { return await getWeather(city); }
  catch { return { ok: false, error: '날씨를 가져오지 못했어요. 인터넷 연결을 확인해 주세요.' }; }
});
ipcMain.handle('keys:test', () => ai.testKey(store.getKey('anthropic')));
ipcMain.handle('ai:organize', async (_e, payload) => {
  const key = store.getKey('anthropic');
  if (!key) return { ok: false, reason: 'nokey' };
  try { return { ok: true, result: await ai.organize(key, payload) }; }
  catch (e) { return { ok: false, reason: 'error', error: ai.describeError(e) }; }
});

/* ───────── 시작 ───────── */
app.on('second-instance', (_event, args) => {
  if (args.includes('--overview')) send('cmd', 'board');
  else if (petControls && !petControls.state().present) petControls.show();
  else send('cmd', 'summon');
});
app.whenReady().then(() => {
  if (IS_MAC && app.dock) app.dock.hide(); // 독 아이콘 없이 상주 (메뉴 막대 아이콘으로 조작)
  session.defaultSession.setPermissionRequestHandler((_wc, perm, cb) => cb(['notifications', 'clipboard-sanitized-write'].includes(perm)));
  session.defaultSession.setPermissionCheckHandler((_wc, perm) => ['notifications'].includes(perm));
  petControls = pet.startPet(() => {
    if (tray) buildTrayMenu();
    send('pet-changed');
  }, () => send('cmd', 'pet-bookmarks'), (id) => send('pet-menu-selected', id),
  (id) => send('pet-briefing-request', id));
  createOverlay();
  createTray();
  registerShortcuts();
  const cursorTimer = startCursorFeed();
  const stopForeground = startForegroundWatch();
  stopBackground = () => {
    clearInterval(cursorTimer);
    stopForeground();
  };
  screen.on('display-metrics-changed', placeOverlay);
  screen.on('display-added', placeOverlay);
  screen.on('display-removed', placeOverlay);
});
app.on('before-quit', () => { quitting = true; stopBackground(); });
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => app.quit());
