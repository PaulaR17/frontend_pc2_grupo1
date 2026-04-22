import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { RouterOutlet } from '@angular/router';
import { ConexionService } from './conexion';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class AppComponent implements OnInit {
  private conexionService = inject(ConexionService);
  
  mensaje: string = 'Cargando conexión...';
  conectado: boolean = false;

  ngOnInit() {
    this.conexionService.probarConexion().subscribe({
      next: (res: any) => {
        this.mensaje = 'conectao ' + res.status;
        this.conectado = true;
      },
      error: (err) => {
        this.mensaje = 'Error no se ha podido conectar';
        this.conectado = false;
        console.error('Detalle del error:', err);
      }
    });
  }
}