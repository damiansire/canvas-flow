import { Component, Renderer2 } from '@angular/core';
import { CanvasService } from '../../services/canvas.service';
import { LayersPanelComponent } from '../layers-panel/layers-panel';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [LayersPanelComponent],
  templateUrl: './toolbar.html',
  styleUrls: ['./toolbar.css']
})
export class ToolbarComponent {

  constructor(
    private renderer: Renderer2,
    private canvasService: CanvasService
  ) { }

  addElement(type: string) {
    this.canvasService.addElement(type);
  }

  addScreen(value: string) {
    this.canvasService.addScreen(value);
  }

  align(direction: string) {
    this.canvasService.align(direction);
  }

  distribute(direction: string) {
    this.canvasService.distribute(direction);
  }

  groupSelection() {
    this.canvasService.groupSelection();
  }

  saveCanvas(event: Event) {
    this.canvasService.saveCanvasState(event);
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
      this.canvasService.clearCanvas();
      this.renderer.removeChild(document.body, modal);
    });

    this.renderer.listen(cancelClearBtn, 'click', () => {
      this.renderer.removeChild(document.body, modal);
    });
  }
}