import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Chart, registerables } from 'chart.js';

import { AuthService } from '../../core/services/auth';
import { AdminService, DashboardData, IncidentSummary } from '../../core/services/admin';

// Chart.js necesita registrar los módulos una sola vez en toda la app.
// Lo dejamos aquí fuera del componente para que se ejecute al importarlo.
Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private authService = inject(AuthService);
  private adminService = inject(AdminService);

  // -------------------------------------------------------
  //  DATOS QUE PINTA LA VISTA
  // -------------------------------------------------------

  dashboard: DashboardData | null = null;
  incidents: IncidentSummary[] = [];

  // Cuántas incidencias hay de cada tipo (lo usa el gráfico de barras).
  incidentsPorTipo = { ACCIDENT: 0, ROADWORK: 0, EVENT: 0 };

  loading = true;
  errorMessage = '';

  // Mensajes para la zona de acciones rápidas (ejecutar predicciones).
  prediccionesEjecutando = false;
  prediccionesMensaje = '';
  prediccionesError = '';

  // -------------------------------------------------------
  //  REFERENCIAS A LOS GRÁFICOS
  //  Las guardamos para poder destruirlos si se recarga
  //  la pantalla (si no, Chart.js se queja).
  // -------------------------------------------------------

  private chartUsuarios: Chart | null = null;
  private chartTipos: Chart | null = null;
  private chartIncidencias: Chart | null = null;

  // -------------------------------------------------------
  //  CICLO DE VIDA
  // -------------------------------------------------------

  ngOnInit(): void {
    this.cargarDashboard();
  }

  ngOnDestroy(): void {
    // Limpieza de gráficos al salir de la página.
    this.destruirGrafico(this.chartUsuarios);
    this.destruirGrafico(this.chartTipos);
    this.destruirGrafico(this.chartIncidencias);
  }

  // -------------------------------------------------------
  //  CARGA DE DATOS
  // -------------------------------------------------------

  /**
   * Primero pedimos las métricas (totales de usuarios e incidencias).
   * Cuando llegan, pedimos la lista de incidencias para agrupar por tipo.
   */
  private cargarDashboard(): void {
    this.adminService.getDashboard().subscribe({
      next: (data) => {
        this.dashboard = data;
        this.cargarIncidencias();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'No se pudo cargar el panel de administración.';
      }
    });
  }

  private cargarIncidencias(): void {
    this.adminService.getIncidents().subscribe({
      next: (lista) => {
        this.incidents = lista || [];
        this.contarIncidenciasPorTipo(this.incidents);
        this.loading = false;
        // Esperamos un tick para que Angular renderice los <canvas>
        // (están dentro de *ngIf="!loading"). Si pintamos antes, no existen.
        setTimeout(() => this.dibujarGraficos(), 0);
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Se cargaron las métricas pero falló la lista de incidencias.';
      }
    });
  }

  /**
   * Cuenta cuántas incidencias hay de cada tipo.
   * Recorremos toda la lista con if/else if/else, sin break ni return.
   */
  private contarIncidenciasPorTipo(lista: IncidentSummary[]): void {
    this.incidentsPorTipo = { ACCIDENT: 0, ROADWORK: 0, EVENT: 0 };

    for (const inc of lista) {
      if (inc.type === 'ACCIDENT') {
        this.incidentsPorTipo.ACCIDENT = this.incidentsPorTipo.ACCIDENT + 1;
      } else if (inc.type === 'ROADWORK') {
        this.incidentsPorTipo.ROADWORK = this.incidentsPorTipo.ROADWORK + 1;
      } else if (inc.type === 'EVENT') {
        this.incidentsPorTipo.EVENT = this.incidentsPorTipo.EVENT + 1;
      }
    }
  }

  // -------------------------------------------------------
  //  GRÁFICOS (Chart.js)
  // -------------------------------------------------------

  private dibujarGraficos(): void {
    this.dibujarGraficoUsuarios();
    this.dibujarGraficoTipos();
    this.dibujarGraficoIncidencias();
  }

  /** Doughnut: usuarios activos vs inactivos. */
  private dibujarGraficoUsuarios(): void {
    const canvas = document.getElementById('grafico-usuarios') as HTMLCanvasElement | null;

    if (canvas && this.dashboard) {
      this.destruirGrafico(this.chartUsuarios);

      this.chartUsuarios = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: ['Activos', 'Inactivos'],
          datasets: [{
            data: [this.dashboard.users_active, this.dashboard.users_inactive],
            backgroundColor: ['#4ade80', '#cbd5e1']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } }
        }
      });
    }
  }

  /** Bar: incidencias agrupadas por tipo. */
  private dibujarGraficoTipos(): void {
    const canvas = document.getElementById('grafico-tipos') as HTMLCanvasElement | null;

    if (canvas) {
      this.destruirGrafico(this.chartTipos);

      this.chartTipos = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: ['Accidentes', 'Obras', 'Eventos'],
          datasets: [{
            label: 'Nº de incidencias',
            data: [
              this.incidentsPorTipo.ACCIDENT,
              this.incidentsPorTipo.ROADWORK,
              this.incidentsPorTipo.EVENT
            ],
            backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
      });
    }
  }

  /** Bar: incidencias activas vs cerradas. */
  private dibujarGraficoIncidencias(): void {
    const canvas = document.getElementById('grafico-incidencias') as HTMLCanvasElement | null;

    if (canvas && this.dashboard) {
      this.destruirGrafico(this.chartIncidencias);

      const activas = this.dashboard.incidents_active;
      const cerradas = this.dashboard.incidents_total - this.dashboard.incidents_active;

      this.chartIncidencias = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: ['Activas', 'Cerradas'],
          datasets: [{
            label: 'Incidencias',
            data: [activas, cerradas],
            backgroundColor: ['#f59e0b', '#94a3b8']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: { legend: { display: false } },
          scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
      });
    }
  }

  // Helper para destruir un gráfico si existe.
  private destruirGrafico(grafico: Chart | null): void {
    if (grafico) {
      grafico.destroy();
    }
  }

  // -------------------------------------------------------
  //  ACCIONES DE LA NAVBAR
  // -------------------------------------------------------

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // -------------------------------------------------------
  //  ACCIONES ADMIN
  // -------------------------------------------------------

  // Lanza el cálculo de predicciones en el backend.
  // Sirve como una de las "modificaciones de configuración"
  // que el admin puede hacer desde el panel.
  ejecutarPredicciones(): void {
    this.prediccionesMensaje = '';
    this.prediccionesError = '';
    this.prediccionesEjecutando = true;

    this.adminService.runPredictions().subscribe({
      next: (respuesta: any) => {
        const msg = respuesta?.message || 'Predicciones ejecutadas correctamente.';
        this.prediccionesMensaje = msg;
        this.prediccionesEjecutando = false;
      },
      error: () => {
        this.prediccionesError = 'No se pudieron ejecutar las predicciones.';
        this.prediccionesEjecutando = false;
      }
    });
  }
}
