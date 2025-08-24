import { Component, Renderer2 } from '@angular/core';
import { ElementService } from '../services/element.service';
import { CanvasService } from '../services/canvas.service';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.html',
  styleUrls: ['./toolbar.css']
})
export class ToolbarComponent {

  constructor(
    private renderer: Renderer2,
    private elementService: ElementService,
    private canvasService: CanvasService
  ) { }

  addElement(type: string) {
    const state = this.canvasService.getState();
    let el;
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
        const img = this.renderer.createElement('img');
        this.renderer.setAttribute(img, 'src', `https://placehold.co/200x150/e0e0e0/333?text=Image`);
        this.renderer.addClass(img, 'w-full');
        this.renderer.addClass(img, 'h-full');
        this.renderer.addClass(img, 'object-cover');
        this.renderer.addClass(img, 'pointer-events-none');
        this.renderer.listen(img, 'error', () => { this.renderer.setAttribute(img, 'src', `https://placehold.co/200x150/e0e0e0/333?text=Error`) });
        const caption = this.renderer.createElement('div');
        this.renderer.addClass(caption, 'image-caption');
        caption.textContent = 'Caption';
        this.renderer.listen(caption, 'dblclick', (e) => { e.stopPropagation(); this.elementService.makeEditable(caption); });
        this.renderer.appendChild(el, img);
        this.renderer.appendChild(el, caption);
        this.elementService.setupElement(el, true);
        break;
    }
    this.renderer.appendChild(state.canvas, el);
    this.canvasService.selectElement(el, false);
  }

  addScreen(value: string) {
    const [width, height] = value.split('x');
    const screenName = `Screen ${width}x${height}`;

    if (!width || !height) return;

    const state = this.canvasService.getState();
    const el = this.elementService.createElement('div', 'bg-white border-2 border-gray-400 rounded-lg screen-box', '', 'Pantalla',
        { width: `${width}px`, height: `${height}px` },
        { name: screenName, screenName: screenName }
    );
    this.renderer.appendChild(state.canvas, el);
  }

  align(direction: string) {
    const state = this.canvasService.getState();
    if (state.selectedElements.length < 2) return;

    if (direction === 'v') {
      const totalCenterY = state.selectedElements.reduce((sum, el) => sum + (el.offsetTop + el.offsetHeight / 2), 0);
      const avgCenterY = totalCenterY / state.selectedElements.length;
      state.selectedElements.forEach(el => this.renderer.setStyle(el, 'top', `${avgCenterY - (el.offsetHeight / 2)}px`));
    } else if (direction === 'h') {
      const totalCenterX = state.selectedElements.reduce((sum, el) => sum + (el.offsetLeft + el.offsetWidth / 2), 0);
      const avgCenterX = totalCenterX / state.selectedElements.length;
      state.selectedElements.forEach(el => this.renderer.setStyle(el, 'left', `${avgCenterX - (el.offsetWidth / 2)}px`));
    }
  }

  distribute(direction: string) {
    const state = this.canvasService.getState();
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
        this.renderer.setStyle(sorted[i], 'left', `${currentLeft}px`);
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
        this.renderer.setStyle(sorted[i], 'top', `${currentTop}px`);
        currentTop += sorted[i].offsetHeight + gap;
      }
    }
  }

  groupSelection() {
    const state = this.canvasService.getState();
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
    this.renderer.appendChild(state.canvas, groupBox);
    this.canvasService.selectElement(groupBox, true);
  }

  saveCanvas(event: Event) {
    const state = this.canvasService.getState();
    const elements = [...state.canvas.children].filter(c => (c as HTMLElement).classList.contains('draggable'));
    const savedState = {
      elements: elements.map(el => ({
        tag: (el as HTMLElement).tagName,
        className: (el as HTMLElement).className,
        style: (el as HTMLElement).getAttribute('style'),
        innerHTML: (el as HTMLElement).innerHTML,
        dataset: { ...(el as HTMLElement).dataset }
      })),
      counter: state.elementCounter
    };
    localStorage.setItem('visualDesignerCanvasState', JSON.stringify(savedState));
    const button = event.target as HTMLElement;
    button.textContent = 'Saved!';
    this.renderer.removeClass(button, 'bg-blue-600');
    this.renderer.removeClass(button, 'hover:bg-blue-700');
    this.renderer.addClass(button, 'bg-green-500');
    setTimeout(() => {
      button.textContent = 'Save Progress';
      this.renderer.removeClass(button, 'bg-green-500');
      this.renderer.addClass(button, 'bg-blue-600');
      this.renderer.addClass(button, 'hover:bg-blue-700');
    }, 1500);
  }

  clearCanvas() {
    const modal = this.renderer.createElement('div');
    this.renderer.addClass(modal, 'fixed');
    this.renderer.addClass(modal, 'inset-0');
    this.renderer.addClass(modal, 'bg-black');
    this.renderer.addClass(modal, 'bg-opacity-50');
    this.renderer.addClass(modal, 'flex');
    this.renderer.addClass(modal, 'items-center');
    this.renderer.addClass(modal, 'justify-center');
    this.renderer.addClass(modal, 'z-50');
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-8 shadow-2xl">
        <h3 class="text-lg font-bold mb-4">Confirm Action</h3>
        <p>Are you sure? All work and the current save will be lost.</p>
        <div class="mt-6 flex justify-end space-x-4">
          <button id="confirm-clear" class="bg-red-500 text-white px-4 py-2 rounded-lg">Yes, clear</button>
          <button id="cancel-clear" class="bg-gray-300 px-4 py-2 rounded-lg">Cancel</button>
        </div>
      </div>
    `;
    this.renderer.appendChild(this.document.body, modal);

    const confirmClearBtn = this.document.getElementById('confirm-clear');
    const cancelClearBtn = this.document.getElementById('cancel-clear');

    this.renderer.listen(confirmClearBtn, 'click', () => {
      const state = this.canvasService.getState();
      state.canvas.innerHTML = '';
      localStorage.removeItem('visualDesignerCanvasState');
      this.canvasService.setState({
        selectedElements: [],
        isCollisionViewActive: false,
        elementCounter: 0
      });
      this.canvasService.updateLayersPanel();
      this.canvasService.updatePropertiesPanel();
      this.renderer.removeChild(this.document.body, modal);
    });

    this.renderer.listen(cancelClearBtn, 'click', () => {
      this.renderer.removeChild(this.document.body, modal);
    });
  }
}
