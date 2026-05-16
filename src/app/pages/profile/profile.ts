import { Component, OnInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { BackendVehicle, VehicleService } from '../../core/services/vehicle';
import { ItemService, UserBadge } from '../../core/services/item';

//perfil del usuario con sus datos, vehiculos y chapitas
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
  private itemService = inject(ItemService);
  private router = inject(Router);

  user: any = null;
  userInitials = '';
  userMenuOpen = false;
  avatarPreview: string | null = null;

  activeSection: 'personal' | 'vehiculos' | 'chapitas' | 'preferencias' = 'personal';

  chapitas: UserBadge[] = [];
  chapitasError = '';

  searchCount = 0;
  savedRoutesCount = 0;
  ecoScore = 0;

  form = { name: '', mail: '', phone: '', city: '', bio: '' };
  saving = false;
  saveSuccess = false;
  saveError = '';

  vehicles: BackendVehicle[] = [];
  vehicleError = '';

  prefs = {
    emailNotifications: true,
    ecoRoutes: true,
    liveTraffic: false,
    saveHistory: true
  };

  ngOnInit(): void {
    const userId = this.authService.getCurrentUserId();

    if (!userId) {
      this.router.navigate(['/login']);
    } else {
      this.loadUser(userId);
      this.loadVehicles(userId);
      this.loadChapitas(userId);
      this.loadLocalStats();
      this.loadPreferences();
    }
  }

  //chapitas conseguidas
  private loadChapitas(userId: number): void {
    this.itemService.getBadges(userId).subscribe({
      next: (filas) => {
        this.chapitas = filas || [];
      },
      error: () => {
        this.chapitasError = 'No se pudieron cargar las chapitas.';
      }
    });
  }

  //etiqueta legible para cada chapita
  textoChapita(code: string): string {
    let texto = code;

    if (code === 'FIRST_ROUTE') {
      texto = 'Primera ruta calculada';
    } else if (code === 'ECO_DRIVER') {
      texto = 'Conductor sostenible';
    } else if (code === 'EXPLORER') {
      texto = 'Explorador de Madrid';
    }

    return texto;
  }

  //preview del avatar elegido
  onAvatarChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = e => this.avatarPreview = e.target?.result as string;
      reader.readAsDataURL(file);
    }
  }

  //guarda los datos personales
  saveProfile(): void {
    const userId = this.authService.getCurrentUserId();

    if (!userId) {
      this.router.navigate(['/login']);
    } else {
      this.lanzarGuardado(userId);
    }
  }

  private lanzarGuardado(userId: number): void {
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

        //telefono, ciudad y bio solo en localStorage, el backend no los tiene
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

  //vuelve al estado inicial del formulario
  resetForm(): void {
    if (this.user) {
      const extraData = this.getProfileExtraData();
      this.form.name = this.user.name ?? '';
      this.form.mail = this.user.mail ?? '';
      this.form.phone = extraData.phone ?? '';
      this.form.city = extraData.city ?? '';
      this.form.bio = extraData.bio ?? '';
    }
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
      error: () => this.router.navigate(['/login'])
    });
  }

  private loadVehicles(userId: number): void {
    this.vehicleService.getVehicles(userId).subscribe({
      next: (vehicles: BackendVehicle[]) => this.vehicles = vehicles,
      error: () => this.vehicleError = 'No se pudieron cargar los vehículos.'
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

  //lee phone, city y bio del localStorage
  private getProfileExtraData(): { phone?: string; city?: string; bio?: string } {
    const storedData = localStorage.getItem('profile_extra_data');
    let data: { phone?: string; city?: string; bio?: string } = {};

    if (storedData) {
      try {
        data = JSON.parse(storedData);
      } catch {
        data = {};
      }
    }
    return data;
  }

  //iniciales del nombre para el avatar
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

  //cierra el menu si haces click fuera de la navbar
  @HostListener('document:click', ['$event'])
  clickOut(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.navbar')) {
      this.userMenuOpen = false;
    }
  }
}
