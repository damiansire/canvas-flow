import { Directive, ElementRef, inject, input } from '@angular/core';
import { CanvasStateService } from '../services/canvas-state';

@Directive({
  selector: '[appDraggable]'
})
export class Draggable {
readonly elementRef = inject(ElementRef<HTMLElement>);
  readonly state = inject(CanvasStateService);

  appDraggable = input.required<string>(); // El ID del elemento

  private isDragging = false;
  private initialMouseCanvasX = 0;
  private initialMouseCanvasY = 0;
  private initialLeft = 0;
  private initialTop = 0;

  host = {
    '(mousedown)': 'onMouseDown($event)',
    '(window:mousemove)': 'onMouseMove($event)',
    '(window:mouseup)': 'onMouseUp()',
  };

  onMouseDown(event: MouseEvent): void {
    const element = this.state.elements().find(el => el.id === this.appDraggable());
    if (!element || element.isLocked) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    this.isDragging = true;
    const canvasRect = this.elementRef.nativeElement.parentElement!.getBoundingClientRect();
    const zoom = this.state.zoomLevel();

    this.initialMouseCanvasX = (event.clientX - canvasRect.left) / zoom;
    this.initialMouseCanvasY = (event.clientY - canvasRect.top) / zoom;
    this.initialLeft = this.elementRef.nativeElement.offsetLeft;
    this.initialTop = this.elementRef.nativeElement.offsetTop;
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;

    event.preventDefault();
    const canvasRect = this.elementRef.nativeElement.parentElement!.getBoundingClientRect();
    const zoom = this.state.zoomLevel();

    const currentMouseCanvasX = (event.clientX - canvasRect.left) / zoom;
    const currentMouseCanvasY = (event.clientY - canvasRect.top) / zoom;

    const deltaX = currentMouseCanvasX - this.initialMouseCanvasX;
    const deltaY = currentMouseCanvasY - this.initialMouseCanvasY;

    this.elementRef.nativeElement.style.left = `${this.initialLeft + deltaX}px`;
    this.elementRef.nativeElement.style.top = `${this.initialTop + deltaY}px`;
  }

  onMouseUp(): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.state.updateElementPosition(
      this.appDraggable(),
      this.elementRef.nativeElement.style.left,
      this.elementRef.nativeElement.style.top
    );
  }
}
