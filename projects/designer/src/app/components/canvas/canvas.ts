import { Component, ElementRef, ViewChild, AfterViewInit, Renderer2, HostListener } from '@angular/core';
import { CanvasService } from '../services/canvas.service';
import { ElementService } from '../services/element.service';

@Component({
  selector: 'app-canvas',
  templateUrl: './canvas.html',
  styleUrls: ['./canvas.css']
})
export class CanvasComponent implements AfterViewInit {

  @ViewChild('canvas') canvasRef: ElementRef;
  @ViewChild('selectionBox') selectionBoxRef: ElementRef;
  @ViewChild('snapLineV') snapLineVRef: ElementRef;
  @ViewChild('snapLineH') snapLineHRef: ElementRef;
  @ViewChild('zoomLevelDisplay') zoomLevelDisplayRef: ElementRef;

  constructor(
    private renderer: Renderer2,
    private canvasService: CanvasService,
    private elementService: ElementService
  ) { }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if ((document.activeElement as HTMLElement).isContentEditable) return;

    if (event.key === 'Delete' || event.key === 'Backspace') {
      const state = this.canvasService.getState();
      if (state.selectedElements.length > 0) {
        state.selectedElements.forEach(el => this.renderer.removeChild(state.canvas, el));
        this.canvasService.setState({ selectedElements: [] });
        this.canvasService.updateLayersPanel();
        this.canvasService.updatePropertiesPanel();
      }
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      const state = this.canvasService.getState();
      if (state.selectedElements.length > 0) {
        const newSelection = [];
        state.selectedElements.forEach(el => {
          const clone = el.cloneNode(true) as HTMLElement;
          this.renderer.setAttribute(clone, 'id', `el-${this.canvasService.getState().elementCounter++}`);
          this.renderer.removeClass(clone, 'selected');
          const oldResizer = clone.querySelector('.resizer');
          if (oldResizer) {
            this.renderer.removeChild(clone, oldResizer);
          }
          this.renderer.setStyle(clone, 'left', `${el.offsetLeft + 20}px`);
          this.renderer.setStyle(clone, 'top', `${el.offsetTop + 20}px`);
          const isImage = clone.querySelector('img') !== null;
          this.elementService.setupElement(clone, isImage);
          this.renderer.appendChild(state.canvas, clone);
          newSelection.push(clone);
        });
        state.selectedElements.forEach(el => this.renderer.removeClass(el, 'selected'));
        this.canvasService.setState({ selectedElements: newSelection });
        newSelection.forEach(el => this.renderer.addClass(el, 'selected'));
        this.canvasService.updateLayersPanel();
        this.canvasService.updatePropertiesPanel();
      }
    }
  }

  @HostListener('window:paste', ['$event'])
  onPaste(event: ClipboardEvent) {
    const items = (event.clipboardData || (event as any).originalEvent.clipboardData).items;
    let imageFile = null;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        imageFile = items[i].getAsFile();
        break;
      }
    }
    if (imageFile) {
      event.preventDefault();
      const reader = new FileReader();
      reader.onload = (event: any) => {
        const imageUrl = event.target.result;
        const defaultWidth = 200;
        const defaultHeight = 150;
        const state = this.canvasService.getState();
        const canvasRect = state.canvas.getBoundingClientRect();
        const viewCenterX = (state.main.scrollLeft + canvasRect.width / 2) / state.zoomLevel;
        const viewCenterY = (state.main.scrollTop + canvasRect.height / 2) / state.zoomLevel;

        const el = this.elementService.createElement('div', 'p-0 overflow-hidden bg-gray-300 rounded-lg shadow-md relative', '', 'Image', {
          width: `${defaultWidth}px`,
          height: `${defaultHeight}px`,
          left: `${viewCenterX - defaultWidth / 2}px`,
          top: `${viewCenterY - defaultHeight / 2}px`
        });
        const img = this.renderer.createElement('img');
        this.renderer.setAttribute(img, 'src', imageUrl);
        this.renderer.addClass(img, 'w-full');
        this.renderer.addClass(img, 'h-full');
        this.renderer.addClass(img, 'object-cover');
        this.renderer.addClass(img, 'pointer-events-none');
        const caption = this.renderer.createElement('div');
        this.renderer.addClass(caption, 'image-caption');
        caption.textContent = 'Caption';
        this.renderer.setStyle(caption, 'display', 'block');
        this.renderer.listen(caption, 'dblclick', (e) => { e.stopPropagation(); this.elementService.makeEditable(caption); });
        this.renderer.appendChild(el, img);
        this.renderer.appendChild(el, caption);
        this.elementService.setupElement(el, true);
        this.renderer.appendChild(state.canvas, el);
        this.canvasService.selectElement(el, false);
      };
      reader.readAsDataURL(imageFile);
    }
  }

  ngAfterViewInit() {
    this.canvasService.setState({
      canvas: this.canvasRef.nativeElement,
      main: this.canvasRef.nativeElement.parentElement,
      selectionBox: this.selectionBoxRef.nativeElement,
      snapLineV: this.snapLineVRef.nativeElement,
      snapLineH: this.snapLineHRef.nativeElement,
      zoomLevelDisplay: this.zoomLevelDisplayRef.nativeElement
    });

    const state = this.canvasService.getState();
    this.renderer.listen(state.main, 'wheel', (event) => this.onWheel(event));
    this.renderer.listen(state.zoomLevelDisplay.previousElementSibling, 'click', () => this.zoomOut());
    this.renderer.listen(state.zoomLevelDisplay.nextElementSibling, 'click', () => this.zoomIn());

    this.loadCanvasState();
    this.renderer.listen(this.canvasService.getState().canvas, 'mousedown', (event) => this.onCanvasMouseDown(event));
  }

  onCanvasMouseDown(event: MouseEvent) {
    if ((event.target as HTMLElement) !== this.canvasService.getState().canvas) return;
    const state = this.canvasService.getState();
    this.canvasService.setState({ isCollisionViewActive: false });
    if (!event.shiftKey) {
      state.selectedElements.forEach(el => this.renderer.removeClass(el, 'selected'));
      this.canvasService.setState({ selectedElements: [] });
    }
    const canvasRect = state.canvas.getBoundingClientRect();
    const startX = (event.clientX - canvasRect.left) / state.zoomLevel;
    const startY = (event.clientY - canvasRect.top) / state.zoomLevel;

    this.renderer.setStyle(state.selectionBox, 'left', `${event.clientX - state.main.getBoundingClientRect().left}px`);
    this.renderer.setStyle(state.selectionBox, 'top', `${event.clientY - state.main.getBoundingClientRect().top}px`);
    this.renderer.setStyle(state.selectionBox, 'width', '0px');
    this.renderer.setStyle(state.selectionBox, 'height', '0px');
    this.renderer.setStyle(state.selectionBox, 'display', 'block');

    const onMouseMove = (e: MouseEvent) => {
      const currentX = (e.clientX - canvasRect.left) / state.zoomLevel;
      const currentY = (e.clientY - canvasRect.top) / state.zoomLevel;
      const newX = Math.min(startX, currentX);
      const newY = Math.min(startY, currentY);
      const newWidth = Math.abs(currentX - startX);
      const newHeight = Math.abs(currentY - startY);

      this.renderer.setStyle(state.selectionBox, 'left', `${newX * state.zoomLevel + (canvasRect.left - state.main.getBoundingClientRect().left)}px`);
      this.renderer.setStyle(state.selectionBox, 'top', `${newY * state.zoomLevel + (canvasRect.top - state.main.getBoundingClientRect().top)}px`);
      this.renderer.setStyle(state.selectionBox, 'width', `${newWidth * state.zoomLevel}px`);
      this.renderer.setStyle(state.selectionBox, 'height', `${newHeight * state.zoomLevel}px`);

      const boxRect = state.selectionBox.getBoundingClientRect();
      const allElements = [...state.canvas.children].filter(c => (c as HTMLElement).classList.contains('draggable'));
      allElements.forEach(el => {
        const elRect = (el as HTMLElement).getBoundingClientRect();
        if (boxRect.left < elRect.right && boxRect.right > elRect.left && boxRect.top < elRect.bottom && boxRect.bottom > elRect.top) {
          if (!state.selectedElements.includes(el as HTMLElement)) {
            this.renderer.addClass(el, 'selected');
          }
        } else {
          if (!state.selectedElements.includes(el as HTMLElement)) {
            this.renderer.removeClass(el, 'selected');
          }
        }
      });
    }
    const onMouseUp = () => {
      this.renderer.setStyle(state.selectionBox, 'display', 'none');
      const selectedElements = [...state.canvas.children].filter(c => (c as HTMLElement).classList.contains('selected'));
      this.canvasService.setState({ selectedElements: selectedElements as HTMLElement[] });
      this.canvasService.updateLayersPanel();
      this.canvasService.updatePropertiesPanel();
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  loadCanvasState() {
    const savedState = localStorage.getItem('visualDesignerCanvasState');
    if (!savedState) return;

    const state = JSON.parse(savedState);
    const canvasState = this.canvasService.getState();
    canvasState.canvas.innerHTML = '';
    this.canvasService.setState({ elementCounter: state.counter || 0 });

    state.elements.forEach(elData => {
      const el = this.renderer.createElement(elData.tag);
      this.renderer.setAttribute(el, 'class', elData.className);
      this.renderer.setAttribute(el, 'style', elData.style);
      el.innerHTML = elData.innerHTML;
      Object.keys(elData.dataset).forEach(key => {
        this.renderer.setAttribute(el, `data-${key}`, elData.dataset[key]);
      });
      el.id = `el-${this.canvasService.getState().elementCounter++}`;

      const isImageContainer = el.querySelector('img') !== null;
      this.elementService.setupElement(el, isImageContainer);
      if (isImageContainer) {
        const caption = el.querySelector('.image-caption');
        if (caption) {
          this.renderer.listen(caption, 'dblclick', (e) => { e.stopPropagation(); this.elementService.makeEditable(caption); });
        }
      }
      this.renderer.appendChild(canvasState.canvas, el);
    });
    this.canvasService.updateLayersPanel();
  }

  setZoom(newZoom: number) {
    const state = this.canvasService.getState();
    const zoomLevel = Math.max(0.2, Math.min(newZoom, 3.0)); // Clamp zoom between 20% and 300%
    this.canvasService.setState({ zoomLevel });
    this.renderer.setStyle(state.canvas, 'transform', `scale(${zoomLevel})`);
    state.zoomLevelDisplay.textContent = `${Math.round(zoomLevel * 100)}%`;
  }

  zoomIn() {
    const state = this.canvasService.getState();
    this.setZoom(state.zoomLevel + 0.1);
  }

  zoomOut() {
    const state = this.canvasService.getState();
    this.setZoom(state.zoomLevel - 0.1);
  }

  onWheel(event: WheelEvent) {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      const state = this.canvasService.getState();
      const zoomIntensity = 0.05;
      const direction = event.deltaY < 0 ? 1 : -1;
      this.setZoom(state.zoomLevel + direction * zoomIntensity);
    }
  }
}