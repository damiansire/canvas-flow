import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LayersPanel } from './layers-panel';

describe('LayersPanel', () => {
  let component: LayersPanel;
  let fixture: ComponentFixture<LayersPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayersPanel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LayersPanel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
