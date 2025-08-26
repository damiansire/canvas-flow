import { Injectable, RendererFactory2, Injector, Renderer2 } from '@angular/core';
import { CanvasStateService } from './canvas-state';

@Injectable({
  providedIn: 'root'
})
export class ElementService {

  private renderer: Renderer2;
  private canvasState!: CanvasStateService;

  constructor(
    private rendererFactory: RendererFactory2,
    private injector: Injector
  ) {
    this.renderer = this.rendererFactory.createRenderer(null, null);
  }

  private getCanvasState(): CanvasStateService {
    if (!this.canvasState) {
      this.canvasState = this.injector.get(CanvasStateService);
    }
    return this.canvasState;
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
          const zoomLevel = this.getCanvasState().zoomLevel();
          const dx = (event.pageX - original_x) / zoomLevel;
          const dy = (event.pageY - original_y) / zoomLevel;
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
}