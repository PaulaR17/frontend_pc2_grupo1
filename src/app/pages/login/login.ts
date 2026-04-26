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

  onLogin(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.loginData.mail.trim() === '' || this.loginData.password.trim() === '') {
      this.errorMessage = 'Rellena el email y la contraseña.';
      return;
    }

    this.loading = true;

    this.authService.login(this.loginData).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'Inicio de sesión correcto.';
        this.router.navigate(['/user-home']);
      },
      error: (err: any) => {
        this.loading = false;

        if (err.status === 422 || err.status === 401) {
          this.errorMessage = 'Credenciales incorrectas.';
          return;
        }

        if (err.status === 403) {
          this.errorMessage = 'Este usuario está desactivado.';
          return;
        }

        this.errorMessage = 'No se pudo iniciar sesión. Revisa el backend.';
        console.error('Error de acceso:', err);
      }
    });
  }
}