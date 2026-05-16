import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { AuthService } from '../../core/services/auth';
import { PetService, Pet } from '../../core/services/pet';

// Página "Mi mascota": muestra y permite editar la mascota
// virtual del usuario (nombre, nivel y barra de experiencia).

@Component({
  selector: 'app-pet',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './pet.html',
  styleUrls: ['./pet.scss']
})
export class PetComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  private petService = inject(PetService);

  // Datos que pinta la vista.
  pet: Pet | null = null;
  nombreEditable = '';

  // Mensajes para el usuario.
  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';

  // Cuánta experiencia necesita cada nivel.
  // Lo dejamos como constante para que sea fácil cambiarlo.
  readonly XP_POR_NIVEL = 100;

  ngOnInit(): void {
    this.cargarMascota();
  }

  // -------------------------------------------------------
  //  CARGA DE DATOS
  // -------------------------------------------------------

  private cargarMascota(): void {
    const userId = this.authService.getCurrentUserId();

    if (userId === null) {
      this.errorMessage = 'No se ha podido identificar al usuario.';
      this.loading = false;
    } else {
      this.petService.getPet(userId).subscribe({
        next: (mascota) => {
          this.pet = mascota;
          this.nombreEditable = mascota.name;
          this.loading = false;
        },
        error: () => {
          this.errorMessage = 'No se pudo cargar tu mascota.';
          this.loading = false;
        }
      });
    }
  }

  // -------------------------------------------------------
  //  CÁLCULOS PARA LA VISTA
  // -------------------------------------------------------

  // Porcentaje de la barra de progreso (0-100).
  porcentajeXp(): number {
    let resultado = 0;

    if (this.pet) {
      const xpDelNivel = this.pet.xp % this.XP_POR_NIVEL;
      resultado = Math.round((xpDelNivel / this.XP_POR_NIVEL) * 100);
    }

    return resultado;
  }

  // XP que lleva acumulada en el nivel actual.
  xpActualNivel(): number {
    let resultado = 0;

    if (this.pet) {
      resultado = this.pet.xp % this.XP_POR_NIVEL;
    }

    return resultado;
  }

  // -------------------------------------------------------
  //  ACCIONES
  // -------------------------------------------------------

  // Guarda el nuevo nombre.
  guardarNombre(): void {
    this.limpiarMensajes();

    const userId = this.authService.getCurrentUserId();
    const nombreLimpio = this.nombreEditable.trim();
    const nombreValido = nombreLimpio.length > 0 && nombreLimpio.length <= 20;

    if (userId === null) {
      this.errorMessage = 'No se ha podido identificar al usuario.';
    } else if (!nombreValido) {
      this.errorMessage = 'El nombre debe tener entre 1 y 20 caracteres.';
    } else {
      this.lanzarActualizacion(userId, { name: nombreLimpio }, 'Nombre actualizado.');
    }
  }

  // Suma 10 puntos de XP. Si llega a XP_POR_NIVEL,
  // el nivel sube y la barra se reinicia.
  sumarXp(): void {
    this.limpiarMensajes();

    const userId = this.authService.getCurrentUserId();

    if (userId === null) {
      this.errorMessage = 'No se ha podido identificar al usuario.';
    } else if (this.pet) {
      const xpNueva = this.pet.xp + 10;
      const nivelNuevo = Math.floor(xpNueva / this.XP_POR_NIVEL) + 1;
      const subeNivel = nivelNuevo > this.pet.level;
      const mensaje = subeNivel ? '¡Has subido de nivel!' : 'Has ganado 10 XP.';

      this.lanzarActualizacion(
        userId,
        { xp: xpNueva, level: nivelNuevo },
        mensaje
      );
    }
  }

  // Llama al backend con los datos pasados y refresca la pantalla.
  private lanzarActualizacion(
    userId: number,
    payload: { name?: string; xp?: number; level?: number },
    mensajeExito: string
  ): void {
    this.saving = true;

    this.petService.updatePet(userId, payload).subscribe({
      next: (mascotaActualizada) => {
        this.pet = mascotaActualizada;
        this.nombreEditable = mascotaActualizada.name;
        this.successMessage = mensajeExito;
        this.saving = false;
      },
      error: () => {
        this.errorMessage = 'No se pudieron guardar los cambios.';
        this.saving = false;
      }
    });
  }

  // Reinicia los mensajes antes de cada acción.
  private limpiarMensajes(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  volver(): void {
    this.router.navigate(['/user-home']);
  }
}
