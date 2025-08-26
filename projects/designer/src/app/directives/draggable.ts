import { Directive, ElementRef, HostListener, inject, input, OnInit } from '@angular/core';
import { CanvasStateService } from '../services/canvas-state';

@Directive({
  selector: '[appDraggable]',
  standalone: true
})
export class Draggable implements OnInit {
  readonly elementRef = inject(ElementRef<HTMLElement>);
  readonly state = inject(CanvasStateService);

  appDraggable = input.required<string>(); // El ID del elemento

  private isDragging = false;
  private initialMouseCanvasX = 0;
  private initialMouseCanvasY = 0;
  private initialLeft = 0;
  private initialTop = 0;

  ngOnInit() {
    // Asegurar que el elemento tenga los estilos correctos
    const element = this.elementRef.nativeElement;
    element.style.position = 'absolute';
    element.style.cursor = 'move';
    element.style.userSelect = 'none';
    
    // Asegurar que el atributo data-locked esté configurado
    if (!element.hasAttribute('data-locked')) {
      element.setAttribute('data-locked', 'false');
    }
    
    console.log('Draggable directive initialized for element:', this.appDraggable());
    console.log('Element styles:', {
      position: element.style.position,
      left: element.style.left,
      top: element.style.top,
      cursor: element.style.cursor
    });
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    console.log('Mouse down on element:', this.appDraggable());
    console.log('Element:', this.elementRef.nativeElement);
    
    // Verificar si el elemento está bloqueado directamente desde el DOM
    const isLocked = this.elementRef.nativeElement.getAttribute('data-locked') === 'true';
    console.log('Is locked:', isLocked);
    
    if (isLocked) {
      console.log('Element is locked, cannot drag');
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    this.isDragging = true;
    console.log('Starting drag for element:', this.appDraggable());
    
    const canvasRect = this.elementRef.nativeElement.parentElement!.getBoundingClientRect();
    const zoom = this.state.zoomLevel();

    this.initialMouseCanvasX = (event.clientX - canvasRect.left) / zoom;
    this.initialMouseCanvasY = (event.clientY - canvasRect.top) / zoom;
    this.initialLeft = parseFloat(this.elementRef.nativeElement.style.left || '0');
    this.initialTop = parseFloat(this.elementRef.nativeElement.style.top || '0');
    
    console.log('Initial positions:', { left: this.initialLeft, top: this.initialTop });
  }

  @HostListener('window:mousemove', ['$event'])
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

  @HostListener('window:mouseup')
  onMouseUp(): void {
    if (!this.isDragging) return;
    
    console.log('Mouse up, updating position for element:', this.appDraggable());
    this.isDragging = false;
    this.state.updateElementPosition(
      this.appDraggable(),
      this.elementRef.nativeElement.style.left,
      this.elementRef.nativeElement.style.top
    );
  }
}
