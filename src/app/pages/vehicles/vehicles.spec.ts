import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VehiclesComponent, Vehicle, FuelType } from './vehicles';

describe('VehiclesComponent', () => {
  let component: VehiclesComponent;
  let fixture: ComponentFixture<VehiclesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehiclesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VehiclesComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should return correct fuel label', () => {
    expect(component.fuelLabel('electric')).toBe('Eléctrico');
    expect(component.fuelLabel('hybrid')).toBe('Híbrido');
    expect(component.fuelLabel('gasoline')).toBe('Gasolina');
    expect(component.fuelLabel('diesel')).toBe('Diésel');
  });

  it('filteredVehicles returns all when filter is "all"', () => {
    component['vehicles'] = [
      { id: '1', brand: 'Toyota', model: 'Yaris', year: 2021, plate: '', fuelType: 'hybrid', colorHex: '#fff', colorName: 'Blanco' },
      { id: '2', brand: 'Tesla', model: 'Model 3', year: 2023, plate: '', fuelType: 'electric', colorHex: '#000', colorName: 'Negro' }
    ];
    component['activeFilter'] = 'all';
    expect(component.filteredVehicles.length).toBe(2);
  });

  it('filteredVehicles filters by fuelType', () => {
    component['vehicles'] = [
      { id: '1', brand: 'Toyota', model: 'Yaris', year: 2021, plate: '', fuelType: 'hybrid', colorHex: '#fff', colorName: 'Blanco' },
      { id: '2', brand: 'Tesla', model: 'Model 3', year: 2023, plate: '', fuelType: 'electric', colorHex: '#000', colorName: 'Negro' }
    ];
    component['activeFilter'] = 'electric';
    expect(component.filteredVehicles.length).toBe(1);
    expect(component.filteredVehicles[0].brand).toBe('Tesla');
  });

  it('electricCount counts electric and hybrid vehicles', () => {
    component['vehicles'] = [
      { id: '1', brand: 'A', model: 'X', year: 2020, plate: '', fuelType: 'electric', colorHex: '#000', colorName: 'Negro' },
      { id: '2', brand: 'B', model: 'Y', year: 2021, plate: '', fuelType: 'hybrid',   colorHex: '#fff', colorName: 'Blanco' },
      { id: '3', brand: 'C', model: 'Z', year: 2022, plate: '', fuelType: 'gasoline', colorHex: '#f00', colorName: 'Rojo' }
    ];
    expect(component.electricCount).toBe(2);
  });

  it('saveVehicle adds a new vehicle when not editing', () => {
    component['vehicles'] = [];
    component['editingVehicle'] = null;
    component['form'] = {
      brand: 'Ford', model: 'Puma', year: 2022, plate: '9999 ZZZ',
      fuelType: 'gasoline', colorHex: '#ff0000', colorName: 'Rojo'
    };
    component.saveVehicle();
    expect(component['vehicles'].length).toBe(1);
    expect(component['vehicles'][0].brand).toBe('Ford');
  });

  it('saveVehicle does not save when brand or model is empty', () => {
    component['vehicles'] = [];
    component['editingVehicle'] = null;
    component['form'] = {
      brand: '', model: 'Puma', year: 2022, plate: '',
      fuelType: 'gasoline', colorHex: '#000', colorName: 'Negro'
    };
    component.saveVehicle();
    expect(component['vehicles'].length).toBe(0);
  });

  it('deleteVehicle removes the correct vehicle', () => {
    const v: Vehicle = { id: 'abc', brand: 'BMW', model: 'X5', year: 2020, plate: '', fuelType: 'diesel', colorHex: '#000', colorName: 'Negro' };
    component['vehicles'] = [v];
    component.deleteVehicle(v);
    expect(component['vehicles'].length).toBe(0);
  });

  it('toggleSidebar toggles sidebarOpen', () => {
    component['sidebarOpen'] = true;
    component.toggleSidebar();
    expect(component['sidebarOpen']).toBeFalse();
    component.toggleSidebar();
    expect(component['sidebarOpen']).toBeTrue();
  });

  it('closeModal resets showModal and editingVehicle', () => {
    component['showModal'] = true;
    component['editingVehicle'] = { id: '1', brand: 'X', model: 'Y', year: 2020, plate: '', fuelType: 'diesel', colorHex: '#000', colorName: 'Negro' };
    component.closeModal();
    expect(component['showModal']).toBeFalse();
    expect(component['editingVehicle']).toBeNull();
  });
});