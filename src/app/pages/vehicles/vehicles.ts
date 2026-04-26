import { Component, OnInit, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { BackendVehicle, FuelType, VehiclePayload, VehicleService } from '../../core/services/vehicle';

export interface Vehicle {
  id: number;
  brand: string;
  model: string;
  year: number;
  plate: string;
  fuelType: FuelType;
  colorHex: string;
  colorName: string;
  isDefault: boolean;
  menuOpen?: boolean;
}

interface VehicleForm {
  brand: string;
  model: string;
  year: number;
  plate: string;
  fuelType: FuelType;
  colorHex: string;
  colorName: string;
  isDefault: boolean;
}

@Component({
  selector: 'app-vehicles',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './vehicles.html',
  styleUrls: ['./vehicles.scss']
})
export class VehiclesComponent implements OnInit {
  private authService = inject(AuthService);
  private vehicleService = inject(VehicleService);
  private router = inject(Router);

  searchCount = 0;
  savedRoutes: any[] = [];

  user: any = null;
  userInitials = '';
  userMenuOpen = false;
  sidebarOpen = true;
  ecoScore = 0;

  vehicles: Vehicle[] = [];
  activeFilter: 'all' | FuelType = 'all';

  showModal = false;
  editingVehicle: Vehicle | null = null;
  form: VehicleForm = this.emptyForm();

  loading = false;
  saving = false;
  notificationMessage = '';
  notificationType: 'success' | 'error' | 'warning' | '' = '';

  readonly fuelOptions: { value: FuelType; label: string; icon: string }[] = [
    {
      value: 'electric',
      label: 'Eléctrico',
      icon: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'
    },
    {
      value: 'hybrid',
      label: 'Híbrido',
      icon: '<path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 6v6l4 2"/>'
    },
    {
      value: 'gasoline',
      label: 'Gasolina',
      icon: '<path d="M3 22V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/><path d="M17 12h1a2 2 0 0 1 2 2v3a1 1 0 0 0 2 0v-5l-3-3"/><line x1="3" y1="22" x2="21" y2="22"/><rect x="7" y="10" width="4" height="4"/>'
    },
    {
      value: 'diesel',
      label: 'Diésel',
      icon: '<path d="M3 22V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/><line x1="3" y1="22" x2="21" y2="22"/><rect x="7" y="10" width="4" height="4"/>'
    }
  ];

  readonly colorOptions: { hex: string; name: string }[] = [
    { hex: '#1a1a2e', name: 'Negro noche' },
    { hex: '#e8e8e8', name: 'Blanco perla' },
    { hex: '#7a7a7a', name: 'Gris plata' },
    { hex: '#c0392b', name: 'Rojo pasión' },
    { hex: '#2c3e8c', name: 'Azul marino' },
    { hex: '#1b4332', name: 'Verde bosque' },
    { hex: '#d4a017', name: 'Dorado arena' },
    { hex: '#5c3317', name: 'Marrón café' },
    { hex: '#f4a261', name: 'Naranja sol' },
    { hex: '#4ade80', name: 'Verde eco' }
  ];

  ngOnInit(): void {
    this.loadCurrentUser();
  }

  get filteredVehicles(): Vehicle[] {
    if (this.activeFilter === 'all') {
      return this.vehicles;
    }

    return this.vehicles.filter(v => v.fuelType === this.activeFilter);
  }

  get electricCount(): number {
    return this.vehicles.filter(v => v.fuelType === 'electric' || v.fuelType === 'hybrid').length;
  }

  setFilter(f: 'all' | FuelType): void {
    this.activeFilter = f;
  }

  fuelLabel(f: FuelType): string {
    const map: Record<FuelType, string> = {
      electric: 'Eléctrico',
      hybrid: 'Híbrido',
      gasoline: 'Gasolina',
      diesel: 'Diésel'
    };

    return map[f] ?? f;
  }

  toggleCardMenu(v: Vehicle, event: Event): void {
    event.stopPropagation();

    const wasOpen = v.menuOpen;
    this.closeAllMenus();
    v.menuOpen = !wasOpen;
  }

  closeAllMenus(): void {
    this.vehicles.forEach(v => (v.menuOpen = false));
    this.userMenuOpen = false;
  }

  openAddModal(event?: Event): void {
    event?.stopPropagation();

    this.editingVehicle = null;
    this.form = this.emptyForm();
    this.showModal = true;
    this.notificationMessage = '';
  }

  editVehicle(v: Vehicle): void {
    this.editingVehicle = v;

    this.form = {
      brand: v.brand,
      model: v.model,
      year: v.year,
      plate: v.plate,
      fuelType: v.fuelType,
      colorHex: v.colorHex,
      colorName: v.colorName,
      isDefault: v.isDefault
    };

    this.showModal = true;
    v.menuOpen = false;
    this.notificationMessage = '';
  }

  saveVehicle(): void {
  if (!this.user?.id) {
    this.showNotification('No se ha podido identificar el usuario.', 'error');
    return;
  }

  if (!this.validateForm()) {
    return;
  }

  const payload = this.buildPayloadFromForm();
  this.saving = true;

  if (this.editingVehicle) {
    const editingId = this.editingVehicle.id;

    this.vehicleService.updateVehicle(this.user.id, editingId, payload).subscribe({
      next: () => {
        this.saving = false;
        this.showModal = false;
        this.editingVehicle = null;
        this.loadVehicles();
        this.showNotification('Vehículo actualizado correctamente.', 'success');
      },
      error: (err: any) => {
        this.saving = false;
        this.showNotification('No se pudo actualizar el vehículo.', 'error');
        console.error('Error actualizando vehículo:', err);
      }
    });

    return;
  }

  this.vehicleService.createVehicle(this.user.id, payload).subscribe({
    next: () => {
      this.saving = false;
      this.showModal = false;
      this.editingVehicle = null;
      this.form = this.emptyForm();
      this.loadVehicles();
      this.showNotification('Vehículo añadido correctamente.', 'success');
    },
    error: (err: any) => {
      this.saving = false;
      this.showNotification('No se pudo crear el vehículo.', 'error');
      console.error('Error creando vehículo:', err);
    }
  });
}

  deleteVehicle(v: Vehicle): void {
    if (!this.user?.id) {
      this.showNotification('No se ha podido identificar el usuario.', 'error');
      return;
    }

    const confirmed = confirm(`¿Seguro que quieres eliminar ${v.brand} ${v.model}?`);

    if (!confirmed) {
      return;
    }

    this.vehicleService.deleteVehicle(this.user.id, v.id).subscribe({
      next: () => {
        this.loadVehicles();
        this.showNotification('Vehículo eliminado correctamente.', 'success');
      },
      error: (err: any) => {
        this.showNotification('No se pudo eliminar el vehículo.', 'error');
        console.error('Error eliminando vehículo:', err);
      }
    });
  }

  setDefaultVehicle(v: Vehicle): void {
    if (!this.user?.id) {
      this.showNotification('No se ha podido identificar el usuario.', 'error');
      return;
    }

    this.vehicleService.setDefault(this.user.id, v.id).subscribe({
      next: () => {
        this.loadVehicles();
        this.showNotification('Vehículo marcado como predeterminado.', 'success');
      },
      error: (err: any) => {
        this.showNotification('No se pudo marcar como predeterminado.', 'error');
        console.error('Error marcando vehículo por defecto:', err);
      }
    });
  }

  closeModal(): void {
  if (this.saving) {
    return;
  }

  this.showModal = false;
  this.editingVehicle = null;
  this.form = this.emptyForm();
}

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private loadCurrentUser(): void {
    const userId = this.authService.getCurrentUserId?.() ?? Number(localStorage.getItem('user_id'));

    if (!userId) {
      this.showNotification('Sesión no válida. Vuelve a iniciar sesión.', 'error');
      this.router.navigate(['/login']);
      return;
    }

    this.loading = true;

    this.authService.getUser(userId).subscribe({
      next: (res: any) => {
        this.user = res;
        this.userInitials = this.buildInitials(res.name);
        this.ecoScore = res.eco_score ?? 0;

        this.loadVehicles();
      },
      error: (err: any) => {
        this.loading = false;
        this.showNotification('No se pudo cargar el usuario.', 'error');
        console.error('Error cargando usuario:', err);
      }
    });
  }

  private loadVehicles(): void {
    if (!this.user?.id) {
      return;
    }

    this.loading = true;

    this.vehicleService.getVehicles(this.user.id).subscribe({
      next: (res: BackendVehicle[]) => {
        this.vehicles = res.map(vehicle => this.mapBackendVehicle(vehicle));
        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
        this.showNotification('No se pudieron cargar los vehículos.', 'error');
        console.error('Error cargando vehículos:', err);
      }
    });
  }

  private mapBackendVehicle(vehicle: BackendVehicle): Vehicle {
    const fallbackName = vehicle.nickname || 'Vehículo';
    const fallbackParts = fallbackName.split(' ');

    return {
      id: vehicle.id,
      brand: vehicle.brand || fallbackParts[0] || 'Marca',
      model: vehicle.model || fallbackParts.slice(1).join(' ') || 'Modelo',
      year: vehicle.year || new Date().getFullYear(),
      plate: vehicle.plate || '',
      fuelType: vehicle.fuel_type || (vehicle.is_electric ? 'electric' : 'gasoline'),
      colorHex: vehicle.color_hex || '#1a1a2e',
      colorName: vehicle.color_name || 'Negro noche',
      isDefault: vehicle.is_default,
      menuOpen: false
    };
  }

  private buildPayloadFromForm(): VehiclePayload {
    return {
      type: 'CAR',
      nickname: `${this.form.brand.trim()} ${this.form.model.trim()}`,
      brand: this.form.brand.trim(),
      model: this.form.model.trim(),
      year: this.form.year,
      plate: this.form.plate.trim() || null,
      fuel_type: this.form.fuelType,
      color_hex: this.form.colorHex,
      color_name: this.form.colorName,
      is_electric: this.form.fuelType === 'electric' || this.form.fuelType === 'hybrid',
      is_default: this.form.isDefault
    };
  }

  private validateForm(): boolean {
    if (!this.form.brand.trim()) {
      this.showNotification('La marca es obligatoria.', 'warning');
      return false;
    }

    if (!this.form.model.trim()) {
      this.showNotification('El modelo es obligatorio.', 'warning');
      return false;
    }

    const currentYear = new Date().getFullYear() + 1;

    if (this.form.year < 1990 || this.form.year > currentYear) {
      this.showNotification(`El año debe estar entre 1990 y ${currentYear}.`, 'warning');
      return false;
    }

    return true;
  }

  private emptyForm(): VehicleForm {
    return {
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      plate: '',
      fuelType: 'gasoline',
      colorHex: '#1a1a2e',
      colorName: 'Negro noche',
      isDefault: false
    };
  }

  private buildInitials(name: string): string {
    if (!name) {
      return '?';
    }

    const parts = name.trim().split(' ');

    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0][0].toUpperCase();
  }

  private showNotification(message: string, type: 'success' | 'error' | 'warning'): void {
    this.notificationMessage = message;
    this.notificationType = type;

    setTimeout(() => {
      this.notificationMessage = '';
      this.notificationType = '';
    }, 4500);
  }

  @HostListener('document:click', ['$event'])
  clickOut(event: Event): void {
    const target = event.target as HTMLElement;

    if (!target.closest('.nav-actions')) {
      this.userMenuOpen = false;
    }

    if (!target.closest('.vehicle-card')) {
      this.vehicles.forEach(v => (v.menuOpen = false));
    }
  }
}