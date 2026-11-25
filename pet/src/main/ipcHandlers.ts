import { ipcMain, type BrowserWindow } from 'electron';
import {
  IPC,
  type Rect,
  type SetStatPayload,
  type IncrementStatPayload,
} from '../shared/ipcContract';
import type { PetWindowManager } from './petWindow';
import type { ProgressionTracker } from './progressionTracker';
import type { StatsTracker } from './statsTracker';

export function registerIpcHandlers(
  windowManager: PetWindowManager,
  progressionTracker: ProgressionTracker,
  statsTracker: StatsTracker,
): void {
  const window = windowManager.getWindow();
  ipcMain.on(IPC.SET_CLICK_THROUGH, (event, ignore: boolean) => {
    if (event.sender === window.webContents && typeof ignore === 'boolean') {
      windowManager.setClickThrough(ignore);
    }
  });

  ipcMain.handle(IPC.GET_WORK_AREA, (event): Rect => {
    if (event.sender !== window.webContents) return { x: 0, y: 0, width: 0, height: 0 };
    const bounds = window.getBounds();
    return { x: 0, y: 0, width: bounds.width, height: bounds.height };
  });
  ipcMain.handle(IPC.GET_PLAYTIME, (event): number =>
    event.sender === window.webContents ? progressionTracker.getTotalPlaytimeMs() : 0);

  ipcMain.handle(IPC.GET_STATS, (event): Record<string, number> =>
    event.sender === window.webContents ? statsTracker.getAll() : {});
  ipcMain.on(IPC.SET_STAT, (event, payload: SetStatPayload) => {
    if (event.sender === window.webContents) statsTracker.set(payload.key, payload.value);
  });
  ipcMain.on(IPC.INCREMENT_STAT, (event, payload: IncrementStatPayload) => {
    if (event.sender === window.webContents) statsTracker.increment(payload.key, payload.delta);
  });

  // Drag start/move/end are renderer-local (the sprite moves via CSS transform
  // inside the fixed overlay window), so main has nothing to reposition. These
  // handlers exist so the contract has a place to grow into later (e.g. cross-
  // monitor drag) without changing the preload surface.
  ipcMain.on(IPC.DRAG_START, () => {});
  ipcMain.on(IPC.DRAG_MOVE, () => {});
  ipcMain.on(IPC.DRAG_END, () => {});
}

export function sendSpeciesLoaded(window: BrowserWindow, species: unknown): void {
  window.webContents.send(IPC.LOAD_SPECIES, species);
}

export function sendVisibilityToggled(window: BrowserWindow, visible: boolean): void {
  window.webContents.send(IPC.TRAY_SHOW_HIDE, visible);
}
