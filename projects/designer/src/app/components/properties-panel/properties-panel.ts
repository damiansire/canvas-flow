import { Component, inject } from '@angular/core';
import { CanvasStateService } from '../../services/canvas-state';

@Component({
  selector: 'app-properties-panel',
  standalone: true,
  templateUrl: './properties-panel.html',
  styleUrls: ['./properties-panel.css']
})
export class PropertiesPanelComponent {
  readonly state = inject(CanvasStateService);

  // Métodos de utilidad
  parseFloat(value: string | undefined): number {
    return parseFloat(value || '0');
  }

  parseInt(value: string | undefined): number {
    return parseInt(value || '1', 10);
  }

  // Métodos de actualización de propiedades
  updateElementName(elementId: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    // Aquí implementarías la lógica para actualizar el nombre
    console.log('Actualizando nombre del elemento:', elementId, target.value);
  }

  updateElementPosition(elementId: string, property: 'left' | 'top', event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value + 'px';
    
    if (property === 'left') {
      this.state.updateElementPosition(elementId, value, '');
    } else {
      this.state.updateElementPosition(elementId, '', value);
    }
  }

  updateElementSize(elementId: string, property: 'width' | 'height', event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value + 'px';
    
    // Aquí implementarías la lógica para actualizar el tamaño
    console.log('Actualizando tamaño del elemento:', elementId, property, value);
  }

  updateElementStyle(elementId: string, property: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value;
    
    // Aquí implementarías la lógica para actualizar el estilo
    console.log('Actualizando estilo del elemento:', elementId, property, value);
  }

  // Métodos de acciones
  duplicateElement(elementId: string): void {
    // Aquí implementarías la lógica para duplicar el elemento
    console.log('Duplicando elemento:', elementId);
  }

  deleteElement(elementId: string): void {
    this.state.selectElement(elementId, false);
    this.state.deleteSelectedElements();
  }

  // Métodos de selección múltiple
  alignElements(direction: 'v' | 'h'): void {
    this.state.alignSelectedElements(direction);
  }

  groupElements(): void {
    this.state.groupSelectedElements();
  }
}