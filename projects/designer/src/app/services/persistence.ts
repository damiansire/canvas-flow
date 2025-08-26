import { Injectable } from '@angular/core';
import { CanvasElement } from './canvas-state';


interface SavedState {
  elements: CanvasElement[];
  counter: number;
}

const STORAGE_KEY = 'visualDesignerCanvasState';

@Injectable({ providedIn: 'root' })
export class PersistenceService {
  save(state: SavedState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Error saving state to localStorage', e);
    }
  }

  load(): SavedState | null {
    try {
      const savedStateJSON = localStorage.getItem(STORAGE_KEY);
      return savedStateJSON? JSON.parse(savedStateJSON) : null;
    } catch (e) {
      console.error('Error loading state from localStorage', e);
      return null;
    }
  }

  remove(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Error removing state from localStorage', e);
    }
  }
}