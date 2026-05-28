import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { AdminService, AdminUserDetail, UserRole } from '../../core/services/admin';
import { BackendVehicle, FuelType } from '../../core/services/vehicle';
import { HeaderComponent } from '../../core/components/header/header';
import { FooterComponent } from '../../core/components/footer/footer';

//ficha completa de un usuario en el panel admin:
//muestra datos basicos + ubicaciones (casa/trabajo) + lista de vehiculos
@Component({
  selector: 'app-admin-user-detail',
  standalone: true,
  imports: [CommonModule, HeaderComponent, FooterComponent],
  templateUrl: './admin-user-detail.html',
  styleUrls: ['./admin-user-detail.scss']
})
export class AdminUserDetailComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private adminService = inject(AdminService);

  detalle: AdminUserDetail | null = null;
  loading = true;
  errorMessage = '';

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const idNumerico = Number(idParam);

    if (!idParam || Number.isNaN(idNumerico) || idNumerico <= 0) {
      this.errorMessage = 'El identificador de usuario no es valido.';
      this.loading = false;
    } else {
      this.cargarDetalle(idNumerico);
    }
  }

  private cargarDetalle(userId: number): void {
    this.adminService.getUserDetail(userId).subscribe({
      next: (datos) => {
        this.detalle = datos;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'No se pudo cargar el usuario.';
        this.loading = false;
      }
    });
  }

  etiquetaRol(rol: UserRole): string {
    let etiqueta: string = rol;

    if (rol === 'ADMIN') {
      etiqueta = 'Administrador';
    } else if (rol === 'USER') {
      etiqueta = 'Usuario';
    }

    return etiqueta;
  }

  //texto legible para el tipo de vehiculo
  etiquetaTipo(tipo: BackendVehicle['type']): string {
    let etiqueta: string = tipo;

    if (tipo === 'CAR') {
      etiqueta = 'Coche';
    } else if (tipo === 'MOTORBIKE') {
      etiqueta = 'Moto';
    } else if (tipo === 'VAN') {
      etiqueta = 'Furgoneta';
    }

    return etiqueta;
  }

  etiquetaCombustible(combustible: FuelType | null): string {
    let etiqueta = 'Desconocido';

    if (combustible === 'electric') {
      etiqueta = 'Eléctrico';
    } else if (combustible === 'hybrid') {
      etiqueta = 'Híbrido';
    } else if (combustible === 'gasoline') {
      etiqueta = 'Gasolina';
    } else if (combustible === 'diesel') {
      etiqueta = 'Diésel';
    }

    return etiqueta;
  }

  //true si el usuario tiene perfil con casa o trabajo guardados
  tieneUbicaciones(): boolean {
    let tiene = false;

    if (this.detalle && this.detalle.profile) {
      const p = this.detalle.profile;
      const hayCasa = p.home_lat !== null && p.home_lon !== null;
      const hayTrabajo = p.work_lat !== null && p.work_lon !== null;
      tiene = hayCasa || hayTrabajo;
    }

    return tiene;
  }

  volver(): void {
    this.router.navigate(['/admin/users']);
  }
}
