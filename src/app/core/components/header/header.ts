import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

// ============================================================
//  Header de EcoTraffic
//  Componente reutilizable que se muestra en TODAS las paginas.
//  - Muestra el logo "ECOTRAFFIC" como enlace al destino que
//    se le pase en "brandRoute" (por defecto "/").
//  - El hueco de la derecha usa <ng-content> para que cada
//    pagina meta sus propios botones (Volver, Login, etc.).
// ============================================================
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.html',
  styleUrls: ['./header.scss']
})
export class HeaderComponent {
  //a donde apunta el logo al hacer clic
  @Input() brandRoute: string = '/';

  //texto opcional que aparece como "etiqueta" al lado del logo
  //(p. ej. "ADMIN" en las pantallas de administracion)
  @Input() badge: string | null = null;
}
