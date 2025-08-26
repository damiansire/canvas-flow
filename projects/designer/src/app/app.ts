import { Component } from '@angular/core';
import { ToolbarComponent } from './components/toolbar/toolbar';
import { CanvasComponent } from './components/canvas/canvas';
import { PropertiesPanelComponent } from './components/properties-panel/properties-panel';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ToolbarComponent, CanvasComponent, PropertiesPanelComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent {
  title = 'canvas-flow';
}
