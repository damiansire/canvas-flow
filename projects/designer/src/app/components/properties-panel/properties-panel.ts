import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Renderer2 } from '@angular/core';
import { Subscription } from 'rxjs';
import { CanvasService } from '../services/canvas.service';

@Component({
  selector: 'app-properties-panel',
  templateUrl: './properties-panel.html',
  styleUrls: ['./properties-panel.css']
})
export class PropertiesPanelComponent implements OnInit, OnDestroy {

  @ViewChild('propertiesPanel') propertiesPanelRef: ElementRef;
  private propertiesPanel: HTMLElement;

  private subscription: Subscription;

  constructor(private renderer: Renderer2, private canvasService: CanvasService) { }

  ngOnInit() {
    this.subscription = this.canvasService.propertiesPanelNeedsUpdate$.subscribe(() => {
      this.updatePropertiesPanel();
    });
  }

  ngAfterViewInit() {
    this.propertiesPanel = this.propertiesPanelRef.nativeElement;
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  updatePropertiesPanel() {
    this.propertiesPanel.innerHTML = '';
    const state = this.canvasService.getState();
    if (state.selectedElements.length !== 1) {
      this.renderer.addClass(this.propertiesPanel, 'hidden');
      return;
    }
    const el = state.selectedElements[0];
    this.renderer.removeClass(this.propertiesPanel, 'hidden');
    this.propertiesPanel.innerHTML = `<h2 class="text-lg font-bold text-gray-700 mb-4">Properties</h2>`;
    if (el.dataset.type === 'Image') {
      const shapeContainer = this.renderer.createElement('div');
      this.renderer.addClass(shapeContainer, 'flex');
      this.renderer.addClass(shapeContainer, 'items-center');
      this.renderer.addClass(shapeContainer, 'space-x-4');
      this.renderer.addClass(shapeContainer, 'mb-4');
      shapeContainer.innerHTML = `<label class="text-sm font-medium text-gray-700">Shape:</label>`;
      const isCircular = el.classList.contains('rounded-full');
      const rectBtn = this.renderer.createElement('button');
      this.renderer.addClass(rectBtn, 'p-2');
      this.renderer.addClass(rectBtn, 'rounded-md');
      this.renderer.addClass(rectBtn, 'border-2');
      this.renderer.addClass(rectBtn, !isCircular ? 'border-blue-500' : 'border-gray-300');
      rectBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="1"></rect></svg>`;
      this.renderer.listen(rectBtn, 'click', () => { this.renderer.removeClass(el, 'rounded-full'); this.updatePropertiesPanel(); });
      const circleBtn = this.renderer.createElement('button');
      this.renderer.addClass(circleBtn, 'p-2');
      this.renderer.addClass(circleBtn, 'rounded-md');
      this.renderer.addClass(circleBtn, 'border-2');
      this.renderer.addClass(circleBtn, isCircular ? 'border-blue-500' : 'border-gray-300');
      circleBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>`;
      this.renderer.listen(circleBtn, 'click', () => { this.renderer.addClass(el, 'rounded-full'); this.updatePropertiesPanel(); });
      this.renderer.appendChild(shapeContainer, rectBtn);
      this.renderer.appendChild(shapeContainer, circleBtn);
      this.renderer.appendChild(this.propertiesPanel, shapeContainer);
      const captionContainer = this.renderer.createElement('div');
      this.renderer.addClass(captionContainer, 'flex');
      this.renderer.addClass(captionContainer, 'items-center');
      this.renderer.addClass(captionContainer, 'justify-between');
      captionContainer.innerHTML = `<label for="caption-toggle" class="text-sm font-medium text-gray-700">Caption</label>`;
      const captionToggle = this.renderer.createElement('input');
      this.renderer.setAttribute(captionToggle, 'type', 'checkbox');
      this.renderer.setAttribute(captionToggle, 'id', 'caption-toggle');
      const captionEl = el.querySelector('.image-caption');
      captionToggle.checked = (captionEl as HTMLElement).style.display !== 'none';
      this.renderer.listen(captionToggle, 'change', () => {
        (captionEl as HTMLElement).style.display = captionToggle.checked ? 'block' : 'none';
      });
      this.renderer.appendChild(captionContainer, captionToggle);
      this.renderer.appendChild(this.propertiesPanel, captionContainer);
    }
  }
}
