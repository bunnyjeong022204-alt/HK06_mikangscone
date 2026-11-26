import { BrowserWindow, screen } from 'electron';
import path from 'node:path';
import { getHomeWorkArea } from './displayBounds';

const PRELOAD_PATH = path.join(__dirname, '../preload/index.cjs');
const RENDERER_HTML_PATH = path.join(__dirname, '../renderer/index.html');

export class PetWindowManager {
  private window: BrowserWindow | null = null;

  private macWindow?: { pin(handle: Buffer): void; fileDragActive(): boolean };

  fileDragActive(): boolean | undefined {
    return this.macWindow?.fileDragActive();
  }

  create(show: boolean): BrowserWindow {
    const workArea = getHomeWorkArea();
    const displayId = screen.getDisplayMatching(workArea).id;

    const window = new BrowserWindow({
      x: workArea.x,
      y: workArea.y,
      width: workArea.width,
      height: workArea.height,
      transparent: true,
      backgroundColor: '#00000000',
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      fullscreenable: false,
      ...(process.platform === 'darwin' ? { type: 'panel' } : {}),
      hasShadow: false,
      focusable: true,
      show: false,
      webPreferences: {
        backgroundThrottling: false,
        preload: PRELOAD_PATH,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    window.setAlwaysOnTop(true, 'screen-saver');
    window.setIgnoreMouseEvents(true, { forward: true });
    const onDisplayChange = () => {
      const display = screen.getAllDisplays().find((item) => item.id === displayId) ?? screen.getPrimaryDisplay();
      if (window.isDestroyed()) return;
      const bounds = window.getBounds();
      const area = display.workArea;
      if (bounds.x !== area.x || bounds.y !== area.y || bounds.width !== area.width || bounds.height !== area.height) {
        window.setBounds(area, false);
      }
    };
    screen.on('display-metrics-changed', onDisplayChange);
    screen.on('display-removed', onDisplayChange);
    window.once('closed', () => {
      screen.removeListener('display-metrics-changed', onDisplayChange);
      screen.removeListener('display-removed', onDisplayChange);
    });

    if (process.platform === 'darwin') {
      window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, skipTransformProcessType: true });
      const native = require(path.join(__dirname, 'stationary.node'));
      native.pin(window.getNativeWindowHandle());
      this.macWindow = native;
      window.on('moved', onDisplayChange);
    }

    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event) => event.preventDefault());
    void window.loadFile(RENDERER_HTML_PATH);

    this.window = window;
    this.setVisibility(show);
    return window;
  }

  getWindow(): BrowserWindow {
    if (!this.window) throw new Error('PetWindowManager: window not created yet');
    return this.window;
  }

  setClickThrough(ignore: boolean): void {
    this.window?.setIgnoreMouseEvents(ignore, { forward: true });
  }

  setVisibility(visible: boolean): void {
    const window = this.window;
    if (!window || window.isDestroyed()) return;
    if (visible) window.showInactive();
    else window.hide();
  }

  isVisible(): boolean {
    return !!this.window && !this.window.isDestroyed() && this.window.isVisible();
  }
}
