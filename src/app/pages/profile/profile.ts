import { Component, OnInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { BackendVehicle, FuelType, VehiclePayload, VehicleService } from '../../core/services/vehicle';

interface ProfileVehicleForm {
  brand: string;
  model: string;
  plate: string;
  fuel_type: FuelType | '';
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss']
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private vehicleService = inject(VehicleService);
  private router = inject(Router);

  user: any = null;
  userInitials = '';
  userMenuOpen = false;
  avatarPreview: string | null = null;

  activeSection: 'personal' | 'seguridad' | 'vehiculos' | 'preferencias' = 'personal';

  searchCount = 0;
  savedRoutesCount = 0;
  ecoScore = 0;

  form = { name: '', mail: '', phone: '', city: '', bio: '' };
  saving = false;
  saveSuccess = false;
  saveError = '';

  passwords = { current: '', new: '', confirm: '' };
  showPass = { current: false, new: false, confirm: false };

  vehicles: BackendVehicle[] = [];
  addingVehicle = false;
  vehicleError = '';
  newVehicle: ProfileVehicleForm = {
    brand: '',
    model: '',
    plate: '',
    fuel_type: ''
  };

  prefs = {
    emailNotifications: true,
    ecoRoutes: true,
    liveTraffic: false,
    saveHistory: true
  };

  get passwordStrength(): number {
    const password = this.passwords.new;

    if (!password) {
      return 0;
    }

    let score = 0;

    if (password.length >= 8) {
      score += 25;
    }

    if (/[A-Z]/.test(password)) {
      score += 25;
    }

    if (/[0-9]/.test(password)) {
      score += 25;
    }

    if (/[^A-Za-z0-9]/.test(password)) {
      score += 25;
    }

    return score;
  }

  get passwordStrengthClass(): string {
    const strength = this.passwordStrength;

    if (strength <= 25) {
      return 'weak';
    }

    if (strength <= 50) {
      return 'fair';
    }

    if (strength <= 75) {
      return 'good';
    }

    return 'strong';
  }

  get passwordStrengthLabel(): string {
    const labels: Record<string, string> = {
      weak: 'Débil',
      fair: 'Regular',
      good: 'Buena',
      strong: 'Fuerte'
    };

    return labels[this.passwordStrengthClass];
  }

  get canChangePassword(): boolean {
    return (
      !!this.passwords.current &&
      !!this.passwords.new &&
      this.passwords.new === this.passwords.confirm &&
      this.passwordStrength >= 50
    );
  }

  ngOnInit(): void {
    const userId = this.authService.getCurrentUserId();

    if (!userId) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadUser(userId);
    this.loadVehicles(userId);
    this.loadLocalStats();
    this.loadPreferences();
  }

  onAvatarChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = e => this.avatarPreview = e.target?.result as string;
    reader.readAsDataURL(file);
  }

  saveProfile(): void {
    const userId = this.authService.getCurrentUserId();

    if (!userId) {
      this.router.navigate(['/login']);
      return;
    }

    this.saving = true;
    this.saveSuccess = false;
    this.saveError = '';

    this.authService.updateUser(userId, {
      name: this.form.name,
      mail: this.form.mail
    }).subscribe({
      next: (res: any) => {
        this.user = res;
        this.saving = false;
        this.saveSuccess = true;
        this.userInitials = this.buildInitials(this.form.name);

        localStorage.setItem('user_name', res.name ?? this.form.name);
        localStorage.setItem('user_mail', res.mail ?? this.form.mail);
        localStorage.setItem('profile_extra_data', JSON.stringify({
          phone: this.form.phone,
          city: this.form.city,
          bio: this.form.bio
        }));

        setTimeout(() => this.saveSuccess = false, 3000);
      },
      error: () => {
        this.saving = false;
        this.saveError = 'No se pudieron guardar los cambios.';
      }
    });
  }

  resetForm(): void {
    if (!this.user) {
      return;
    }

    const extraData = this.getProfileExtraData();

    this.form.name = this.user.name ?? '';
    this.form.mail = this.user.mail ?? '';
    this.form.phone = extraData.phone ?? '';
    this.form.city = extraData.city ?? '';
    this.form.bio = extraData.bio ?? '';
  }

  changePassword(): void {
    if (!this.canChangePassword) {
      return;
    }

    alert('Cambio de contraseña pendiente de endpoint en backend.');
    this.passwords = { current: '', new: '', confirm: '' };
  }

  addVehicle(): void {
    const userId = this.authService.getCurrentUserId();

    if (!userId || !this.newVehicle.brand || !this.newVehicle.model || !this.newVehicle.fuel_type) {
      this.vehicleError = 'Rellena marca, modelo y tipo de combustible.';
      return;
    }

    const payload: VehiclePayload = {
      type: 'CAR',
      brand: this.newVehicle.brand,
      model: this.newVehicle.model,
      plate: this.newVehicle.plate || null,
      fuel_type: this.newVehicle.fuel_type,
      is_electric: this.newVehicle.fuel_type === 'electric' || this.newVehicle.fuel_type === 'hybrid'
    };

    this.vehicleService.createVehicle(userId, payload).subscribe({
      next: (vehicle: BackendVehicle) => {
        this.vehicles.unshift(vehicle);
        this.resetNewVehicle();
        this.addingVehicle = false;
        this.vehicleError = '';
      },
      error: () => {
        this.vehicleError = 'No se pudo guardar el vehículo.';
      }
    });
  }

  removeVehicle(index: number): void {
    const userId = this.authService.getCurrentUserId();
    const vehicle = this.vehicles[index];

    if (!userId || !vehicle) {
      return;
    }

    this.vehicleService.deleteVehicle(userId, vehicle.id).subscribe({
      next: () => {
        this.vehicles.splice(index, 1);
      },
      error: () => {
        this.vehicleError = 'No se pudo eliminar el vehículo.';
      }
    });
  }

  resetNewVehicle(): void {
    this.newVehicle = {
      brand: '',
      model: '',
      plate: '',
      fuel_type: ''
    };
  }

  savePrefs(): void {
    localStorage.setItem('eco_prefs', JSON.stringify(this.prefs));
    alert('Preferencias guardadas');
  }

  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private loadUser(userId: number): void {
    this.authService.getUser(userId).subscribe({
      next: (res: any) => {
        const extraData = this.getProfileExtraData();

        this.user = res;
        this.form.name = res.name ?? '';
        this.form.mail = res.mail ?? '';
        this.form.phone = extraData.phone ?? '';
        this.form.city = extraData.city ?? '';
        this.form.bio = extraData.bio ?? '';
        this.userInitials = this.buildInitials(res.name);
        this.ecoScore = res.eco_score ?? 75;
      },
      error: () => {
        this.router.navigate(['/login']);
      }
    });
  }

  private loadVehicles(userId: number): void {
    this.vehicleService.getVehicles(userId).subscribe({
      next: (vehicles: BackendVehicle[]) => {
        this.vehicles = vehicles;
      },
      error: () => {
        this.vehicleError = 'No se pudieron cargar los vehículos.';
      }
    });
  }

  private loadLocalStats(): void {
    const storedRoutes = localStorage.getItem('saved_routes');
    this.savedRoutesCount = storedRoutes ? JSON.parse(storedRoutes).length : 0;
    this.searchCount = Number(localStorage.getItem('search_count') ?? 0);
  }

  private loadPreferences(): void {
    const storedPrefs = localStorage.getItem('eco_prefs');

    if (storedPrefs) {
      this.prefs = { ...this.prefs, ...JSON.parse(storedPrefs) };
    }
  }

  private getProfileExtraData(): { phone?: string; city?: string; bio?: string } {
    const storedData = localStorage.getItem('profile_extra_data');

    if (!storedData) {
      return {};
    }

    try {
      return JSON.parse(storedData);
    } catch {
      return {};
    }
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

  @HostListener('document:click', ['$event'])
  clickOut(event: Event): void {
    const target = event.target as HTMLElement;

    if (!target.closest('.nav-actions')) {
      this.userMenuOpen = false;
    }
  }
}
