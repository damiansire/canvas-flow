import { Injectable, Renderer2 } from '@angular/core';
import { CanvasService } from './canvas.service';

@Injectable({
  providedIn: 'root'
})
export class ElementService {

  constructor(private renderer: Renderer2, private canvasService: CanvasService) { }

  createElement(tag: string, classes: string, content: string, type: string, customStyles: any = {}, dataset: any = {}) {
    const state = this.canvasService.getState();
    const el = this.renderer.createElement(tag);
    let elementCounter = state.elementCounter;
    this.renderer.setAttribute(el, 'id', `el-${elementCounter++}`);
    this.canvasService.setState({ elementCounter });
    this.renderer.addClass(el, 'draggable');
    this.renderer.addClass(el, ...classes.split(' '));
    if (content) {
      el.innerHTML = content;
    }
    Object.keys(customStyles).forEach(key => {
      this.renderer.setStyle(el, key, customStyles[key]);
    });
    this.renderer.setStyle(el, 'left', customStyles.left || `${(state.main.scrollLeft / state.zoomLevel) + 50}px`);
    this.renderer.setStyle(el, 'top', customStyles.top || `${(state.main.scrollTop / state.zoomLevel) + 50}px`);
    this.renderer.setStyle(el, 'zIndex', customStyles.zIndex || state.canvas.children.length + 1);

    Object.keys(dataset).forEach(key => {
      this.renderer.setAttribute(el, `data-${key}`, dataset[key]);
    });
    this.renderer.setAttribute(el, 'data-type', type);
    this.renderer.setAttribute(el, 'data-name', dataset.name || (type === 'Image' || type === 'Box' ? type : content.substring(0, 15) + (content.length > 15 ? '...' : '')));

    this.setupElement(el);
    this.renderer.appendChild(state.canvas, el);
    this.canvasService.updateLayersPanel();
    return el;
  }

  setupElement(el: HTMLElement, isImageContainer = false) {
    const resizer = this.renderer.createElement('div');
    this.renderer.addClass(resizer, 'resizer');
    this.renderer.appendChild(el, resizer);
    this.makeDraggable(el);
    this.makeResizable(el, resizer, isImageContainer);
    if (!isImageContainer && el.dataset['type'] !== 'Image') {
      this.renderer.listen(el, 'dblclick', (e) => { e.stopPropagation(); this.makeEditable(el); });
    }
  }

  makeEditable(el: HTMLElement) {
    this.renderer.setAttribute(el, 'contentEditable', 'true');
    el.focus();
    document.execCommand('selectAll', false, null);
    const onBlur = () => {
      this.renderer.setAttribute(el, 'contentEditable', 'false');
      this.canvasService.updateLayersPanel();
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
    el.addEventListener('blur', onBlur);
    el.addEventListener('keydown', onKeydown);
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
      const state = this.canvasService.getState();
      const mouseMoveListener = this.renderer.listen('window', 'mousemove', (e: MouseEvent) => {
        const dx = (e.pageX - original_x) / state.zoomLevel;
        const dy = (e.pageY - original_y) / state.zoomLevel;
        const width = original_w + dx;
        const height = original_h + dy;
        if (width > 30) {
          this.renderer.setStyle(element, 'width', width + 'px');
        }
        if (height > 30) {
          this.renderer.setStyle(element, 'height', height + 'px');
        }
        if (isImageContainer) {
          const img = element.querySelector('img');
          if (img && !img.src.startsWith('data:')) {
            const newWidth = Math.round(width);
            const newHeight = Math.round(height);
            img.src = `https://placehold.co/${newWidth}x${newHeight}/e0e0e0/333?text=Image`;
          }
        }
      });
      const mouseUpListener = this.renderer.listen('window', 'mouseup', () => {
        mouseMoveListener();
        mouseUpListener();
      });
    });
  }

  makeDraggable(element: HTMLElement) {
    this.renderer.listen(element, 'mousedown', (e: MouseEvent) => {
      if ((e.target as HTMLElement).classList.contains('resizer') || (e.target as HTMLElement).isContentEditable) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      this.canvasService.selectElement(element, e.shiftKey);
      const state = this.canvasService.getState();
      const canvasRect = state.canvas.getBoundingClientRect();
      const initialMouseCanvasX = (e.clientX - canvasRect.left) / state.zoomLevel;
      const initialMouseCanvasY = (e.clientY - canvasRect.top) / state.zoomLevel;
      const initialPositions = state.selectedElements.map(el => ({
        el: el,
        initialLeft: el.offsetLeft,
        initialTop: el.offsetTop
      }));

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
          const otherElements = [...state.canvas.children].filter(child => child !== element && (child as HTMLElement).classList.contains('draggable'));
          let closestSnap = {
            v: null,
            h: null,
            distV: snapThreshold,
            distH: snapThreshold
          };
          for (const otherEl of otherElements) {
            const current = {
              left: newLeft,
              right: newLeft + element.offsetWidth,
              hCenter: newLeft + element.offsetWidth / 2,
              top: newTop,
              bottom: newTop + element.offsetHeight,
              vCenter: newTop + element.offsetHeight / 2
            };
            const other = {
              left: (otherEl as HTMLElement).offsetLeft,
              right: (otherEl as HTMLElement).offsetLeft + (otherEl as HTMLElement).offsetWidth,
              hCenter: (otherEl as HTMLElement).offsetLeft + (otherEl as HTMLElement).offsetWidth / 2,
              top: (otherEl as HTMLElement).offsetTop,
              bottom: (otherEl as HTMLElement).offsetTop + (otherEl as HTMLElement).offsetHeight,
              vCenter: (otherEl as HTMLElement).offsetTop + (otherEl as HTMLElement).offsetHeight / 2
            };
            const vPoints = ['left', 'hCenter', 'right'];
            vPoints.forEach(p1 => vPoints.forEach(p2 => {
              const dist = Math.abs(current[p1] - other[p2]);
              if (dist < closestSnap.distV) {
                closestSnap.distV = dist;
                closestSnap.v = {
                  snapLinePos: other[p2],
                  newElementPos: newLeft - (current[p1] - other[p2])
                };
              }
            }));
            const hPoints = ['top', 'vCenter', 'bottom'];
            hPoints.forEach(p1 => hPoints.forEach(p2 => {
              const dist = Math.abs(current[p1] - other[p2]);
              if (dist < closestSnap.distH) {
                closestSnap.distH = dist;
                closestSnap.h = {
                  snapLinePos: other[p2],
                  newElementPos: newTop - (current[p1] - other[p2])
                };
              }
            }));
          }
          if (closestSnap.v) {
            newLeft = closestSnap.v.newElementPos;
            this.renderer.setStyle(state.snapLineV, 'left', `${(closestSnap.v.snapLinePos * state.zoomLevel) + canvasRect.left - state.main.getBoundingClientRect().left}px`);
            this.renderer.setStyle(state.snapLineV, 'display', 'block');
          }
          if (closestSnap.h) {
            newTop = closestSnap.h.newElementPos;
            this.renderer.setStyle(state.snapLineH, 'top', `${(closestSnap.h.snapLinePos * state.zoomLevel) + canvasRect.top - state.main.getBoundingClientRect().top}px`);
            this.renderer.setStyle(state.snapLineH, 'display', 'block');
          }
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
      }
      const closeDragElement = () => {
        this.renderer.setStyle(state.snapLineV, 'display', 'none');
        this.renderer.setStyle(state.snapLineH, 'display', 'none');
        document.removeEventListener('mousemove', elementDrag);
        document.removeEventListener('mouseup', closeDragElement);
      }
      document.addEventListener('mousemove', elementDrag);
      document.addEventListener('mouseup', closeDragElement);
    });
  }
}
