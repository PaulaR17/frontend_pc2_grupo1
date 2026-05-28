import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../../core/components/header/header';
import { FooterComponent } from '../../core/components/footer/footer';

//recuperacion de contraseña, todavia sin endpoint en el backend
@Component({
  selector: 'app-recovery',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HeaderComponent, FooterComponent],
  templateUrl: './recovery.html',
  styleUrls: ['./recovery.scss']
})
export class RecoveryComponent {
  mail = '';
  enviado = false;
  errorMessage = '';

  //comprueba el correo y marca como enviado
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
