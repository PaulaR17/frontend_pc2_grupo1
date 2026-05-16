import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

// Componente raíz: solo monta el router-outlet.
// Toda la lógica vive en las páginas (src/app/pages/...).
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class AppComponent {}
