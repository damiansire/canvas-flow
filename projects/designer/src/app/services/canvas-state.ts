import { Injectable, computed, signal, inject } from '@angular/core';
import { PersistenceService } from './persistence';

//  Interfaces de Estado 
export interface CanvasElement {
  id: string;
  tag: string;
  className: string;
  style: Partial<CSSStyleDeclaration>;
  innerHTML: string;
  dataset: Record<string, string>;
  isLocked: boolean;
  src?: string;
}

//  El Servicio de Estado con Señales 
@Injectable({ providedIn: 'root' })
export class CanvasStateService {
  private readonly persistence = inject(PersistenceService);

  //  Señales de Estado Privadas 
  private readonly _zoomLevel = signal(1.0);
  private readonly _elementCounter = signal(0);
  private readonly _elements = signal<CanvasElement[]>([]);
  private readonly _selectedElementIds = signal<string[]>([]);

  //  Señales Públicas (Solo Lectura) 
  readonly zoomLevel = this._zoomLevel.asReadonly();
  readonly elements = this._elements.asReadonly();
  readonly selectedElementIds = this._selectedElementIds.asReadonly();

  //  Señales Computadas (Estado Derivado) 
  readonly selectedElements = computed(() => {
    const ids = new Set(this._selectedElementIds());
    return this._elements().filter(el => ids.has(el.id));
  });
  readonly canvasTransform = computed(() => `scale(${this._zoomLevel()})`);

  constructor() {
    this.loadState();
  }

  //  Métodos Públicos para Modificar el Estado 
  setZoom(level: number): void {
    const clampedLevel = Math.max(0.2, Math.min(level, 3.0));
    this._zoomLevel.set(clampedLevel);
  }

  selectElement(elementId: string, isMultiSelect: boolean): void {
    this._selectedElementIds.update(currentSelection => {
      if (!isMultiSelect) {
        return [elementId];
      }
      return currentSelection.includes(elementId)
        ? currentSelection.filter(id => id !== elementId)
        : [...currentSelection, elementId];
    });
  }

  clearSelection(): void {
    this._selectedElementIds.set([]);
  }

  updateElementPosition(id: string, left: string, top: string): void {
    this._elements.update(elements =>
      elements.map(el =>
        el.id === id ? { ...el, style: { ...el.style, left, top } } : el
      )
    );
  }

  deleteSelectedElements(): void {
    const idsToDelete = new Set(this._selectedElementIds());
    this._elements.update(elements => elements.filter(el => !idsToDelete.has(el.id)));
    this.clearSelection();
  }

  addElement(partialElement: Omit<CanvasElement, 'id' | 'isLocked'>): void {
    const newId = `el-${this._elementCounter()}`;
    const newElement: CanvasElement = {
      ...partialElement,
      id: newId,
      isLocked: false,
      style: {
        ...partialElement.style,
        position: 'absolute',
        left: partialElement.style.left || '50px',
        top: partialElement.style.top || '50px',
        zIndex: `${this._elements().length + 1}`
      }
    };

    console.log('Adding new element:', newElement);
    console.log('Element type:', partialElement.dataset?.type);
    console.log('Element tag:', partialElement.tag);

    this._elements.update(elements => [...elements, newElement]);
    this._elementCounter.update(c => c + 1);
    this.selectElement(newId, false);

    console.log('Total elements after adding:', this._elements().length);
    console.log('All elements:', this._elements());
  }

  loadState(): void {
    const savedState = this.persistence.load();
    if (savedState) {
      this._elements.set(savedState.elements);
      this._elementCounter.set(savedState.counter);
    }
  }

  saveState(): void {
    this.persistence.save({
      elements: this._elements(),
      counter: this._elementCounter()
    });
  }

  clear() {
    this._elements.set([]);
    this._elementCounter.set(0);
    this.clearSelection();
    this.persistence.remove();
  }

  alignSelectedElements(direction: 'v' | 'h') {
    const selected = this.selectedElements();
    if (selected.length < 2) return;

    const elementsWithPositions = selected.map(el => ({
      ...el,
      left: parseFloat(el.style.left || '0'),
      top: parseFloat(el.style.top || '0'),
      width: parseFloat(el.style.width || '0'),
      height: parseFloat(el.style.height || '0'),
    }));

    if (direction === 'v') {
      const avgCenterY = elementsWithPositions.reduce((sum, el) => sum + (el.top + el.height / 2), 0) / elementsWithPositions.length;
      this._elements.update(elements =>
        elements.map(el => {
          if (this.selectedElementIds().includes(el.id)) {
            const elementWithPosition = elementsWithPositions.find(e => e.id === el.id);
            if (elementWithPosition) {
              return { ...el, style: { ...el.style, top: `${avgCenterY - (elementWithPosition.height / 2)}px` } };
            }
          }
          return el;
        })
      );
    } else if (direction === 'h') {
      const avgCenterX = elementsWithPositions.reduce((sum, el) => sum + (el.left + el.width / 2), 0) / elementsWithPositions.length;
      this._elements.update(elements =>
        elements.map(el => {
          if (this.selectedElementIds().includes(el.id)) {
            const elementWithPosition = elementsWithPositions.find(e => e.id === el.id);
            if (elementWithPosition) {
              return { ...el, style: { ...el.style, left: `${avgCenterX - (elementWithPosition.width / 2)}px` } };
            }
          }
          return el;
        })
      );
    }
  }

  distributeSelectedElements(direction: 'v' | 'h') {
    const selected = this.selectedElements();
    if (selected.length < 3) return;

    const elementsWithPositions = selected.map(el => ({
      ...el,
      left: parseFloat(el.style.left || '0'),
      top: parseFloat(el.style.top || '0'),
      width: parseFloat(el.style.width || '0'),
      height: parseFloat(el.style.height || '0'),
    }));

    if (direction === 'h') {
      const sorted = [...elementsWithPositions].sort((a, b) => a.left - b.left);
      const leftMost = sorted[0];
      const rightMost = sorted[sorted.length - 1];
      const totalWidth = sorted.reduce((sum, el) => sum + el.width, 0);
      const totalSpace = rightMost.left + rightMost.width - leftMost.left;
      const gap = (totalSpace - totalWidth) / (sorted.length - 1);
      let currentLeft = leftMost.left + leftMost.width + gap;
      const updatedElements = new Map<string, Partial<CSSStyleDeclaration>>();
      for (let i = 1; i < sorted.length - 1; i++) {
        updatedElements.set(sorted[i].id, { left: `${currentLeft}px` });
        currentLeft += sorted[i].width + gap;
      }
      this._elements.update(elements =>
        elements.map(el => {
          if (updatedElements.has(el.id)) {
            return { ...el, style: { ...el.style, ...updatedElements.get(el.id) } };
          }
          return el;
        })
      );
    } else if (direction === 'v') {
      const sorted = [...elementsWithPositions].sort((a, b) => a.top - b.top);
      const topMost = sorted[0];
      const bottomMost = sorted[sorted.length - 1];
      const totalHeight = sorted.reduce((sum, el) => sum + el.height, 0);
      const totalSpace = bottomMost.top + bottomMost.height - topMost.top;
      const gap = (totalSpace - totalHeight) / (sorted.length - 1);
      let currentTop = topMost.top + topMost.height + gap;
      const updatedElements = new Map<string, Partial<CSSStyleDeclaration>>();
      for (let i = 1; i < sorted.length - 1; i++) {
        updatedElements.set(sorted[i].id, { top: `${currentTop}px` });
        currentTop += sorted[i].height + gap;
      }
      this._elements.update(elements =>
        elements.map(el => {
          if (updatedElements.has(el.id)) {
            return { ...el, style: { ...el.style, ...updatedElements.get(el.id) } };
          }
          return el;
        })
      );
    }
  }

  groupSelectedElements() {
    const selected = this.selectedElements();
    if (selected.length < 2) return;

    const elementsWithPositions = selected.map(el => ({
      ...el,
      left: parseFloat(el.style.left || '0'),
      top: parseFloat(el.style.top || '0'),
      width: parseFloat(el.style.width || '0'),
      height: parseFloat(el.style.height || '0'),
      zIndex: parseInt(el.style.zIndex || '0', 10)
    }));

    const padding = 20;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, minZIndex = Infinity;
    elementsWithPositions.forEach(el => {
      minX = Math.min(minX, el.left);
      minY = Math.min(minY, el.top);
      maxX = Math.max(maxX, el.left + el.width);
      maxY = Math.max(maxY, el.top + el.height);
      minZIndex = Math.min(minZIndex, el.zIndex);
    });

    const newElement: Omit<CanvasElement, 'id' | 'isLocked'> = {
      tag: 'div',
      className: 'bg-white border-2 border-gray-400 rounded-lg',
      innerHTML: '',
      dataset: { type: 'Box' },
      style: {
        left: `${minX - padding}px`,
        top: `${minY - padding}px`,
        width: `${(maxX - minX) + padding * 2}px`,
        height: `${(maxY - minY) + padding * 2}px`,
        zIndex: `${minZIndex - 1}`
      }
    };
    this.addElement(newElement);
  }
}