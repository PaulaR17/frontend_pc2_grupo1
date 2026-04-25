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

  onLogin(): void {
    if (this.loginData.mail === '' || this.loginData.password === '') {
      this.errorMessage = 'Rellena el email y la contraseña.';
      return;
    }

    this.authService.login(this.loginData).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err: any) => {
        this.errorMessage = 'Credenciales incorrectas.';
        console.error('Error de acceso:', err);
      }
    });
  }
}