import { Component, OnInit, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth';

export type FuelType = 'electric' | 'hybrid' | 'gasoline' | 'diesel';

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  fuelType: FuelType;
  colorHex: string;
  colorName: string;
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
  private router = inject(Router);

  searchCount: number = 0;          // ← agregar
  savedRoutes: any[] = [];          // ← agregar (o un tipo más específico)

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
    this.authService.getUser(1).subscribe({
      next: (res: any) => {
        this.user = res;
        this.userInitials = this.buildInitials(res.name);
        this.ecoScore = res.eco_score ?? Math.floor(Math.random() * 40) + 60;
      }
    });

    const stored = localStorage.getItem('user_vehicles');
    if (stored) {
      this.vehicles = JSON.parse(stored);
    } else {
      // Demo vehicles so the page looks populated
      this.vehicles = [
        {
          id: crypto.randomUUID(),
          brand: 'Toyota',
          model: 'Yaris',
          year: 2021,
          plate: '1234 ABC',
          fuelType: 'hybrid',
          colorHex: '#c0392b',
          colorName: 'Rojo pasión'
        },
        {
          id: crypto.randomUUID(),
          brand: 'Tesla',
          model: 'Model 3',
          year: 2023,
          plate: '5678 XYZ',
          fuelType: 'electric',
          colorHex: '#1a1a2e',
          colorName: 'Negro noche'
        }
      ];
      this.persist();
    }
  }

  // ─── Computed ────────────────────────────────────────────
  get filteredVehicles(): Vehicle[] {
    if (this.activeFilter === 'all') return this.vehicles;
    return this.vehicles.filter(v => v.fuelType === this.activeFilter);
  }

  get electricCount(): number {
    return this.vehicles.filter(v => v.fuelType === 'electric' || v.fuelType === 'hybrid').length;
  }

  // ─── Filter ──────────────────────────────────────────────
  setFilter(f: 'all' | FuelType): void {
    this.activeFilter = f;
  }

  // ─── Fuel label helper ───────────────────────────────────
  fuelLabel(f: FuelType): string {
    const map: Record<FuelType, string> = {
      electric: 'Eléctrico',
      hybrid: 'Híbrido',
      gasoline: 'Gasolina',
      diesel: 'Diésel'
    };
    return map[f] ?? f;
  }

  // ─── Card context menu ───────────────────────────────────
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

  // ─── CRUD ────────────────────────────────────────────────
  openAddModal(event?: Event): void {
    event?.stopPropagation();
    this.editingVehicle = null;
    this.form = this.emptyForm();
    this.showModal = true;
  }

  editVehicle(v: Vehicle): void {
    this.editingVehicle = v;
    this.form = { ...v };
    this.showModal = true;
    v.menuOpen = false;
  }

  saveVehicle(): void {
    if (!this.form.brand.trim() || !this.form.model.trim()) return;

    if (this.editingVehicle) {
      Object.assign(this.editingVehicle, this.form);
    } else {
      this.vehicles.unshift({
        id: crypto.randomUUID(),
        ...this.form
      });
    }

    this.persist();
    this.closeModal();
  }

  deleteVehicle(v: Vehicle): void {
    this.vehicles = this.vehicles.filter(x => x.id !== v.id);
    this.persist();
  }

  closeModal(): void {
    this.showModal = false;
    this.editingVehicle = null;
  }

  // ─── Helpers ─────────────────────────────────────────────
  private emptyForm(): VehicleForm {
    return {
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      plate: '',
      fuelType: 'gasoline',
      colorHex: '#1a1a2e',
      colorName: 'Negro noche'
    };
  }

  private persist(): void {
    localStorage.setItem('user_vehicles', JSON.stringify(this.vehicles));
  }

  private buildInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0][0].toUpperCase();
  }

  // ─── Nav helpers ─────────────────────────────────────────
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
