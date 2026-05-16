import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

//componente raiz, solo monta el router-outlet
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class AppComponent {}
