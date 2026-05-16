import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  AdminService,
  AdminUser,
  AdminUserPayload,
  UserRole
} from '../../core/services/admin';

// Página admin: gestión de usuarios.
// Permite ver el listado, editar (nombre, mail, rol, estado)
// y desactivar usuarios.

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.html',
  styleUrls: ['./admin-users.scss']
})
export class AdminUsersComponent implements OnInit {
  private router = inject(Router);
  private adminService = inject(AdminService);

  usuarios: AdminUser[] = [];

  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';

  // Estado del formulario de edición.
  mostrarFormulario = false;
  editandoId: number | null = null;
  formulario: AdminUserPayload = this.formularioVacio();

  rolesDisponibles: { valor: UserRole, etiqueta: string }[] = [
    { valor: 'USER',  etiqueta: 'Usuario' },
    { valor: 'ADMIN', etiqueta: 'Administrador' }
  ];

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  // -------------------------------------------------------
  //  CARGA
  // -------------------------------------------------------

  cargarUsuarios(): void {
    this.loading = true;
    this.errorMessage = '';

    this.adminService.getUsers().subscribe({
      next: (lista) => {
        this.usuarios = lista || [];
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'No se pudo cargar la lista de usuarios.';
        this.loading = false;
      }
    });
  }

  // -------------------------------------------------------
  //  FORMULARIO EDITAR
  // -------------------------------------------------------

  abrirFormularioEditar(usuario: AdminUser): void {
    this.editandoId = usuario.id;
    this.formulario = {
      name: usuario.name,
      mail: usuario.mail,
      rol: usuario.rol,
      status: usuario.status
    };
    this.limpiarMensajes();
    this.mostrarFormulario = true;
  }

  cerrarFormulario(): void {
    this.mostrarFormulario = false;
    this.editandoId = null;
  }

  guardar(): void {
    this.limpiarMensajes();

    const datos = this.prepararPayload();
    const valido = this.validarFormulario(datos);

    if (!valido) {
      this.saving = false;
    } else if (this.editandoId !== null) {
      this.lanzarEdicion(this.editandoId, datos);
    }
  }

  private lanzarEdicion(id: number, datos: AdminUserPayload): void {
    this.saving = true;

    this.adminService.updateUser(id, datos).subscribe({
      next: () => {
        this.successMessage = 'Usuario actualizado.';
        this.saving = false;
        this.cerrarFormulario();
        this.cargarUsuarios();
      },
      error: () => {
        this.errorMessage = 'No se pudo actualizar el usuario.';
        this.saving = false;
      }
    });
  }

  // -------------------------------------------------------
  //  DESACTIVAR
  // -------------------------------------------------------

  desactivar(usuario: AdminUser): void {
    this.limpiarMensajes();

    const confirmado = window.confirm(
      `¿Desactivar el usuario "${usuario.name}"? No podrá volver a iniciar sesión.`
    );

    if (confirmado) {
      this.adminService.deactivateUser(usuario.id).subscribe({
        next: () => {
          this.successMessage = 'Usuario desactivado.';
          this.cargarUsuarios();
        },
        error: () => {
          this.errorMessage = 'No se pudo desactivar el usuario.';
        }
      });
    }
  }

  // -------------------------------------------------------
  //  AYUDANTES
  // -------------------------------------------------------

  private formularioVacio(): AdminUserPayload {
    return { name: '', mail: '', rol: 'USER', status: true };
  }

  // Prepara los datos limpios para mandar al backend.
  private prepararPayload(): AdminUserPayload {
    return {
      name: (this.formulario.name || '').trim(),
      mail: (this.formulario.mail || '').trim(),
      rol: this.formulario.rol,
      status: this.formulario.status
    };
  }

  // Valida nombre y email. Si algo falla, guarda el mensaje y devuelve false.
  private validarFormulario(datos: AdminUserPayload): boolean {
    let valido = true;
    const nombreValido = !!datos.name && datos.name.length <= 100;
    const mailValido = !!datos.mail && datos.mail.includes('@') && datos.mail.length <= 100;

    if (!nombreValido) {
      this.errorMessage = 'El nombre es obligatorio (máx. 100 caracteres).';
      valido = false;
    } else if (!mailValido) {
      this.errorMessage = 'El correo no es válido.';
      valido = false;
    }

    return valido;
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

  private limpiarMensajes(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  volverDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
