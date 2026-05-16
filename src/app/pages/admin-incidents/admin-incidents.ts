import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  AdminService,
  IncidentSummary,
  IncidentPayload,
  IncidentType
} from '../../core/services/admin';

// Página de administración de incidencias.
// Permite listar, crear, editar y cerrar las incidencias del mapa.

@Component({
  selector: 'app-admin-incidents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-incidents.html',
  styleUrls: ['./admin-incidents.scss']
})
export class AdminIncidentsComponent implements OnInit {
  private router = inject(Router);
  private adminService = inject(AdminService);

  // Listado completo de incidencias que pinta la tabla.
  incidents: IncidentSummary[] = [];

  // Estado general de la pantalla.
  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';

  // Datos del formulario (modal). Sirve tanto para crear
  // como para editar; si editandoId es null, es nueva.
  mostrarFormulario = false;
  editandoId: number | null = null;
  formulario: IncidentPayload = this.formularioVacio();

  // Para que el <select> sepa qué opciones hay.
  tiposDisponibles: { valor: IncidentType, etiqueta: string }[] = [
    { valor: 'ACCIDENT', etiqueta: 'Accidente' },
    { valor: 'ROADWORK', etiqueta: 'Obras' },
    { valor: 'EVENT',    etiqueta: 'Evento' }
  ];

  ngOnInit(): void {
    this.cargarIncidencias();
  }

  // -------------------------------------------------------
  //  CARGA DE DATOS
  // -------------------------------------------------------

  cargarIncidencias(): void {
    this.loading = true;
    this.errorMessage = '';

    this.adminService.getIncidents().subscribe({
      next: (lista) => {
        this.incidents = lista || [];
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'No se pudieron cargar las incidencias.';
        this.loading = false;
      }
    });
  }

  // -------------------------------------------------------
  //  ABRIR / CERRAR FORMULARIO
  // -------------------------------------------------------

  abrirFormularioNueva(): void {
    this.editandoId = null;
    this.formulario = this.formularioVacio();
    this.limpiarMensajes();
    this.mostrarFormulario = true;
  }

  abrirFormularioEditar(incident: IncidentSummary): void {
    this.editandoId = incident.id;
    this.formulario = {
      type: incident.type,
      lat: incident.lat,
      lon: incident.lon,
      active: incident.active,
      title: incident.title ?? '',
      description: incident.description ?? ''
    };
    this.limpiarMensajes();
    this.mostrarFormulario = true;
  }

  cerrarFormulario(): void {
    this.mostrarFormulario = false;
    this.editandoId = null;
  }

  // -------------------------------------------------------
  //  GUARDAR (CREAR O EDITAR)
  // -------------------------------------------------------

  guardar(): void {
    this.limpiarMensajes();

    const datos = this.prepararPayload();
    const valido = this.validarFormulario(datos);

    if (!valido) {
      // El mensaje de error ya se ha puesto dentro de validar.
      this.saving = false;
    } else if (this.editandoId === null) {
      this.lanzarCreacion(datos);
    } else {
      this.lanzarEdicion(this.editandoId, datos);
    }
  }

  private lanzarCreacion(datos: IncidentPayload): void {
    this.saving = true;

    this.adminService.createIncident(datos).subscribe({
      next: () => {
        this.successMessage = 'Incidencia creada.';
        this.saving = false;
        this.cerrarFormulario();
        this.cargarIncidencias();
      },
      error: () => {
        this.errorMessage = 'No se pudo crear la incidencia.';
        this.saving = false;
      }
    });
  }

  private lanzarEdicion(id: number, datos: IncidentPayload): void {
    this.saving = true;

    this.adminService.updateIncident(id, datos).subscribe({
      next: () => {
        this.successMessage = 'Incidencia actualizada.';
        this.saving = false;
        this.cerrarFormulario();
        this.cargarIncidencias();
      },
      error: () => {
        this.errorMessage = 'No se pudo actualizar la incidencia.';
        this.saving = false;
      }
    });
  }

  // -------------------------------------------------------
  //  CERRAR INCIDENCIA (soft delete)
  // -------------------------------------------------------

  cerrarIncidencia(incident: IncidentSummary): void {
    this.limpiarMensajes();

    const confirmado = window.confirm(
      '¿Seguro que quieres cerrar esta incidencia? Dejará de aparecer activa.'
    );

    if (confirmado) {
      this.adminService.deleteIncident(incident.id).subscribe({
        next: () => {
          this.successMessage = 'Incidencia cerrada.';
          this.cargarIncidencias();
        },
        error: () => {
          this.errorMessage = 'No se pudo cerrar la incidencia.';
        }
      });
    }
  }

  // -------------------------------------------------------
  //  AYUDANTES
  // -------------------------------------------------------

  // Plantilla vacía para el formulario.
  private formularioVacio(): IncidentPayload {
    return {
      type: 'ACCIDENT',
      lat: 40.4168,
      lon: -3.7038,
      active: true,
      title: '',
      description: ''
    };
  }

  // Convierte los strings del form (lat/lon vienen como string del input)
  // a números reales, y limpia campos vacíos.
  private prepararPayload(): IncidentPayload {
    return {
      type: this.formulario.type,
      lat: Number(this.formulario.lat),
      lon: Number(this.formulario.lon),
      active: this.formulario.active ?? true,
      title: (this.formulario.title || '').trim() || null,
      description: (this.formulario.description || '').trim() || null
    };
  }

  // Valida el formulario y, si algo falla, deja el mensaje en errorMessage.
  private validarFormulario(datos: IncidentPayload): boolean {
    let valido = true;
    const latValida = !isNaN(datos.lat) && datos.lat >= -90 && datos.lat <= 90;
    const lonValida = !isNaN(datos.lon) && datos.lon >= -180 && datos.lon <= 180;

    if (!latValida) {
      this.errorMessage = 'La latitud debe estar entre -90 y 90.';
      valido = false;
    } else if (!lonValida) {
      this.errorMessage = 'La longitud debe estar entre -180 y 180.';
      valido = false;
    }

    return valido;
  }

  // Texto bonito para mostrar el tipo en la tabla.
  etiquetaTipo(tipo: IncidentType): string {
    let etiqueta: string = tipo;

    if (tipo === 'ACCIDENT') {
      etiqueta = 'Accidente';
    } else if (tipo === 'ROADWORK') {
      etiqueta = 'Obras';
    } else if (tipo === 'EVENT') {
      etiqueta = 'Evento';
    }

    return etiqueta;
  }

  // Color del badge según el tipo de incidencia.
  colorTipo(tipo: IncidentType): string {
    let color = 'bg-secondary';

    if (tipo === 'ACCIDENT') {
      color = 'bg-danger';
    } else if (tipo === 'ROADWORK') {
      color = 'bg-warning text-dark';
    } else if (tipo === 'EVENT') {
      color = 'bg-info text-dark';
    }

    return color;
  }

  private limpiarMensajes(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  volverDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
