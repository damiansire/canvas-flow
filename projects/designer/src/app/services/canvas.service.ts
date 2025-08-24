import { Injectable, Renderer2 } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

export interface CanvasState {
  selectedElements: HTMLElement[];
  elementCounter: number;
  isCollisionViewActive: boolean;
  zoomLevel: number;
  canvas: HTMLElement | null;
  main: HTMLElement | null;
  selectionBox: HTMLElement | null;
  snapLineV: HTMLElement | null;
  snapLineH: HTMLElement | null;
  zoomLevelDisplay: HTMLElement | null;
}

@Injectable({
  providedIn: 'root'
})
export class CanvasService {

  private readonly _state = new BehaviorSubject<CanvasState>({
    selectedElements: [],
    elementCounter: 0,
    isCollisionViewActive: false,
    zoomLevel: 1.0,
    canvas: null,
    main: null,
    selectionBox: null,
    snapLineV: null,
    snapLineH: null,
    zoomLevelDisplay: null
  });

  readonly state$ = this._state.asObservable();

  private readonly _layersPanelNeedsUpdate = new Subject<void>();
  readonly layersPanelNeedsUpdate$ = this._layersPanelNeedsUpdate.asObservable();

  private readonly _propertiesPanelNeedsUpdate = new Subject<void>();
  readonly propertiesPanelNeedsUpdate$ = this._propertiesPanelNeedsUpdate.asObservable();

  constructor(private renderer: Renderer2) { }

  getState(): CanvasState {
    return this._state.getValue();
  }

  setState(newState: Partial<CanvasState>) {
    this._state.next({ ...this.getState(), ...newState });
  }

  updateLayersPanel() {
    this._layersPanelNeedsUpdate.next();
  }

  updatePropertiesPanel() {
    this._propertiesPanelNeedsUpdate.next();
  }

  selectElement(el: HTMLElement, shiftKeyPressed: boolean) {
    const state = this.getState();
    this.setState({ isCollisionViewActive: false });

    let selectedElements = [...state.selectedElements];

    if (!shiftKeyPressed) {
      if (!(selectedElements.length === 1 && selectedElements[0] === el)) {
        selectedElements.forEach(selected => this.renderer.removeClass(selected, 'selected'));
        selectedElements = [];
      }
    }

    const index = selectedElements.indexOf(el);
    if (index > -1) {
      if (shiftKeyPressed) {
        this.renderer.removeClass(el, 'selected');
        selectedElements.splice(index, 1);
      }
    } else {
      this.renderer.addClass(el, 'selected');
      selectedElements.push(el);
    }

    this.setState({ selectedElements });
    this.updateLayersPanel();
    this.updatePropertiesPanel();
  }
}
