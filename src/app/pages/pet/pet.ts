import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { AuthService } from '../../core/services/auth';
import { PetService, Pet } from '../../core/services/pet';

//pagina de la mascota del usuario
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

  pet: Pet | null = null;
  nombreEditable = '';

  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';

  //XP que cuesta cada nivel
  readonly XP_POR_NIVEL = 100;

  ngOnInit(): void {
    this.cargarMascota();
  }

  //pide la mascota del usuario actual
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

  //0-100 para la barra de progreso del nivel
  porcentajeXp(): number {
    let resultado = 0;

    if (this.pet) {
      const xpDelNivel = this.pet.xp % this.XP_POR_NIVEL;
      resultado = Math.round((xpDelNivel / this.XP_POR_NIVEL) * 100);
    }

    return resultado;
  }

  //XP dentro del nivel actual
  xpActualNivel(): number {
    let resultado = 0;

    if (this.pet) {
      resultado = this.pet.xp % this.XP_POR_NIVEL;
    }

    return resultado;
  }

  //guarda el nombre nuevo
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

  //da 10 XP y sube de nivel si toca
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

  //manda el PUT y refresca la mascota
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

  private limpiarMensajes(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  volver(): void {
    this.router.navigate(['/user-home']);
  }
}
