import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Página "Recuperar contraseña".
// De momento es un placeholder: muestra un mensaje al usuario
// indicándole que la recuperación se gestiona por correo.
// Cuando el backend implemente /recovery se llamará desde aquí.

@Component({
  selector: 'app-recovery',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './recovery.html',
  styleUrls: ['./recovery.scss']
})
export class RecoveryComponent {
  mail = '';
  enviado = false;
  errorMessage = '';

  // Simula el envío de la petición.
  // Cuando exista el endpoint, aquí llamaremos al backend.
  enviarSolicitud(): void {
    this.errorMessage = '';

    const correoLimpio = this.mail.trim();
    const correoValido = correoLimpio.length > 0 && correoLimpio.includes('@');

    if (!correoValido) {
      this.errorMessage = 'Introduce un correo válido.';
    } else {
      this.enviado = true;
    }
  }
}
