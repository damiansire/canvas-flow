import { Component } from '@angular/core';
import { ToolbarComponent } from '../toolbar/toolbar';
import { CanvasComponent } from '../canvas/canvas';
import { PropertiesPanelComponent } from '../properties-panel/properties-panel';

@Component({
  selector: 'app-canvas-editor',
  standalone: true,
  imports: [ToolbarComponent, CanvasComponent, PropertiesPanelComponent],
  templateUrl: './canvas-editor.html',
  styleUrl: './canvas-editor.css'
})
export class CanvasEditor {

}
