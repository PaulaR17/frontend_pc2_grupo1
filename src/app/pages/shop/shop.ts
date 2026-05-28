import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth';
import {
  ItemService,
  Item,
  InventoryRow,
  UserBadge,
  ItemType,
  WalletInfo
} from '../../core/services/item';
import { HeaderComponent } from '../../core/components/header/header';
import { FooterComponent } from '../../core/components/footer/footer';

//pagina "tienda" con tres pestañas:
//  catalogo   -> todos los items activos
//  inventario -> items que ya tiene el usuario
//  chapitas   -> recompensas (badges) conseguidas
@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule, HeaderComponent, FooterComponent],
  templateUrl: './shop.html',
  styleUrls: ['./shop.scss']
})
export class ShopComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  private itemService = inject(ItemService);

  pestanaActiva: 'catalogo' | 'inventario' | 'chapitas' = 'catalogo';

  catalogo: Item[] = [];
  inventario: InventoryRow[] = [];
  chapitas: UserBadge[] = [];

  //diccionario item_id -> Item para mostrar el detalle de cada fila
  //del inventario sin volver a pedir nada al backend
  itemsPorId: { [id: number]: Item } = {};

  loading = true;
  errorMessage = '';

  //balance actual de chapitas (suma de transactions) y aviso de operacion
  balance = 0;
  comprando = false;
  itemEnCompra: number | null = null;
  mensajeCompra = '';
  mensajeCompraTipo: 'success' | 'error' | '' = '';

  ngOnInit(): void {
    this.cargarTodo();
  }

  //hace las 3 peticiones en cadena (catalogo -> inventario -> chapitas)
  //para mantener la logica simple y facil de seguir
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
        this.cargarWallet(userId);
      },
      error: () => {
        this.errorMessage = 'No se pudieron cargar las chapitas.';
        this.loading = false;
      }
    });
  }

  private cargarWallet(userId: number): void {
    this.itemService.getWallet(userId).subscribe({
      next: (info: WalletInfo) => {
        this.balance = info.balance;
        this.loading = false;
      },
      error: () => {
        this.balance = 0;
        this.loading = false;
      }
    });
  }

  //compra un item; muestra mensaje claro si falta saldo o si ya lo tenia.
  //tras una compra correcta refresca inventario y balance
  comprarItem(item: Item): void {
    const userId = this.authService.getCurrentUserId();

    if (userId === null) {
      this.mensajeCompra = 'No se ha podido identificar al usuario.';
      this.mensajeCompraTipo = 'error';
    } else {
      this.comprando = true;
      this.itemEnCompra = item.id;
      this.mensajeCompra = '';

      this.itemService.purchase(userId, item.id).subscribe({
        next: (res) => {
          this.comprando = false;
          this.itemEnCompra = null;
          this.balance = res.balance;
          this.mensajeCompra = `¡"${item.name}" comprado!`;
          this.mensajeCompraTipo = 'success';
          this.cargarInventarioYWallet(userId);
        },
        error: (err) => {
          this.comprando = false;
          this.itemEnCompra = null;
          this.mensajeCompraTipo = 'error';
          if (err?.error?.error === 'insufficient_funds') {
            this.mensajeCompra = `Te faltan chapitas (tienes ${err.error.balance}, necesitas ${err.error.price}).`;
          } else if (err?.error?.error === 'already_owned') {
            this.mensajeCompra = 'Ya tienes este item en tu inventario.';
          } else {
            this.mensajeCompra = 'No se pudo completar la compra.';
          }
        }
      });
    }
  }

  //refresco rapido tras una compra para que se vea el item en "inventario"
  private cargarInventarioYWallet(userId: number): void {
    this.itemService.getInventory(userId).subscribe({
      next: (filas) => { this.inventario = filas || []; },
    });
    this.itemService.getWallet(userId).subscribe({
      next: (info) => { this.balance = info.balance; },
    });
  }

  //true si el item ya esta en el inventario del usuario (para deshabilitar el boton)
  yaLoTengo(item: Item): boolean {
    let res = false;
    for (const fila of this.inventario) {
      if (fila.item_id === item.id) {
        res = true;
      }
    }
    return res;
  }

  private guardarItemsPorId(items: Item[]): void {
    this.itemsPorId = {};

    for (const item of items) {
      this.itemsPorId[item.id] = item;
    }
  }

  //ayudantes para la vista

  //devuelve el item asociado a una fila del inventario (o null si no esta)
  itemDeInventario(fila: InventoryRow): Item | null {
    let resultado: Item | null = null;

    if (this.itemsPorId[fila.item_id]) {
      resultado = this.itemsPorId[fila.item_id];
    }

    return resultado;
  }

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

  //color del badge segun la rareza del item
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
