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
        console.log('Respuesta recibida de Laravel:', res); // Esto saldrá en la consola (F12)
        
        // Intentamos sacar el mensaje del objeto res
        // Si no existe 'status', probamos con 'message', o mostramos el objeto entero
        const contenido = res.status || res.message || JSON.stringify(res);
        
        this.mensaje = 'conectao ' + contenido;
        this.conectado = true;
      },
      error: (err) => {
        this.mensaje = 'Error: NO conectao';
        this.conectado = false;
        console.error('Error en la suscripción:', err);
      }
    });
  }
}