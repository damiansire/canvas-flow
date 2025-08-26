import { Component, signal } from '@angular/core';
import { CanvasEditor } from './components/canvas-editor/canvas-editor';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CanvasEditor],
  providers: [],

  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('designer');
}
