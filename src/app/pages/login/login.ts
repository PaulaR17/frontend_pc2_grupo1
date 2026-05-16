import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  loginData = {
    mail: '',
    password: ''
  };

  errorMessage = '';
  successMessage = '';
  loading = false;

  //envia el formulario de login si esta relleno
  onLogin(): void {
    this.errorMessage = '';
    this.successMessage = '';

    const mail = this.loginData.mail.trim();
    const password = this.loginData.password.trim();
    const camposVacios = mail === '' || password === '';

    if (camposVacios) {
      this.errorMessage = 'Rellena el email y la contraseña.';
    } else {
      this.lanzarLogin();
    }
  }

  //hace la llamada y redirige segun el rol
  private lanzarLogin(): void {
    this.loading = true;

    this.authService.login(this.loginData).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'Inicio de sesión correcto.';
        this.redirigirSegunRol();
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = this.traducirErrorLogin(err);
        console.error('Error de acceso:', err);
      }
    });
  }

  //ADMIN al dashboard, USER a su home
  private redirigirSegunRol(): void {
    const esAdmin = this.authService.isAdmin();
    const destino = esAdmin ? '/dashboard' : '/user-home';
    this.router.navigate([destino]);
  }

  //traduce el error HTTP a un mensaje legible
  private traducirErrorLogin(err: any): string {
    let mensaje = 'No se pudo iniciar sesión. Revisa el backend.';

    if (err?.status === 401 || err?.status === 422) {
      mensaje = 'Credenciales incorrectas.';
    } else if (err?.status === 403) {
      mensaje = 'Este usuario está desactivado.';
    } else if (err?.status === 0) {
      mensaje = 'No se puede contactar con el servidor.';
    }

    return mensaje;
  }
}
