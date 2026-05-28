import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

// ============================================================
//  Footer de EcoTraffic
//  Componente reutilizable, se incluye en todas las paginas
//  que NO ocupan el alto completo de la pantalla con un mapa.
// ============================================================
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './footer.html',
  styleUrls: ['./footer.scss']
})
export class FooterComponent {
  //año dinamico, asi no hay que tocarlo cada enero
  anioActual: number = new Date().getFullYear();
}
