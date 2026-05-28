import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { AuthService } from '../../core/services/auth';
import { FooterComponent } from '../../core/components/footer/footer';

// ============================================================
//  Landing publica de EcoTraffic
//  Pagina raiz "/" para TODOS (logueados o no). Si el usuario
//  ya tiene sesion, el boton principal le lleva a su panel; si
//  no, le lleva al registro.
// ============================================================
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, FooterComponent],
  templateUrl: './landing.html',
  styleUrls: ['./landing.scss']
})
export class LandingComponent {
  private auth = inject(AuthService);

  //si el usuario ya esta logueado mostramos otros botones
  estaLogueado: boolean = this.auth.isLoggedIn();

  //ruta del panel segun rol
  rutaPanel(): string {
    let destino = '/user-home';
    if (this.auth.isAdmin()) {
      destino = '/dashboard';
    }
    return destino;
  }
}
