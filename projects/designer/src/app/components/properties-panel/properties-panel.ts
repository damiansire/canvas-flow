import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Renderer2, AfterViewInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { CanvasService } from '../../services/canvas.service';

@Component({
  selector: 'app-properties-panel',
  standalone: true,
  templateUrl: './properties-panel.html',
  styleUrls: ['./properties-panel.css']
})
export class PropertiesPanelComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('propertiesPanel') propertiesPanelRef!: ElementRef;

  private subscription!: Subscription;

  constructor(private renderer: Renderer2, private canvasService: CanvasService) { }

  ngOnInit() {
    this.subscription = this.canvasService.propertiesPanelNeedsUpdate$.subscribe(() => {
      this.canvasService.renderPropertiesPanel();
    });
  }

  ngAfterViewInit() {
    this.canvasService.setState({ propertiesPanel: this.propertiesPanelRef.nativeElement });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}