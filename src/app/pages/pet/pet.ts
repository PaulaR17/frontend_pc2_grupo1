import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { AuthService } from '../../core/services/auth';
import { PetService, Pet } from '../../core/services/pet';
import {
  ItemService,
  Item,
  InventoryRow,
  EquipmentRow,
  ItemType
} from '../../core/services/item';

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
  private itemService = inject(ItemService);

  pet: Pet | null = null;
  nombreEditable = '';

  //inventario del usuario + diccionario item_id -> Item para mostrar los detalles
  inventario: InventoryRow[] = [];
  itemsPorId: { [id: number]: Item } = {};

  //equipamiento actual: lo guardamos como diccionario slot -> item_id para
  //consultar rapidamente "que lleva puesto este usuario en el slot HAT"
  equipamiento: { [slot: string]: number } = {};

  //slots disponibles en el orden que se muestran (coincide con ItemType)
  readonly slots: ItemType[] = ['HAT', 'GLASSES', 'SUIT'];

  loading = true;
  saving = false;
  guardandoSlot: ItemType | null = null;
  errorMessage = '';
  successMessage = '';

  //XP que cuesta cada nivel
  readonly XP_POR_NIVEL = 100;

  ngOnInit(): void {
    this.cargarTodo();
  }

  //carga mascota + catalogo + inventario + equipamiento en cadena
  private cargarTodo(): void {
    const userId = this.authService.getCurrentUserId();

    if (userId === null) {
      this.errorMessage = 'No se ha podido identificar al usuario.';
      this.loading = false;
    } else {
      this.cargarMascota(userId);
    }
  }

  private cargarMascota(userId: number): void {
    this.petService.getPet(userId).subscribe({
      next: (mascota) => {
        this.pet = mascota;
        this.nombreEditable = mascota.name;
        this.cargarCatalogo(userId);
      },
      error: () => {
        this.errorMessage = 'No se pudo cargar tu mascota.';
        this.loading = false;
      }
    });
  }

  //necesitamos el catalogo para conocer nombre/tipo de cada item del inventario
  private cargarCatalogo(userId: number): void {
    this.itemService.getCatalog().subscribe({
      next: (lista) => {
        this.itemsPorId = {};
        for (const item of (lista || [])) {
          this.itemsPorId[item.id] = item;
        }
        this.cargarInventario(userId);
      },
      error: () => {
        this.errorMessage = 'No se pudo cargar el catalogo de items.';
        this.loading = false;
      }
    });
  }

  private cargarInventario(userId: number): void {
    this.itemService.getInventory(userId).subscribe({
      next: (filas) => {
        this.inventario = filas || [];
        this.cargarEquipamiento(userId);
      },
      error: () => {
        this.errorMessage = 'No se pudo cargar el inventario.';
        this.loading = false;
      }
    });
  }

  private cargarEquipamiento(userId: number): void {
    this.itemService.getEquipment(userId).subscribe({
      next: (filas) => {
        this.equipamiento = {};
        for (const fila of (filas || [])) {
          if (fila.item_id !== null) {
            this.equipamiento[fila.slot] = fila.item_id;
          }
        }
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'No se pudo cargar el equipamiento.';
        this.loading = false;
      }
    });
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

  //manda el PUT de la mascota y refresca el estado
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

  //devuelve los items del inventario que encajan con un slot (segun su type)
  itemsParaSlot(slot: ItemType): Item[] {
    const resultado: Item[] = [];

    for (const fila of this.inventario) {
      const item = this.itemsPorId[fila.item_id];
      if (item && item.type === slot) {
        resultado.push(item);
      }
    }

    return resultado;
  }

  //devuelve el item que el usuario lleva equipado en un slot (o null si nada)
  itemEquipado(slot: ItemType): Item | null {
    let resultado: Item | null = null;
    const itemId = this.equipamiento[slot];

    if (itemId && this.itemsPorId[itemId]) {
      resultado = this.itemsPorId[itemId];
    }

    return resultado;
  }

  //true si el usuario lleva equipado ESE item concreto en su slot
  estaEquipado(item: Item): boolean {
    return this.equipamiento[item.type] === item.id;
  }

  //equipa un item; el slot se deduce del tipo del item
  equipar(item: Item): void {
    this.limpiarMensajes();

    const userId = this.authService.getCurrentUserId();

    if (userId === null) {
      this.errorMessage = 'No se ha podido identificar al usuario.';
    } else {
      this.guardandoSlot = item.type;

      this.itemService.updateEquipment(userId, item.type, item.id).subscribe({
        next: () => {
          this.equipamiento[item.type] = item.id;
          this.successMessage = `"${item.name}" equipado.`;
          this.guardandoSlot = null;
        },
        error: () => {
          this.errorMessage = 'No se pudo equipar el item.';
          this.guardandoSlot = null;
        }
      });
    }
  }

  //desequipa el item del slot indicado
  desequipar(slot: ItemType): void {
    this.limpiarMensajes();

    const userId = this.authService.getCurrentUserId();

    if (userId === null) {
      this.errorMessage = 'No se ha podido identificar al usuario.';
    } else {
      this.guardandoSlot = slot;

      this.itemService.updateEquipment(userId, slot, null).subscribe({
        next: () => {
          delete this.equipamiento[slot];
          this.successMessage = 'Item desequipado.';
          this.guardandoSlot = null;
        },
        error: () => {
          this.errorMessage = 'No se pudo desequipar el item.';
          this.guardandoSlot = null;
        }
      });
    }
  }

  //etiqueta legible para cada slot (en español)
  nombreSlot(slot: ItemType): string {
    let etiqueta: string = slot;

    if (slot === 'HAT') {
      etiqueta = 'Sombrero';
    } else if (slot === 'GLASSES') {
      etiqueta = 'Gafas';
    } else if (slot === 'SUIT') {
      etiqueta = 'Traje';
    }

    return etiqueta;
  }

  //color del badge segun la rareza del item (mismo criterio que la tienda)
  colorRareza(rareza: string | null): string {
    let color = 'bg-secondary';

    if (rareza === 'common') {
      color = 'bg-secondary';
    } else if (rareza === 'rare') {
      color = 'bg-primary';
    } else if (rareza === 'epic') {
      color = 'bg-warning text-dark';
    } else if (rareza === 'legendary') {
      color = 'bg-danger';
    }

    return color;
  }

  private limpiarMensajes(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  volver(): void {
    this.router.navigate(['/user-home']);
  }
}
