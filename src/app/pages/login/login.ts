import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
// Importación exacta según tus archivos anteriores
import { AuthService } from '../../core/services/auth'; 

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html', // Ajustado: tu archivo se llama login.html
  styleUrls: ['./login.css']    // Ajustado: tu archivo se llama login.css
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  // 'mail' para que Laravel no te dé error de validación
  loginData = {
    mail: '',
    password: ''
  };

  errorMessage = '';

  onLogin(): void {
    this.authService.login(this.loginData).subscribe({
      next: () => {
        // Si el token es válido, saltamos al dashboard
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Credenciales incorrectas o error de conexión.';
      }
    });
  }
}