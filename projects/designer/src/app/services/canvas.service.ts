import { Injectable, Inject, forwardRef } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { BehaviorSubject, Subject } from 'rxjs';
import { ElementService } from './element.service';

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
  layersList: HTMLElement | null;
  propertiesPanel: HTMLElement | null;
}

interface SavedElement {
  tag: string;
  className: string;
  style: string;
  innerHTML: string;
  dataset: DOMStringMap;
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
    zoomLevelDisplay: null,
    layersList: null,
    propertiesPanel: null
  });

  readonly state$ = this._state.asObservable();

  private readonly _layersPanelNeedsUpdate = new Subject<void>();
  readonly layersPanelNeedsUpdate$ = this._layersPanelNeedsUpdate.asObservable();

  private readonly _propertiesPanelNeedsUpdate = new Subject<void>();
  readonly propertiesPanelNeedsUpdate$ = this._propertiesPanelNeedsUpdate.asObservable();

  constructor(
    @Inject(DOCUMENT) private document: Document,
    @Inject(forwardRef(() => ElementService)) private elementService: ElementService
  ) { }

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

  // --- ZOOM LOGIC ---
  setZoom(newZoom: number) {
    const state = this.getState();
    const zoomLevel = Math.max(0.2, Math.min(newZoom, 3.0)); // Clamp zoom between 20% and 300%
    if (state.canvas) {
      state.canvas.style.transform = `scale(${zoomLevel})`;
    }
    if (state.zoomLevelDisplay) {
      state.zoomLevelDisplay.textContent = `${Math.round(zoomLevel * 100)}%`;
    }
    this.setState({ zoomLevel });
  }

  // --- ELEMENT CREATION ---
  addElement(type: string) {
    const state = this.getState();
    let el: HTMLElement;
    let elementCounter = state.elementCounter;

    switch (type) {
      case 'Button':
        el = this.elementService.createElement('button', 'bg-blue-500 text-white py-2 px-4 rounded-lg shadow-md', 'Click me', 'Button');
        break;
      case 'Title':
        el = this.elementService.createElement('h1', 'text-4xl font-bold text-gray-800 p-2', 'Title', 'Title');
        break;
      case 'Text':
        el = this.elementService.createElement('p', 'text-gray-700 p-2 w-64', 'Example paragraph.', 'Text');
        break;
      case 'Box':
        el = this.elementService.createElement('div', 'bg-white border-2 border-gray-400 rounded-lg', '', 'Box', {width: '200px', height: '200px'});
        break;
      case 'Image':
        el = this.elementService.createElement('div', 'p-0 overflow-hidden bg-gray-300 rounded-lg shadow-md relative', '', 'Image', {width: '200px', height: '150px'});
        const img = this.document.createElement('img');
        img.src = `https://placehold.co/200x150/e0e0e0/333?text=Image`;
        img.className = 'w-full h-full object-cover pointer-events-none';
        const caption = this.document.createElement('div');
        caption.className = 'image-caption';
        caption.textContent = 'Caption';
        caption.addEventListener('dblclick', (e) => { e.stopPropagation(); this.elementService.makeEditable(caption); });
        el.appendChild(img);
        el.appendChild(caption);
        break;
      default:
        return;
    }

    el.id = `el-${elementCounter++}`;
    el.style.zIndex = `${state.canvas?.children.length || 0 + 1}`;
    this.elementService.setupElement(el);
    state.canvas?.appendChild(el);
    this.selectElement(el, false);
    this.setState({ elementCounter });
    this.updateLayersPanel();
  }

  addScreen(value: string) {
    const [width, height] = value.split('x');
    const screenName = `Screen ${width}x${height}`;

    if (!width || !height) return;

    const state = this.getState();
    const el = this.elementService.createElement('div', 'bg-white border-2 border-gray-400 rounded-lg screen-box', '', 'Pantalla',
        { width: `${width}px`, height: `${height}px` },
        { name: screenName, screenName: screenName }
    );
    state.canvas?.appendChild(el);
  }

  // --- SELECTION LOGIC ---
  selectElement(el: HTMLElement, shiftKeyPressed: boolean) {
    const state = this.getState();
    this.setState({ isCollisionViewActive: false });

    let selectedElements = [...state.selectedElements];

    if (!shiftKeyPressed) {
      if (!(selectedElements.length === 1 && selectedElements[0] === el)) {
        selectedElements.forEach(selected => selected.classList.remove('selected'));
        selectedElements = [];
      }
    }

    const index = selectedElements.indexOf(el);
    if (index > -1) {
      if (shiftKeyPressed) {
        el.classList.remove('selected');
        selectedElements.splice(index, 1);
      }
    } else {
      el.classList.add('selected');
      selectedElements.push(el);
    }

    this.setState({ selectedElements });
    this.updateLayersPanel();
    this.updatePropertiesPanel();
  }

  // --- PANELS LOGIC ---
  renderLayersPanel() {
    const state = this.getState();
    state.layersList!.innerHTML = '';
    const allElements = [...state.canvas!.children].filter(el => (el as HTMLElement).classList.contains('draggable'));

    let elementsToShow = allElements;
    if (state.isCollisionViewActive && state.selectedElements.length === 1) {
      const selectedEl = state.selectedElements[0];
      const rect1 = selectedEl.getBoundingClientRect();
      const colliding = allElements.filter(otherEl => {
        if (otherEl === selectedEl) return false;
        const rect2 = (otherEl as HTMLElement).getBoundingClientRect();
        return !(rect1.right < rect2.left || rect1.left > rect2.right || rect1.bottom < rect2.top || rect1.top > rect2.bottom);
      });
      elementsToShow = [selectedEl, ...colliding];
    }

    const sortedAll = [...allElements].sort((a, b) => (parseInt((a as HTMLElement).style.zIndex) || 0) - (parseInt((b as HTMLElement).style.zIndex) || 0));

    elementsToShow
      .sort((a, b) => (parseInt((b as HTMLElement).style.zIndex) || 0) - (parseInt((a as HTMLElement).style.zIndex) || 0))
      .reverse()
      .forEach(el => {
        const li = this.document.createElement('li');
        const layerIndex = sortedAll.indexOf(el);

        if (!(el as HTMLElement).dataset['name'] || ((el as HTMLElement).dataset['name']!.endsWith('...') && (el as any).isContentEditable === false)) {
          if ((el as HTMLElement).dataset['type'] === 'Text' || (el as HTMLElement).dataset['type'] === 'Title' || (el as HTMLElement).dataset['type'] === 'Button') {
            const text = el.textContent!.trim();
            (el as HTMLElement).dataset['name'] = text.substring(0, 15) + (text.length > 15 ? '...' : '');
          } else {
            (el as HTMLElement).dataset['name'] = (el as HTMLElement).dataset['screenName'] || (el as HTMLElement).dataset['type'];
          }
        }

        li.textContent = `Layer ${layerIndex}: ${(el as HTMLElement).dataset['name']}`;
        li.dataset['id'] = el.id;
        li.setAttribute('draggable', 'true');

        if (state.selectedElements.includes(el as HTMLElement)) {
          li.classList.add('selected');
        }

        li.addEventListener('click', () => this.selectElement(el as HTMLElement, false));
        li.addEventListener('dragstart', () => li.classList.add('dragging'));
        li.addEventListener('dragend', () => li.classList.remove('dragging'));
        state.layersList?.appendChild(li);
      });
  }

  renderPropertiesPanel() {
    const state = this.getState();
    state.propertiesPanel!.innerHTML = '';
    if (state.selectedElements.length !== 1) {
      state.propertiesPanel?.classList.add('hidden');
      return;
    }
    const el = state.selectedElements[0];
    state.propertiesPanel?.classList.remove('hidden');
    state.propertiesPanel!.innerHTML = `<h2 class="text-lg font-bold text-gray-700 mb-4">Properties</h2>`;
    if (el.dataset['type'] === 'Image') {
      const shapeContainer = this.document.createElement('div');
      shapeContainer.className = 'flex items-center space-x-4 mb-4';
      shapeContainer.innerHTML = `<label class="text-sm font-medium text-gray-700">Shape:</label>`;
      const isCircular = el.classList.contains('rounded-full');
      const rectBtn = this.document.createElement('button');
      rectBtn.className = `p-2 rounded-md border-2 ${!isCircular ? 'border-blue-500' : 'border-gray-300'}`;
      rectBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="1"></rect></svg>`;
      rectBtn.addEventListener('click', () => { el.classList.remove('rounded-full'); this.renderPropertiesPanel(); });
      const circleBtn = this.document.createElement('button');
      circleBtn.className = `p-2 rounded-md border-2 ${isCircular ? 'border-blue-500' : 'border-gray-300'}`;
      circleBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>`;
      circleBtn.addEventListener('click', () => { el.classList.add('rounded-full'); this.renderPropertiesPanel(); });
      shapeContainer.appendChild(rectBtn);
      shapeContainer.appendChild(circleBtn);
      state.propertiesPanel?.appendChild(shapeContainer);
      const captionContainer = this.document.createElement('div');
      captionContainer.className = 'flex items-center justify-between';
      captionContainer.innerHTML = `<label for="caption-toggle" class="text-sm font-medium text-gray-700">Caption</label>`;
      const captionToggle = this.document.createElement('input');
      captionToggle.type = 'checkbox';
      captionToggle.id = 'caption-toggle';
      const captionEl = el.querySelector('.image-caption');
      (captionToggle as any).checked = (captionEl as HTMLElement).style.display !== 'none';
      captionToggle.addEventListener('change', () => {
        (captionEl as HTMLElement).style.display = (captionToggle as any).checked ? 'block' : 'none';
      });
      captionContainer.appendChild(captionToggle);
      state.propertiesPanel?.appendChild(captionContainer);
    }
  }

  // --- ALIGN, DISTRIBUTE, GROUP LOGIC ---
  align(direction: string) {
    const state = this.getState();
    if (state.selectedElements.length < 2) return;

    if (direction === 'v') {
      const totalCenterY = state.selectedElements.reduce((sum, el) => sum + (el.offsetTop + el.offsetHeight / 2), 0);
      const avgCenterY = totalCenterY / state.selectedElements.length;
      state.selectedElements.forEach(el => el.style.top = `${avgCenterY - (el.offsetHeight / 2)}px`);
    } else if (direction === 'h') {
      const totalCenterX = state.selectedElements.reduce((sum, el) => sum + (el.offsetLeft + el.offsetWidth / 2), 0);
      const avgCenterX = totalCenterX / state.selectedElements.length;
      state.selectedElements.forEach(el => el.style.left = `${avgCenterX - (el.offsetWidth / 2)}px`);
    }
  }

  distribute(direction: string) {
    const state = this.getState();
    if (state.selectedElements.length < 3) return;

    if (direction === 'h') {
      const sorted = [...state.selectedElements].sort((a, b) => a.offsetLeft - b.offsetLeft);
      const leftMost = sorted[0];
      const rightMost = sorted[sorted.length - 1];
      const totalWidth = sorted.reduce((sum, el) => sum + el.offsetWidth, 0);
      const totalSpace = rightMost.offsetLeft + rightMost.offsetWidth - leftMost.offsetLeft;
      const gap = (totalSpace - totalWidth) / (sorted.length - 1);
      let currentLeft = leftMost.offsetLeft + leftMost.offsetWidth + gap;
      for (let i = 1; i < sorted.length - 1; i++) {
        sorted[i].style.left = `${currentLeft}px`;
        currentLeft += sorted[i].offsetWidth + gap;
      }
    } else if (direction === 'v') {
      const sorted = [...state.selectedElements].sort((a, b) => a.offsetTop - b.offsetTop);
      const topMost = sorted[0];
      const bottomMost = sorted[sorted.length - 1];
      const totalHeight = sorted.reduce((sum, el) => sum + el.offsetHeight, 0);
      const totalSpace = bottomMost.offsetTop + bottomMost.offsetHeight - topMost.offsetTop;
      const gap = (totalSpace - totalHeight) / (sorted.length - 1);
      let currentTop = topMost.offsetTop + topMost.offsetHeight + gap;
      for (let i = 1; i < sorted.length - 1; i++) {
        sorted[i].style.top = `${currentTop}px`;
        currentTop += sorted[i].offsetHeight + gap;
      }
    }
  }

  groupSelection() {
    const state = this.getState();
    if (state.selectedElements.length < 2) return;

    const padding = 20;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, minZIndex = Infinity;
    state.selectedElements.forEach(el => {
      minX = Math.min(minX, el.offsetLeft);
      minY = Math.min(minY, el.offsetTop);
      maxX = Math.max(maxX, el.offsetLeft + el.offsetWidth);
      maxY = Math.max(maxY, el.offsetTop + el.offsetHeight);
      minZIndex = Math.min(minZIndex, parseInt(el.style.zIndex));
    });
    const boxStyles = {
      left: `${minX - padding}px`,
      top: `${minY - padding}px`,
      width: `${(maxX - minX) + padding * 2}px`,
      height: `${(maxY - minY) + padding * 2}px`,
      zIndex: minZIndex - 1
    };
    const groupBox = this.elementService.createElement('div', 'bg-white border-2 border-gray-400 rounded-lg', '', 'Box', boxStyles);
    state.canvas?.appendChild(groupBox);
    this.selectElement(groupBox, true);
  }

  // --- SAVE & LOAD ---
  saveCanvasState(event: Event) {
    const state = this.getState();
    const elements = [...state.canvas!.children].filter(c => (c as HTMLElement).classList.contains('draggable'));
    const savedState = {
        elements: elements.map(el => ({
            tag: (el as HTMLElement).tagName,
            className: (el as HTMLElement).className,
            style: (el as HTMLElement).getAttribute('style') || '',
            innerHTML: (el as HTMLElement).innerHTML,
            dataset: { ...(el as HTMLElement).dataset }
        })),
        counter: state.elementCounter
    };
    localStorage.setItem('visualDesignerCanvasState', JSON.stringify(savedState));
    const button = event.target as HTMLElement;
    button.textContent = 'Saved!';
    button.classList.remove('bg-blue-600', 'hover:bg-blue-700');
    button.classList.add('bg-green-500');
    setTimeout(() => {
      button.textContent = 'Save Progress';
      button.classList.remove('bg-green-500');
      button.classList.add('bg-blue-600', 'hover:bg-blue-700');
    }, 1500);
  }

  loadCanvasState() {
    const savedStateJSON = localStorage.getItem('visualDesignerCanvasState');
    if (!savedStateJSON) return;

    const savedState = JSON.parse(savedStateJSON);
    const state = this.getState();
    
    state.canvas!.innerHTML = '';
    this.setState({ elementCounter: savedState.counter || 0 });

    savedState.elements.forEach((elData: SavedElement) => {
        const el = this.document.createElement(elData.tag);
        el.className = elData.className;
        el.setAttribute('style', elData.style);
        el.innerHTML = elData.innerHTML;
        Object.assign(el.dataset, elData.dataset);
        el.id = `el-${this.getState().elementCounter++}`;
        
        const isImageContainer = el.querySelector('img') !== null;
        this.elementService.setupElement(el, isImageContainer);
        if (isImageContainer) {
            const caption = el.querySelector('.image-caption');
            if (caption) {
                caption.addEventListener('dblclick', (e) => { e.stopPropagation(); this.elementService.makeEditable(caption as HTMLElement); });
            }
        }
        state.canvas?.appendChild(el);
    });
    this.updateLayersPanel();
  }

  clearCanvas() {
    const state = this.getState();
    state.canvas!.innerHTML = '';
    localStorage.removeItem('visualDesignerCanvasState');
    this.setState({ selectedElements: [], isCollisionViewActive: false });
    this.updateLayersPanel();
    this.updatePropertiesPanel();
  }
}