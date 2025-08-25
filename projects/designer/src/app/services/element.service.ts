import { Injectable, RendererFactory2, Injector, Renderer2 } from '@angular/core';
import { CanvasService } from './canvas.service';

@Injectable({
  providedIn: 'root'
})
export class ElementService {

  private renderer: Renderer2;
  private canvasService!: CanvasService;

  constructor(
    private rendererFactory: RendererFactory2,
    private injector: Injector
  ) { 
    this.renderer = this.rendererFactory.createRenderer(null, null);
  }

  private getCanvasService(): CanvasService {
    if (!this.canvasService) {
      this.canvasService = this.injector.get(CanvasService);
    }
    return this.canvasService;
  }

  createElement(tag: string, classes: string, content: string, type: string, customStyles: any = {}, dataset: any = {}): HTMLElement {
    const el = this.renderer.createElement(tag);
    this.renderer.addClass(el, 'draggable');
    classes.split(' ').forEach(c => this.renderer.addClass(el, c));
    if (content) el.innerHTML = content;
    Object.assign(el.style, {
        left: customStyles.left || `50px`,
        top: customStyles.top || `50px`,
        width: customStyles.width || 'auto',
        height: customStyles.height || 'auto',
        zIndex: customStyles.zIndex || 1
    });
    Object.assign(el.dataset, { type, ...dataset });
    el.dataset.name = dataset.name || (type === 'Image' || type === 'Box' ? type : content.substring(0, 15) + (content.length > 15 ? '...' : ''));
    return el;
  }

  setupElement(el: HTMLElement, isImageContainer = false) {
    const resizer = this.renderer.createElement('div');
    this.renderer.addClass(resizer, 'resizer');
    this.renderer.appendChild(el, resizer);

    // Add lock icon
    const lockIcon = this.renderer.createElement('div');
    this.renderer.addClass(lockIcon, 'lock-icon');
    this.renderer.setStyle(lockIcon, 'position', 'absolute');
    this.renderer.setStyle(lockIcon, 'top', '5px');
    this.renderer.setStyle(lockIcon, 'right', '5px');
    this.renderer.setStyle(lockIcon, 'cursor', 'pointer');
    this.renderer.setStyle(lockIcon, 'z-index', '1000');
    this.renderer.setStyle(lockIcon, 'background-color', 'rgba(255,255,255,0.7)');
    this.renderer.setStyle(lockIcon, 'padding', '2px');
    this.renderer.setStyle(lockIcon, 'border-radius', '3px');
    this.renderer.setProperty(lockIcon, 'innerHTML', '🔒'); // Default unlocked
    this.renderer.appendChild(el, lockIcon);

    // Set initial locked state
    this.renderer.setAttribute(el, 'data-locked', 'false');

    // Toggle lock state on click
    this.renderer.listen(lockIcon, 'click', (event) => {
      event.stopPropagation(); // Prevent dragging when clicking lock icon
      const isLocked = el.dataset['locked'] === 'true';
      this.renderer.setAttribute(el, 'data-locked', String(!isLocked));
      this.renderer.setProperty(lockIcon, 'innerHTML', !isLocked ? '🔓' : '🔒');
    });

    this.makeDraggable(el);
    this.makeResizable(el, resizer, isImageContainer);
    if (!isImageContainer && el.dataset['type'] !== 'Image') {
        this.renderer.listen(el, 'dblclick', (e) => { e.stopPropagation(); this.makeEditable(el); });
    }
  }

  makeEditable(el: HTMLElement) {
    this.renderer.setAttribute(el, 'contentEditable', 'true');
    el.focus();
    document.execCommand('selectAll', false, undefined);
    const onBlur = () => {
        this.renderer.setAttribute(el, 'contentEditable', 'false');
        this.getCanvasService().updateLayersPanel();
        el.removeEventListener('blur', onBlur);
        el.removeEventListener('keydown', onKeydown);
    };
    const onKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            el.blur();
        } else if (e.key === 'Escape') {
            document.execCommand('undo');
            el.blur();
        }
    };
    this.renderer.listen(el, 'blur', onBlur);
    this.renderer.listen(el, 'keydown', onKeydown);
  }

  makeResizable(element: HTMLElement, resizer: HTMLElement, isImageContainer = false) {
    let original_w = 0, original_h = 0, original_x = 0, original_y = 0;
    this.renderer.listen(resizer, 'mousedown', (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        original_w = parseFloat(getComputedStyle(element, null).getPropertyValue('width').replace('px', ''));
        original_h = parseFloat(getComputedStyle(element, null).getPropertyValue('height').replace('px', ''));
        original_x = e.pageX;
        original_y = e.pageY;
        const stopResize = this.renderer.listen('window', 'mouseup', () => {
            stopResize();
            resizeMove();
        });
        const resizeMove = this.renderer.listen('window', 'mousemove', (event: MouseEvent) => {
          const state = this.getCanvasService().getState();
          const dx = (event.pageX - original_x) / state.zoomLevel;
          const dy = (event.pageY - original_y) / state.zoomLevel;
          const width = original_w + dx;
          const height = original_h + dy;
          if (width > 30) this.renderer.setStyle(element, 'width', width + 'px');
          if (height > 30) this.renderer.setStyle(element, 'height', height + 'px');
          if (isImageContainer) {
              const img = element.querySelector('img');
              if (img && !img.src.startsWith('data:')) {
                  const newWidth = Math.round(width);
                  const newHeight = Math.round(height);
                  this.renderer.setAttribute(img, 'src', `https://placehold.co/${newWidth}x${newHeight}/e0e0e0/333?text=Image`);
              }
          }
        });
    });
  }

  makeDraggable(element: HTMLElement) {
    this.renderer.listen(element, 'mousedown', (e: MouseEvent) => {
      if ((e.target as HTMLElement).classList.contains('resizer') || (e.target as HTMLElement).isContentEditable) return;
      // Add check for locked state
      if (element.dataset['locked'] === 'true') return; // This line was added in previous step
      e.preventDefault();
      e.stopPropagation();
      this.getCanvasService().selectElement(element, e.shiftKey);

      const state = this.getCanvasService().getState();
      const canvasRect = state.canvas!.getBoundingClientRect();
      const initialMouseCanvasX = (e.clientX - canvasRect.left) / state.zoomLevel;
      const initialMouseCanvasY = (e.clientY - canvasRect.top) / state.zoomLevel;
      const initialPositions = state.selectedElements.map(el => ({ el: el, initialLeft: el.offsetLeft, initialTop: el.offsetTop }));

      const elementDrag = (e: MouseEvent) => {
        e.preventDefault();
        const currentMouseCanvasX = (e.clientX - canvasRect.left) / state.zoomLevel;
        const currentMouseCanvasY = (e.clientY - canvasRect.top) / state.zoomLevel;
        const deltaX = currentMouseCanvasX - initialMouseCanvasX;
        const deltaY = currentMouseCanvasY - initialMouseCanvasY;

        let newLeft = initialPositions[0].initialLeft + deltaX;
        let newTop = initialPositions[0].initialTop + deltaY;

        if (state.selectedElements.length === 1) {
          const snapThreshold = 6;
          this.renderer.setStyle(state.snapLineV, 'display', 'none');
          this.renderer.setStyle(state.snapLineH, 'display', 'none');
          const otherElements = [...state.canvas!.children].filter(child => child !== element && (child as HTMLElement).classList.contains('draggable')) as HTMLElement[];
          let closestSnap = { v: null as any, h: null as any, distV: snapThreshold, distH: snapThreshold };

          for (const otherEl of otherElements) {
            const current = { left: newLeft, right: newLeft + element.offsetWidth, hCenter: newLeft + element.offsetWidth / 2, top: newTop, bottom: newTop + element.offsetHeight, vCenter: newTop + element.offsetHeight / 2 };
            const other = { left: otherEl.offsetLeft, right: otherEl.offsetLeft + otherEl.offsetWidth, hCenter: otherEl.offsetLeft + otherEl.offsetWidth / 2, top: otherEl.offsetTop, bottom: otherEl.offsetTop + otherEl.offsetHeight, vCenter: otherEl.offsetTop + otherEl.offsetHeight / 2 };
            const vPoints = ['left', 'hCenter', 'right'];
            vPoints.forEach(p1 => vPoints.forEach(p2 => { const dist = Math.abs((current as any)[p1] - (other as any)[p2]); if (dist < closestSnap.distV) { closestSnap.distV = dist; closestSnap.v = { snapLinePos: (other as any)[p2], newElementPos: newLeft - ((current as any)[p1] - (other as any)[p2]) }; } }));
            const hPoints = ['top', 'vCenter', 'bottom'];
            hPoints.forEach(p1 => hPoints.forEach(p2 => { const dist = Math.abs((current as any)[p1] - (other as any)[p2]); if (dist < closestSnap.distH) { closestSnap.distH = dist; closestSnap.h = { snapLinePos: (other as any)[p2], newElementPos: newTop - ((current as any)[p1] - (other as any)[p2]) }; } }));
          }

          if (closestSnap.v) { newLeft = closestSnap.v.newElementPos; this.renderer.setStyle(state.snapLineV, 'left', `${(closestSnap.v.snapLinePos * state.zoomLevel) + canvasRect.left - state.main!.getBoundingClientRect().left}px`); this.renderer.setStyle(state.snapLineV, 'display', 'block'); }
          if (closestSnap.h) { newTop = closestSnap.h.newElementPos; this.renderer.setStyle(state.snapLineH, 'top', `${(closestSnap.h.snapLinePos * state.zoomLevel) + canvasRect.top - state.main!.getBoundingClientRect().top}px`); this.renderer.setStyle(state.snapLineH, 'display', 'block'); }
        }

        initialPositions.forEach((pos, index) => {
          if (index === 0) {
            this.renderer.setStyle(pos.el, 'left', `${newLeft}px`);
            this.renderer.setStyle(pos.el, 'top', `${newTop}px`);
          } else {
            this.renderer.setStyle(pos.el, 'left', `${pos.initialLeft + deltaX}px`);
            this.renderer.setStyle(pos.el, 'top', `${pos.initialTop + deltaY}px`);
          }
        });
      };

      const closeDragElement = () => {
        this.renderer.setStyle(state.snapLineV, 'display', 'none');
        this.renderer.setStyle(state.snapLineH, 'display', 'none');
        document.removeEventListener('mousemove', elementDrag);
        document.removeEventListener('mouseup', closeDragElement);
      };

      document.addEventListener('mousemove', elementDrag);
      document.addEventListener('mouseup', closeDragElement);
    });
  }
}