import type { PetAPI } from '../shared/ipcContract';

declare global {
  interface Window {
    MemoDrop: { accepts(transfer: DataTransfer | null): boolean; content(transfer: DataTransfer): { imageUrl: string; text: string } };
    petAPI: PetAPI;
  }
}

export {};
