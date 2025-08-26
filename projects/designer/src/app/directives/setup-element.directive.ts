import { Directive, ElementRef, inject, input, OnInit } from '@angular/core';
import { ElementService } from '../services/element.service';
import { CanvasElement } from '../services/canvas-state';

@Directive({
  selector: '[appSetupElement]',
  standalone: true,
})
export class SetupElementDirective implements OnInit {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly elementService = inject(ElementService);
  
  appSetupElement = input.required<CanvasElement>();

  ngOnInit() {
    const element = this.appSetupElement();
    this.elementService.setupElement(this.elementRef.nativeElement, element.dataset['type'] === 'Image');
  }
}
