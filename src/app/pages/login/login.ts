import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth'; 

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
    // Validamos que no esté vacío antes de enviar
    if (this.loginData.mail !== '' && this.loginData.password !== '') {
      this.authService.login(this.loginData).subscribe({
        next: (response: any) => {
          // Guardamos el token si el backend lo envía
          if (response.token) {
            localStorage.setItem('token', response.token);
          }
          this.router.navigate(['/dashboard']);
        },
        error: (err: any) => { // Añadimos ': any' para quitar el error TS7006
          this.errorMessage = 'Credenciales incorrectas.';
          console.error('Error de acceso:', err);
        }
      });
    }
  }
}