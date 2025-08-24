import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Renderer2 } from '@angular/core';
import { Subscription } from 'rxjs';
import { CanvasService } from '../services/canvas.service';

@Component({
  selector: 'app-layers-panel',
  templateUrl: './layers-panel.html',
  styleUrls: ['./layers-panel.css']
})
export class LayersPanelComponent implements OnInit, OnDestroy {

  @ViewChild('layersList') layersListRef: ElementRef;
  private layersList: HTMLElement;

  private subscription: Subscription;

  constructor(private renderer: Renderer2, private canvasService: CanvasService) { }

  ngOnInit() {
    this.subscription = this.canvasService.layersPanelNeedsUpdate$.subscribe(() => {
      this.renderLayersPanel();
    });
  }

  ngAfterViewInit() {
    this.layersList = this.layersListRef.nativeElement;
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  renderLayersPanel() {
    this.layersList.innerHTML = '';
    const state = this.canvasService.getState();
    const allElements = [...state.canvas.children].filter(el => (el as HTMLElement).classList.contains('draggable'));

    let elementsToShow = allElements;
    if (state.isCollisionViewActive && state.selectedElements.length === 1) {
      const selectedEl = state.selectedElements[0];
      const rect1 = selectedEl.getBoundingClientRect();
      const colliding = allElements.filter(otherEl => {
        if (otherEl === selectedEl) return false;
        const rect2 = (otherEl as HTMLElement).getBoundingClientRect();
        return !(rect1.right < rect2.left || rect1.left > rect2.right || rect1.bottom < rect2.top || rect1.top > rect2.bottom);
      });
      elementsToShow = [selectedEl, ...colliding];
    }

    const sortedAll = [...allElements].sort((a, b) => (parseInt((a as HTMLElement).style.zIndex) || 0) - (parseInt((b as HTMLElement).style.zIndex) || 0));

    elementsToShow
      .sort((a, b) => (parseInt((b as HTMLElement).style.zIndex) || 0) - (parseInt((a as HTMLElement).style.zIndex) || 0))
      .reverse()
      .forEach(el => {
        const li = this.renderer.createElement('li');
        const layerIndex = sortedAll.indexOf(el);

        if (!(el as HTMLElement).dataset.name || ((el as HTMLElement).dataset.name.endsWith('...') && (el as any).isContentEditable === false)) {
          if ((el as HTMLElement).dataset.type === 'Text' || (el as HTMLElement).dataset.type === 'Title' || (el as HTMLElement).dataset.type === 'Button') {
            const text = el.textContent.trim();
            (el as HTMLElement).dataset.name = text.substring(0, 15) + (text.length > 15 ? '...' : '');
          } else {
            (el as HTMLElement).dataset.name = (el as HTMLElement).dataset.screenName || (el as HTMLElement).dataset.type;
          }
        }

        li.textContent = `Layer ${layerIndex}: ${(el as HTMLElement).dataset.name}`;
        li.dataset.id = el.id;
        this.renderer.setAttribute(li, 'draggable', 'true');

        if (state.selectedElements.includes(el as HTMLElement)) {
          this.renderer.addClass(li, 'selected');
        }

        this.renderer.listen(li, 'click', () => this.canvasService.selectElement(el as HTMLElement, false));
        this.renderer.listen(li, 'dragstart', () => this.renderer.addClass(li, 'dragging'));
        this.renderer.listen(li, 'dragend', () => this.renderer.removeClass(li, 'dragging'));
        this.renderer.appendChild(this.layersList, li);
      });
  }
}
