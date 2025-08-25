import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Renderer2, AfterViewInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { CanvasService } from '../../services/canvas.service';

@Component({
  selector: 'app-layers-panel',
  standalone: true,
  templateUrl: './layers-panel.html',
  styleUrls: ['./layers-panel.css']
})
export class LayersPanelComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('layersList') layersListRef!: ElementRef;

  private subscription!: Subscription;

  constructor(private renderer: Renderer2, private canvasService: CanvasService) { }

  ngOnInit() {
    this.subscription = this.canvasService.layersPanelNeedsUpdate$.subscribe(() => {
      this.canvasService.renderLayersPanel();
    });
  }

  ngAfterViewInit() {
    this.canvasService.setState({ layersList: this.layersListRef.nativeElement });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    const draggingItem = this.layersListRef.nativeElement.querySelector('.dragging');
    const afterElement = this.getDragAfterElement(this.layersListRef.nativeElement, event.clientY);
    if (afterElement == null) {
      this.renderer.appendChild(this.layersListRef.nativeElement, draggingItem);
    } else {
      this.renderer.insertBefore(this.layersListRef.nativeElement, draggingItem, afterElement);
    }
  }

  onDrop() {
    this.updateZIndexFromLayers();
  }

  updateZIndexFromLayers() {
    const layerItems = [...this.layersListRef.nativeElement.querySelectorAll('li')];
    const totalLayers = layerItems.length;
    layerItems.forEach((li, index) => {
      const el = document.getElementById(li.dataset.id!);
      if (el) {
        this.renderer.setStyle(el, 'zIndex', (totalLayers - index).toString());
      }
    });
    this.canvasService.renderLayersPanel();
  }

  getDragAfterElement(container: HTMLElement, y: number) {
    const draggableElements = [...container.querySelectorAll('li:not(.dragging)')];

    return draggableElements.reduce((closest: { offset: number; element: Element | null }, child: Element) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
  }

  layerUp() {
    this.moveLayer(1);
  }

  layerDown() {
    this.moveLayer(-1);
  }

  moveLayer(direction: number) {
    const state = this.canvasService.getState();
    if (state.selectedElements.length !== 1) return;
    const selectedId = state.selectedElements[0].id;
    const layerItems = [...this.layersListRef.nativeElement.querySelectorAll('li')];
    const currentIndex = layerItems.findIndex(li => li.dataset.id === selectedId);

    if (direction === 1 && currentIndex > 0) {
      this.renderer.insertBefore(this.layersListRef.nativeElement, layerItems[currentIndex], layerItems[currentIndex - 1]);
    } else if (direction === -1 && currentIndex < layerItems.length - 1) {
      this.renderer.insertBefore(this.layersListRef.nativeElement, layerItems[currentIndex + 1], layerItems[currentIndex]);
    }
    this.updateZIndexFromLayers();
  }

  detectCollisions() {
    const state = this.canvasService.getState();
    this.canvasService.setState({ isCollisionViewActive: state.selectedElements.length === 1 });
    this.canvasService.renderLayersPanel();
  }
}