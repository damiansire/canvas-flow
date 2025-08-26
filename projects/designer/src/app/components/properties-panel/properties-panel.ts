import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasStateService } from '../../services/canvas-state';

@Component({
  selector: 'app-properties-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './properties-panel.html',
  styleUrls: ['./properties-panel.css']
})
export class PropertiesPanelComponent {
  readonly state = inject(CanvasStateService);
}