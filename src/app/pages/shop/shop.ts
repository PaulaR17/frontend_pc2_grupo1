import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth';
import {
  ItemService,
  Item,
  InventoryRow,
  UserBadge,
  ItemType
} from '../../core/services/item';

// Página "Tienda" con tres pestañas:
//   - Catálogo: todos los items activos.
//   - Inventario: items que ya tiene el usuario.
//   - Chapitas: badges (recompensas) conseguidas.

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './shop.html',
  styleUrls: ['./shop.scss']
})
export class ShopComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  private itemService = inject(ItemService);

  // Pestaña visible. Empezamos en el catálogo.
  pestanaActiva: 'catalogo' | 'inventario' | 'chapitas' = 'catalogo';

  // Datos cargados del backend.
  catalogo: Item[] = [];
  inventario: InventoryRow[] = [];
  chapitas: UserBadge[] = [];

  // Diccionario item_id -> Item para mostrar el detalle
  // de cada fila del inventario sin volver a pedir nada.
  itemsPorId: { [id: number]: Item } = {};

  loading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.cargarTodo();
  }

  // -------------------------------------------------------
  //  CARGA DE DATOS
  // -------------------------------------------------------

  // Hace las 3 peticiones en cadena (catalogo → inventario → logros)
  // para mantener la lógica simple y fácil de seguir.
  private cargarTodo(): void {
    const userId = this.authService.getCurrentUserId();

    if (userId === null) {
      this.errorMessage = 'No se ha podido identificar al usuario.';
      this.loading = false;
    } else {
      this.cargarCatalogo(userId);
    }
  }

  private cargarCatalogo(userId: number): void {
    this.itemService.getCatalog().subscribe({
      next: (lista) => {
        this.catalogo = (lista || []).filter(item => item.active);
        this.guardarItemsPorId(this.catalogo);
        this.cargarInventario(userId);
      },
      error: () => {
        this.errorMessage = 'No se pudo cargar el catálogo.';
        this.loading = false;
      }
    });
  }

  private cargarInventario(userId: number): void {
    this.itemService.getInventory(userId).subscribe({
      next: (filas) => {
        this.inventario = filas || [];
        this.cargarChapitas(userId);
      },
      error: () => {
        this.errorMessage = 'No se pudo cargar el inventario.';
        this.loading = false;
      }
    });
  }

  private cargarChapitas(userId: number): void {
    this.itemService.getBadges(userId).subscribe({
      next: (filas) => {
        this.chapitas = filas || [];
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'No se pudieron cargar las chapitas.';
        this.loading = false;
      }
    });
  }

  // Rellena el diccionario id -> item con la lista del catálogo.
  private guardarItemsPorId(items: Item[]): void {
    this.itemsPorId = {};

    for (const item of items) {
      this.itemsPorId[item.id] = item;
    }
  }

  // -------------------------------------------------------
  //  AYUDANTES PARA LA VISTA
  // -------------------------------------------------------

  // Devuelve el item asociado a una fila del inventario.
  itemDeInventario(fila: InventoryRow): Item | null {
    let resultado: Item | null = null;

    if (this.itemsPorId[fila.item_id]) {
      resultado = this.itemsPorId[fila.item_id];
    }

    return resultado;
  }

  // Texto bonito para el tipo de item.
  etiquetaTipo(tipo: ItemType): string {
    let etiqueta: string = tipo;

    if (tipo === 'HAT') {
      etiqueta = 'Sombrero';
    } else if (tipo === 'GLASSES') {
      etiqueta = 'Gafas';
    } else if (tipo === 'SUIT') {
      etiqueta = 'Traje';
    }

    return etiqueta;
  }

  // Color del badge según la rareza del item.
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

  // Texto bonito según el código de la chapita.
  textoChapita(code: string): string {
    let texto = code;

    if (code === 'FIRST_ROUTE') {
      texto = 'Primera ruta calculada';
    } else if (code === 'ECO_DRIVER') {
      texto = 'Conductor sostenible';
    } else if (code === 'EXPLORER') {
      texto = 'Explorador de Madrid';
    }

    return texto;
  }

  cambiarPestana(nombre: 'catalogo' | 'inventario' | 'chapitas'): void {
    this.pestanaActiva = nombre;
  }

  volver(): void {
    this.router.navigate(['/user-home']);
  }
}
