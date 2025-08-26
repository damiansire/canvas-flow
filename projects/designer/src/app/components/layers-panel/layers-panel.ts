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
}