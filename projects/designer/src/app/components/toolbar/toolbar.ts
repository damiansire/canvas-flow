import { Component, Renderer2, inject } from '@angular/core';
import { LayersPanelComponent } from '../layers-panel/layers-panel';
import { CanvasStateService, CanvasElement } from '../../services/canvas-state';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [LayersPanelComponent],
  templateUrl: './toolbar.html',
  styleUrls: ['./toolbar.css']
})
export class ToolbarComponent {
  private readonly renderer = inject(Renderer2);
  private readonly canvasState = inject(CanvasStateService);

  addElement(type: string) {
    console.log('Adding element of type:', type);

    let element: Omit<CanvasElement, 'id' | 'isLocked'>;

    switch (type) {
      case 'Button':
        element = {
          tag: 'div',
          className: 'bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-lg shadow-md font-medium transition-colors',
          innerHTML: '<div class="pointer-events-none text-center">Click me</div>',
          dataset: { type: 'Button' },
          style: { width: 'fit-content', minWidth: '120px' }
        };
        break;
      case 'Title':
        element = {
          tag: 'h1',
          className: 'text-4xl font-bold text-gray-900 p-3',
          innerHTML: 'Título Principal',
          dataset: { type: 'Title' },
          style: { width: 'fit-content' }
        };
        break;
      case 'Text':
        element = {
          tag: 'p',
          className: 'text-gray-700 text-lg leading-relaxed p-3 w-80',
          innerHTML: 'Este es un párrafo de ejemplo. Puedes hacer doble clic para editarlo.',
          dataset: { type: 'Text' },
          style: { width: '320px' }
        };
        break;
      case 'Box':
        element = {
          tag: 'div',
          className: 'bg-white border-2 border-gray-300 rounded-lg shadow-sm',
          innerHTML: '',
          dataset: { type: 'Box' },
          style: { width: '200px', height: '200px' }
        };
        break;
      case 'Image':
        element = {
          tag: 'div',
          className: 'p-0 overflow-hidden bg-gray-100 rounded-lg shadow-md relative',
          innerHTML: '<img src="https://placehold.co/200x150/e0e0e0/333?text=Image" class="w-full h-full object-cover pointer-events-none"><div class="image-caption" contenteditable="true">Descripción de la imagen</div>',
          dataset: { type: 'Image' },
          style: { width: '200px', height: '150px' }
        };
        break;
      default:
        console.log('Unknown element type:', type);
        return;
    }

    console.log('Created element:', element);
    this.canvasState.addElement(element);
    console.log('Element added to canvas state');
  }

  addScreen(value: string) {
    const [width, height] = value.split('x');
    const screenName = `Screen ${width}x${height}`;

    if (!width || !height) return;

    const element: Omit<CanvasElement, 'id' | 'isLocked'> = {
      tag: 'div',
      className: 'bg-white border-2 border-gray-400 rounded-lg screen-box',
      innerHTML: '',
      dataset: { type: 'Pantalla', name: screenName, screenName: screenName },
      style: { width: `${width}px`, height: `${height}px` }
    };
    this.canvasState.addElement(element);
  }

  align(direction: string) {
    this.canvasState.alignSelectedElements(direction as 'v' | 'h');
  }

  distribute(direction: string) {
    this.canvasState.distributeSelectedElements(direction as 'v' | 'h');
  }

  groupSelection() {
    this.canvasState.groupSelectedElements();
  }

  saveCanvas(event: Event) {
    this.canvasState.saveState();
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
    this.renderer.appendChild(document.body, modal);

    const confirmClearBtn = document.getElementById('confirm-clear');
    const cancelClearBtn = document.getElementById('cancel-clear');

    this.renderer.listen(confirmClearBtn, 'click', () => {
      this.canvasState.clear();
      this.renderer.removeChild(document.body, modal);
    });

    this.renderer.listen(cancelClearBtn, 'click', () => {
      this.renderer.removeChild(document.body, modal);
    });
  }
}
