import { Component, OnInit, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { BackendVehicle, FuelType, VehiclePayload, VehicleService } from '../../core/services/vehicle';
import { HeaderComponent } from '../../core/components/header/header';
import { FooterComponent } from '../../core/components/footer/footer';

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

//pagina "mis vehiculos"; CRUD completo de vehiculos del usuario
@Component({
  selector: 'app-vehicles',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HeaderComponent, FooterComponent],
  templateUrl: './vehicles.html',
  styleUrls: ['./vehicles.scss']
})
export class VehiclesComponent implements OnInit {
  private authService = inject(AuthService);
  private vehicleService = inject(VehicleService);
  private router = inject(Router);

  user: any = null;
  userInitials = '';
  userMenuOpen = false;

  vehicles: Vehicle[] = [];
  activeFilter: 'all' | FuelType = 'all';

  showModal = false;
  editingVehicle: Vehicle | null = null;
  form: VehicleForm = this.emptyForm();

  loading = false;
  saving = false;
  notificationMessage = '';
  notificationType: 'success' | 'error' | 'warning' | '' = '';

  readonly fuelOptions: { value: FuelType; label: string }[] = [
    { value: 'electric', label: 'Eléctrico' },
    { value: 'hybrid',   label: 'Híbrido' },
    { value: 'gasoline', label: 'Gasolina' },
    { value: 'diesel',   label: 'Diésel' }
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

  //devuelve la lista filtrada segun el tipo de combustible activo
  get filteredVehicles(): Vehicle[] {
    const filtrados = this.activeFilter === 'all'
      ? this.vehicles
      : this.vehicles.filter(v => v.fuelType === this.activeFilter);
    return filtrados;
  }

  setFilter(f: 'all' | FuelType): void {
    this.activeFilter = f;
  }

  //etiqueta legible para el tipo de combustible
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

  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
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

  //no permitimos cerrar el modal mientras se este guardando
  closeModal(): void {
    if (!this.saving) {
      this.showModal = false;
      this.editingVehicle = null;
      this.form = this.emptyForm();
    }
  }

  //valida y guarda el vehiculo (crear o editar segun editingVehicle)
  saveVehicle(): void {
    const usuarioOk = !!this.user?.id;
    const formularioOk = this.validateForm();

    if (!usuarioOk) {
      this.showNotification('No se ha podido identificar el usuario.', 'error');
    } else if (formularioOk) {
      this.persistirVehiculo();
    }
  }

  private persistirVehiculo(): void {
    const payload = this.buildPayloadFromForm();
    this.saving = true;

    if (this.editingVehicle) {
      this.actualizarVehiculo(this.editingVehicle.id, payload);
    } else {
      this.crearVehiculo(payload);
    }
  }

  private actualizarVehiculo(editingId: number, payload: VehiclePayload): void {
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
  }

  private crearVehiculo(payload: VehiclePayload): void {
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

  //elimina un vehiculo previa confirmacion del usuario
  deleteVehicle(v: Vehicle): void {
    if (!this.user?.id) {
      this.showNotification('No se ha podido identificar el usuario.', 'error');
    } else {
      const confirmed = confirm('¿Seguro que quieres eliminar ' + v.brand + ' ' + v.model + '?');
      if (confirmed) {
        this.lanzarBorrado(v);
      }
    }
  }

  private lanzarBorrado(v: Vehicle): void {
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

  //marca un vehiculo como predeterminado del usuario
  setDefaultVehicle(v: Vehicle): void {
    if (!this.user?.id) {
      this.showNotification('No se ha podido identificar el usuario.', 'error');
    } else {
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
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private loadCurrentUser(): void {
    const userId = this.authService.getCurrentUserId() ?? Number(localStorage.getItem('user_id'));

    if (!userId) {
      this.showNotification('Sesión no válida. Vuelve a iniciar sesión.', 'error');
      this.router.navigate(['/login']);
    } else {
      this.loading = true;
      this.authService.getUser(userId).subscribe({
        next: (res: any) => {
          this.user = res;
          this.userInitials = this.buildInitials(res.name);
          this.loadVehicles();
        },
        error: (err: any) => {
          this.loading = false;
          this.showNotification('No se pudo cargar el usuario.', 'error');
          console.error('Error cargando usuario:', err);
        }
      });
    }
  }

  private loadVehicles(): void {
    if (this.user?.id) {
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
  }

  //convierte la estructura del backend a la del frontend, con
  //valores por defecto para los campos opcionales que llegan vacios
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
      nickname: this.form.brand.trim() + ' ' + this.form.model.trim(),
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

  //valida marca, modelo y año; si algo falla muestra el aviso y devuelve false
  private validateForm(): boolean {
    let mensaje = '';

    if (!this.form.brand.trim()) {
      mensaje = 'La marca es obligatoria.';
    } else if (!this.form.model.trim()) {
      mensaje = 'El modelo es obligatorio.';
    } else {
      const maxYear = new Date().getFullYear() + 1;
      if (this.form.year < 1990 || this.form.year > maxYear) {
        mensaje = 'El año debe estar entre 1990 y ' + maxYear + '.';
      }
    }

    const valido = mensaje === '';
    if (!valido) {
      this.showNotification(mensaje, 'warning');
    }
    return valido;
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
    let iniciales = '?';
    if (name) {
      const parts = name.trim().split(' ');
      iniciales = parts.length >= 2
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : parts[0][0].toUpperCase();
    }
    return iniciales;
  }

  private showNotification(message: string, type: 'success' | 'error' | 'warning'): void {
    this.notificationMessage = message;
    this.notificationType = type;
    setTimeout(() => {
      this.notificationMessage = '';
      this.notificationType = '';
    }, 4500);
  }

  //cierra los menus si el clic ha sido fuera de las cards o la navbar
  @HostListener('document:click', ['$event'])
  clickOut(event: Event): void {
    const target = event.target as HTMLElement;

    if (!target.closest('.navbar')) {
      this.userMenuOpen = false;
    }

    if (!target.closest('.card')) {
      this.vehicles.forEach(v => (v.menuOpen = false));
    }
  }
}
