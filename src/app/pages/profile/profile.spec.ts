import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ProfileComponent } from './profile';
import { AuthService } from '../../core/services/auth';

// ── Mock AuthService ───────────────────────────────────────
const mockUser = {
  name: 'Ana García',
  mail: 'ana@ecotraffic.es',
  phone: '+34 600 000 000',
  city: 'Madrid',
  bio: 'Usuaria eco',
  eco_score: 82
};

const authServiceSpy = jasmine.createSpyObj('AuthService', ['getUser', 'logout']);
authServiceSpy.getUser.and.returnValue(of(mockUser));

// ── Suite ─────────────────────────────────────────────────
describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;

  beforeEach(async () => {
    // Clean localStorage between tests
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [ProfileComponent, CommonModule, FormsModule, RouterModule.forRoot([])],
      providers: [{ provide: AuthService, useValue: authServiceSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  // ── Creation ──────────────────────────────────────────────
  describe('Initialisation', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should call getUser on init', () => {
      expect(authServiceSpy.getUser).toHaveBeenCalledWith(1);
    });

    it('should populate form fields from the user response', () => {
      expect(component.form.name).toBe('Ana García');
      expect(component.form.mail).toBe('ana@ecotraffic.es');
      expect(component.form.phone).toBe('+34 600 000 000');
      expect(component.form.city).toBe('Madrid');
      expect(component.form.bio).toBe('Usuaria eco');
    });

    it('should set ecoScore from user response', () => {
      expect(component.ecoScore).toBe(82);
    });

    it('should default activeSection to "personal"', () => {
      expect(component.activeSection).toBe('personal');
    });

    it('should start with userMenuOpen = false', () => {
      expect(component.userMenuOpen).toBeFalse();
    });
  });

  // ── Initials ──────────────────────────────────────────────
  describe('buildInitials()', () => {
    it('should return two uppercase letters for a full name', () => {
      expect(component['buildInitials']('Ana García')).toBe('AG');
    });

    it('should return one uppercase letter for a single-word name', () => {
      expect(component['buildInitials']('Ana')).toBe('A');
    });

    it('should handle extra spaces gracefully', () => {
      expect(component['buildInitials']('  Carlos  López  ')).toBe('CL');
    });

    it('should return "?" for an empty string', () => {
      expect(component['buildInitials']('')).toBe('?');
    });
  });

  // ── Avatar ────────────────────────────────────────────────
  describe('onAvatarChange()', () => {
    it('should set avatarPreview when a valid file is selected', fakeAsync(() => {
      const fakeDataUrl = 'data:image/png;base64,abc123';
      const file = new File([''], 'avatar.png', { type: 'image/png' });

      // Spy on FileReader to avoid actual async FS read
      spyOn(window as any, 'FileReader').and.returnValue({
        readAsDataURL: function () { this.onload({ target: { result: fakeDataUrl } }); },
        onload: null
      });

      const event = { target: { files: [file] } } as unknown as Event;
      component.onAvatarChange(event);
      tick();

      expect(component.avatarPreview).toBe(fakeDataUrl);
    }));

    it('should do nothing when no file is selected', () => {
      const event = { target: { files: [] } } as unknown as Event;
      component.onAvatarChange(event);
      expect(component.avatarPreview).toBeNull();
    });
  });

  // ── Personal form ─────────────────────────────────────────
  describe('saveProfile()', () => {
    it('should set saving = true immediately', () => {
      component.saveProfile();
      expect(component.saving).toBeTrue();
    });

    it('should set saveSuccess = true after save completes', fakeAsync(() => {
      component.saveProfile();
      tick(900);
      expect(component.saveSuccess).toBeTrue();
    }));

    it('should clear saveSuccess after 3 seconds', fakeAsync(() => {
      component.saveProfile();
      tick(900 + 3000);
      expect(component.saveSuccess).toBeFalse();
    }));

    it('should update userInitials with the new name', fakeAsync(() => {
      component.form.name = 'Pedro Martínez';
      component.saveProfile();
      tick(900);
      expect(component.userInitials).toBe('PM');
    }));
  });

  describe('resetForm()', () => {
    it('should restore form values from the original user object', () => {
      component.form.name = 'Nombre Cambiado';
      component.form.city = 'Barcelona';
      component.resetForm();
      expect(component.form.name).toBe('Ana García');
      expect(component.form.city).toBe('Madrid');
    });

    it('should do nothing when user is null', () => {
      component['user'] = null;
      expect(() => component.resetForm()).not.toThrow();
    });
  });

  // ── Password strength ─────────────────────────────────────
  describe('passwordStrength', () => {
    it('should return 0 for an empty password', () => {
      component.passwords.new = '';
      expect(component.passwordStrength).toBe(0);
    });

    it('should return 25 for a short lowercase password', () => {
      component.passwords.new = 'abcdefgh'; // only length passes
      expect(component.passwordStrength).toBe(25);
    });

    it('should return 100 for a strong password', () => {
      component.passwords.new = 'Str0ng!Pass';
      expect(component.passwordStrength).toBe(100);
    });

    it('should label 25 as "weak"', () => {
      component.passwords.new = 'abcdefgh';
      expect(component.passwordStrengthClass).toBe('weak');
      expect(component.passwordStrengthLabel).toBe('Débil');
    });

    it('should label 100 as "strong"', () => {
      component.passwords.new = 'Str0ng!Pass';
      expect(component.passwordStrengthClass).toBe('strong');
      expect(component.passwordStrengthLabel).toBe('Fuerte');
    });
  });

  describe('canChangePassword', () => {
    it('should be false when any field is empty', () => {
      component.passwords = { current: '', new: '', confirm: '' };
      expect(component.canChangePassword).toBeFalse();
    });

    it('should be false when new and confirm do not match', () => {
      component.passwords = { current: 'old', new: 'Str0ng!Pass', confirm: 'different' };
      expect(component.canChangePassword).toBeFalse();
    });

    it('should be false when password strength is below 50', () => {
      component.passwords = { current: 'old', new: 'abcdefgh', confirm: 'abcdefgh' };
      expect(component.canChangePassword).toBeFalse();
    });

    it('should be true when all conditions are met', () => {
      component.passwords = { current: 'oldPass1', new: 'Str0ng!Pass', confirm: 'Str0ng!Pass' };
      expect(component.canChangePassword).toBeTrue();
    });
  });

  // ── Vehicles ──────────────────────────────────────────────
  describe('addVehicle()', () => {
    it('should not add a vehicle when brand is missing', () => {
      component.newVehicle = { brand: '', model: 'Focus', plate: '1234 ABC', type: 'gasolina' };
      component.addVehicle();
      expect(component.vehicles.length).toBe(0);
    });

    it('should not add a vehicle when model is missing', () => {
      component.newVehicle = { brand: 'Ford', model: '', plate: '1234 ABC', type: 'gasolina' };
      component.addVehicle();
      expect(component.vehicles.length).toBe(0);
    });

    it('should add a vehicle when brand and model are provided', () => {
      component.newVehicle = { brand: 'Toyota', model: 'Prius', plate: '5678 XYZ', type: 'hibrido' };
      component.addVehicle();
      expect(component.vehicles.length).toBe(1);
      expect(component.vehicles[0].brand).toBe('Toyota');
    });

    it('should prepend the new vehicle (unshift)', () => {
      component.vehicles = [{ brand: 'Ford', model: 'Focus', plate: '0000 AA', type: 'gasolina' }];
      component.newVehicle = { brand: 'Tesla', model: 'Model 3', plate: '9999 ZZ', type: 'electrico' };
      component.addVehicle();
      expect(component.vehicles[0].brand).toBe('Tesla');
    });

    it('should reset newVehicle after adding', () => {
      component.newVehicle = { brand: 'Seat', model: 'León', plate: '1111 BB', type: 'diesel' };
      component.addVehicle();
      expect(component.newVehicle.brand).toBe('');
      expect(component.newVehicle.model).toBe('');
    });

    it('should close the add form after adding', () => {
      component.addingVehicle = true;
      component.newVehicle = { brand: 'Seat', model: 'León', plate: '1111 BB', type: 'diesel' };
      component.addVehicle();
      expect(component.addingVehicle).toBeFalse();
    });

    it('should persist vehicles to localStorage', () => {
      component.newVehicle = { brand: 'Renault', model: 'Zoe', plate: '2222 CC', type: 'electrico' };
      component.addVehicle();
      const stored = JSON.parse(localStorage.getItem('vehicles') ?? '[]');
      expect(stored.length).toBe(1);
      expect(stored[0].brand).toBe('Renault');
    });
  });

  describe('removeVehicle()', () => {
    beforeEach(() => {
      component.vehicles = [
        { brand: 'Toyota', model: 'Prius', plate: '1111', type: 'hibrido' },
        { brand: 'Ford',   model: 'Focus', plate: '2222', type: 'gasolina' }
      ];
    });

    it('should remove the vehicle at the given index', () => {
      component.removeVehicle(0);
      expect(component.vehicles.length).toBe(1);
      expect(component.vehicles[0].brand).toBe('Ford');
    });

    it('should update localStorage after removal', () => {
      component.removeVehicle(1);
      const stored = JSON.parse(localStorage.getItem('vehicles') ?? '[]');
      expect(stored.length).toBe(1);
      expect(stored[0].brand).toBe('Toyota');
    });
  });

  // ── Preferences ───────────────────────────────────────────
  describe('savePrefs()', () => {
    it('should save prefs to localStorage', () => {
      component.prefs.ecoRoutes = false;
      component.prefs.liveTraffic = true;
      component.savePrefs();
      const stored = JSON.parse(localStorage.getItem('eco_prefs') ?? '{}');
      expect(stored.ecoRoutes).toBeFalse();
      expect(stored.liveTraffic).toBeTrue();
    });
  });

  describe('Preference defaults', () => {
    it('should restore prefs from localStorage on init', async () => {
      localStorage.setItem('eco_prefs', JSON.stringify({ emailNotifications: false, ecoRoutes: false }));

      // Re-create component to trigger ngOnInit with stored prefs
      fixture = TestBed.createComponent(ProfileComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.prefs.emailNotifications).toBeFalse();
      expect(component.prefs.ecoRoutes).toBeFalse();
    });
  });

  // ── Stats from localStorage ───────────────────────────────
  describe('Stats on init', () => {
    it('should read savedRoutesCount from localStorage', async () => {
      localStorage.setItem('saved_routes', JSON.stringify([{}, {}, {}]));

      fixture = TestBed.createComponent(ProfileComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.savedRoutesCount).toBe(3);
    });

    it('should default savedRoutesCount to 0 when localStorage is empty', () => {
      expect(component.savedRoutesCount).toBe(0);
    });
  });

  // ── User menu ─────────────────────────────────────────────
  describe('toggleUserMenu()', () => {
    it('should open the menu when closed', () => {
      component.userMenuOpen = false;
      component.toggleUserMenu();
      expect(component.userMenuOpen).toBeTrue();
    });

    it('should close the menu when open', () => {
      component.userMenuOpen = true;
      component.toggleUserMenu();
      expect(component.userMenuOpen).toBeFalse();
    });
  });

  // ── Auth ─────────────────────────────────────────────────
  describe('logout()', () => {
    it('should call authService.logout', () => {
      component.logout();
      expect(authServiceSpy.logout).toHaveBeenCalled();
    });
  });

  // ── Section navigation ────────────────────────────────────
  describe('activeSection', () => {
    it('should switch to "seguridad"', () => {
      component.activeSection = 'seguridad';
      expect(component.activeSection).toBe('seguridad');
    });

    it('should switch to "vehiculos"', () => {
      component.activeSection = 'vehiculos';
      expect(component.activeSection).toBe('vehiculos');
    });

    it('should switch to "preferencias"', () => {
      component.activeSection = 'preferencias';
      expect(component.activeSection).toBe('preferencias');
    });
  });

  // ── Edge: getUser error ───────────────────────────────────
  describe('getUser error handling', () => {
    it('should not throw when getUser returns an error', async () => {
      authServiceSpy.getUser.and.returnValue(throwError(() => new Error('Network error')));

      fixture = TestBed.createComponent(ProfileComponent);
      component = fixture.componentInstance;

      expect(() => fixture.detectChanges()).not.toThrow();
    });
  });
});
