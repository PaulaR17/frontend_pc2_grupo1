import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Chart, registerables } from 'chart.js';

import { AuthService } from '../../core/services/auth';
import { AdminService, DashboardData, IncidentSummary } from '../../core/services/admin';
import { HeaderComponent } from '../../core/components/header/header';
import { FooterComponent } from '../../core/components/footer/footer';

//registro de modulos de Chart.js, solo una vez
Chart.register(...registerables);

//panel admin con metricas, graficos y boton de predicciones
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HeaderComponent, FooterComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private authService = inject(AuthService);
  private adminService = inject(AdminService);

  dashboard: DashboardData | null = null;
  incidents: IncidentSummary[] = [];

  //conteo para el grafico de barras
  incidentsPorTipo = { ACCIDENT: 0, ROADWORK: 0, EVENT: 0 };

  loading = true;
  errorMessage = '';

  prediccionesEjecutando = false;
  prediccionesMensaje = '';
  prediccionesError = '';

  //opciones de modelo y target que el admin puede combinar antes de pulsar el boton
  modelosDisponibles = [
    { valor: 'random_forest.pkl', etiqueta: 'Random Forest' },
    { valor: 'decision_tree.pkl', etiqueta: 'Decision Tree' },
    { valor: 'svm.pkl', etiqueta: 'SVM (LinearSVC)' },
  ];
  targetsDisponibles = ['Accidentes', 'Calidad Aire', 'Emergencias'];
  modeloSeleccionado = 'random_forest.pkl';
  targetSeleccionado = 'Accidentes';
  diasSeleccionados = 7;

  //guardamos las refs para poder destruir antes de redibujar
  private chartUsuarios: Chart | null = null;
  private chartTipos: Chart | null = null;
  private chartIncidencias: Chart | null = null;

  ngOnInit(): void {
    this.cargarDashboard();
  }

  ngOnDestroy(): void {
    this.destruirGrafico(this.chartUsuarios);
    this.destruirGrafico(this.chartTipos);
    this.destruirGrafico(this.chartIncidencias);
  }

  //pide metricas y luego las incidencias para agrupar por tipo
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
        //los canvas estan dentro de un *ngIf que depende de "loading":
        //esperamos a que Angular los monte antes de dibujar las graficas
        this.programarDibujoGraficos();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Se cargaron las métricas pero falló la lista de incidencias.';
      }
    });
  }

  //intenta dibujar las graficas cuando los canvas ya esten en el DOM.
  //antes usabamos setTimeout(0) pero a veces Angular todavia no habia
  //pintado el bloque del *ngIf y el getElementById devolvia null. ahora
  //esperamos al siguiente frame y, si aun no estan, reintentamos hasta
  //10 veces con un margen de 50 ms.
  private programarDibujoGraficos(intentos: number = 0): void {
    requestAnimationFrame(() => {
      const listo = document.getElementById('grafico-usuarios');
      if (listo) {
        this.dibujarGraficos();
      } else if (intentos < 10) {
        setTimeout(() => this.programarDibujoGraficos(intentos + 1), 50);
      }
    });
  }

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

  private dibujarGraficos(): void {
    this.dibujarGraficoUsuarios();
    this.dibujarGraficoTipos();
    this.dibujarGraficoIncidencias();
  }

  //usuarios activos vs inactivos
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

  //incidencias por tipo
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

  //activas vs cerradas
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

  private destruirGrafico(grafico: Chart | null): void {
    if (grafico) {
      grafico.destroy();
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  //lanza el calculo de predicciones de PC1
  ejecutarPredicciones(): void {
    this.prediccionesMensaje = '';
    this.prediccionesError = '';
    this.prediccionesEjecutando = true;

    this.adminService.runPredictions(
      this.modeloSeleccionado,
      this.targetSeleccionado,
      this.diasSeleccionados,
    ).subscribe({
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
