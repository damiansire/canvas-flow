import { Component, ChangeDetectionStrategy, inject } from "@angular/core";
import { CanvasStateService } from "../../services/canvas-state";
import { Draggable } from "../../directives/draggable";
import { SetupElementDirective } from "../../directives/setup-element.directive";

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [Draggable, SetupElementDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './canvas.html',
  styleUrls: ['./canvas.css'],
  host: {
    '(window:keydown)': 'onKeyDown($event)',
    '(click)': 'onCanvasClick($event)',
  }
})
export class CanvasComponent {
  // Inyectar el servicio de estado. Es público para que la plantilla pueda acceder a él.
  readonly state = inject(CanvasStateService);

  onKeyDown(event: KeyboardEvent): void {
    if ((document.activeElement as HTMLElement).isContentEditable) return;
    if (event.key === 'Delete' || event.key === 'Backspace') {
      this.state.deleteSelectedElements();
    }
  }

  onCanvasClick(event: MouseEvent): void {
    console.log('Canvas click event:', event.target);
    if ((event.target as HTMLElement).id === 'canvas') {
      this.state.clearSelection();
    }
  }
}