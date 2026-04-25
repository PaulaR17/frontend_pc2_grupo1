import { Component, OnInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth';

interface Vehicle {
  brand: string;
  model: string;
  plate: string;
  type: string;
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
  private router      = inject(Router);

  // ── User state ────────────────────────────────────────────
  user: any = null;
  userInitials = '';
  userMenuOpen = false;
  avatarPreview: string | null = null;

  // ── Active section ────────────────────────────────────────
  activeSection: 'personal' | 'seguridad' | 'vehiculos' | 'preferencias' = 'personal';

  // ── Stats ─────────────────────────────────────────────────
  searchCount       = 0;
  savedRoutesCount  = 0;
  ecoScore          = 0;

  // ── Personal form ─────────────────────────────────────────
  form = { name: '', mail: '', phone: '', city: '', bio: '' };
  saving     = false;
  saveSuccess = false;

  // ── Security ──────────────────────────────────────────────
  passwords = { current: '', new: '', confirm: '' };
  showPass  = { current: false, new: false, confirm: false };

  get passwordStrength(): number {
    const p = this.passwords.new;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 8)          score += 25;
    if (/[A-Z]/.test(p))        score += 25;
    if (/[0-9]/.test(p))        score += 25;
    if (/[^A-Za-z0-9]/.test(p)) score += 25;
    return score;
  }

  get passwordStrengthClass(): string {
    const s = this.passwordStrength;
    if (s <= 25) return 'weak';
    if (s <= 50) return 'fair';
    if (s <= 75) return 'good';
    return 'strong';
  }

  get passwordStrengthLabel(): string {
    const map: Record<string, string> = {
      weak: 'Débil', fair: 'Regular', good: 'Buena', strong: 'Fuerte'
    };
    return map[this.passwordStrengthClass];
  }

  get canChangePassword(): boolean {
    return (
      !!this.passwords.current &&
      !!this.passwords.new &&
      this.passwords.new === this.passwords.confirm &&
      this.passwordStrength >= 50
    );
  }

  // ── Vehicles ──────────────────────────────────────────────
  vehicles: Vehicle[] = [];
  addingVehicle = false;
  newVehicle: Vehicle = { brand: '', model: '', plate: '', type: '' };

  // ── Preferences ───────────────────────────────────────────
  prefs = {
    emailNotifications: true,
    ecoRoutes:          true,
    liveTraffic:        false,
    saveHistory:        true
  };

  // ─────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.authService.getUser(1).subscribe({
      next: (res: any) => {
        this.user = res;
        this.form.name = res.name ?? '';
        this.form.mail = res.mail ?? '';
        this.form.phone = res.phone ?? '';
        this.form.city  = res.city  ?? '';
        this.form.bio   = res.bio   ?? '';
        this.userInitials = this.buildInitials(res.name);
        this.ecoScore = res.eco_score ?? Math.floor(Math.random() * 40) + 60;
      }
    });

    const stored = localStorage.getItem('saved_routes');
    this.savedRoutesCount = stored ? JSON.parse(stored).length : 0;
    this.searchCount = Number(localStorage.getItem('search_count') ?? 0);

    const storedVehicles = localStorage.getItem('vehicles');
    if (storedVehicles) this.vehicles = JSON.parse(storedVehicles);

    const storedPrefs = localStorage.getItem('eco_prefs');
    if (storedPrefs) this.prefs = { ...this.prefs, ...JSON.parse(storedPrefs) };
  }

  // ── Avatar ────────────────────────────────────────────────
  onAvatarChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => this.avatarPreview = e.target?.result as string;
    reader.readAsDataURL(file);
  }

  // ── Personal ─────────────────────────────────────────────
  saveProfile(): void {
    this.saving = true;
    // Simulate API call
    setTimeout(() => {
      this.saving = false;
      this.saveSuccess = true;
      this.userInitials = this.buildInitials(this.form.name);
      setTimeout(() => this.saveSuccess = false, 3000);
    }, 900);
  }

  resetForm(): void {
    if (!this.user) return;
    this.form.name  = this.user.name  ?? '';
    this.form.mail  = this.user.mail  ?? '';
    this.form.phone = this.user.phone ?? '';
    this.form.city  = this.user.city  ?? '';
    this.form.bio   = this.user.bio   ?? '';
  }

  // ── Security ──────────────────────────────────────────────
  changePassword(): void {
    if (!this.canChangePassword) return;
    // TODO: call authService.changePassword(...)
    alert('Contraseña actualizada correctamente');
    this.passwords = { current: '', new: '', confirm: '' };
  }

  // ── Vehicles ──────────────────────────────────────────────
  addVehicle(): void {
    if (!this.newVehicle.brand || !this.newVehicle.model) return;
    this.vehicles.unshift({ ...this.newVehicle });
    localStorage.setItem('vehicles', JSON.stringify(this.vehicles));
    this.resetNewVehicle();
    this.addingVehicle = false;
  }

  removeVehicle(index: number): void {
    this.vehicles.splice(index, 1);
    localStorage.setItem('vehicles', JSON.stringify(this.vehicles));
  }

  resetNewVehicle(): void {
    this.newVehicle = { brand: '', model: '', plate: '', type: '' };
  }

  // ── Preferences ───────────────────────────────────────────
  savePrefs(): void {
    localStorage.setItem('eco_prefs', JSON.stringify(this.prefs));
    alert('Preferencias guardadas');
  }

  // ── Nav ───────────────────────────────────────────────────
  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private buildInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0][0].toUpperCase();
  }

  @HostListener('document:click', ['$event'])
  clickOut(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.nav-actions')) this.userMenuOpen = false;
  }
}
