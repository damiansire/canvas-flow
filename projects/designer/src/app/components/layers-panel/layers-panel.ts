import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasStateService } from '../../services/canvas-state';

@Component({
  selector: 'app-layers-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './layers-panel.html',
  styleUrls: ['./layers-panel.css']
})
export class LayersPanelComponent {
  readonly state = inject(CanvasStateService);

  toggleLock(elementId: string, event: Event): void {
    event.stopPropagation();
    // Aquí implementarías la lógica para alternar el bloqueo
    // Por ahora solo seleccionamos el elemento
    this.state.selectElement(elementId, false);
  }

  deleteElement(elementId: string, event: Event): void {
    event.stopPropagation();
    // Seleccionar el elemento y luego eliminarlo
    this.state.selectElement(elementId, false);
    this.state.deleteSelectedElements();
  }
}