import { Component, OnInit, inject, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PublicDataService, LocationSuggestion } from '../../core/services/public-data';
import { AdminService, IncidentSummary, IncidentType } from '../../core/services/admin';
import { PredictionService, Prediction, PredictionLevel } from '../../core/services/prediction';
import { getCentroid } from '../../core/services/madrid-districts';
import * as L from 'leaflet';

//home publico de invitados con mapa, predicciones y buscador
@Component({
  selector: 'app-public-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './public-home.html',
  styleUrls: ['./public-home.scss']
})
export class PublicHomeComponent implements OnInit, AfterViewInit {
  private dataService = inject(PublicDataService);
  private adminService = inject(AdminService);
  private predictionService = inject(PredictionService);

  guestId: string | null = null;

  searchCount = 0;
  maxSearches = 4;
  remainingSearches = 4;

  showLimitModal = false;

  searchQuery = '';
  mostrarSugerencias = false;
  loadingSuggestions = false;
  loadingRoute = false;

  locationSuggestions: LocationSuggestion[] = [];
  selectedLocation: LocationSuggestion | null = null;

  notificationMessage = '';
  notificationType: 'success' | 'error' | 'warning' | '' = '';

  private map!: L.Map;
  private zoneLayer: L.LayerGroup = L.layerGroup();
  private incidentsLayer: L.LayerGroup = L.layerGroup();
  private predictionsLayer: L.LayerGroup = L.layerGroup();
  private searchTimer: any = null;

  mostrarPredicciones = false;
  prediccionesCargadas: Prediction[] = [];

  ngOnInit(): void {
    this.startGuestSession();
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  //usa la sesion guardada o crea una nueva
  private startGuestSession(): void {
    const storedGuestId = localStorage.getItem('guest_id');

    if (storedGuestId) {
      this.guestId = storedGuestId;
      this.checkQuota(storedGuestId);
    } else {
      this.crearSesionNueva();
    }
  }

  private crearSesionNueva(): void {
    this.dataService.createGuestSession().subscribe({
      next: (res: any) => {
        this.guestId = res.session_id;
        this.searchCount = res.search_count ?? 0;
        this.remainingSearches = res.remaining ?? this.maxSearches;
        this.maxSearches = res.max ?? 4;
        localStorage.setItem('guest_id', res.session_id);
      },
      error: (err: any) => {
        this.showNotification('No se pudo crear la sesión de invitado.', 'error');
        console.error('Error creando sesión de invitado:', err);
      }
    });
  }

  //si caduco se crea otra sesion
  private checkQuota(sessionId: string): void {
    this.dataService.getQuota(sessionId).subscribe({
      next: (res: any) => {
        this.searchCount = res.search_count ?? 0;
        this.remainingSearches = res.remaining ?? 0;
        this.maxSearches = res.max ?? 4;
      },
      error: (err: any) => {
        localStorage.removeItem('guest_id');
        this.guestId = null;
        this.crearSesionNueva();
        console.error('Error consultando cuota:', err);
      }
    });
  }

  //arranca Leaflet y pinta las incidencias
  private initMap(): void {
    this.map = L.map('map', {
      center: [40.4167, -3.7033],
      zoom: 12,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);
    this.zoneLayer.addTo(this.map);
    this.incidentsLayer.addTo(this.map);
    //la capa de predicciones solo se mete al activar el toggle
    this.cargarIncidencias();
  }

  //activa o desactiva la capa de predicciones
  togglePredicciones(): void {
    this.mostrarPredicciones = !this.mostrarPredicciones;

    if (this.mostrarPredicciones) {
      this.predictionsLayer.addTo(this.map);
      this.cargarPredicciones();
    } else {
      this.map.removeLayer(this.predictionsLayer);
    }
  }

  private cargarPredicciones(): void {
    this.predictionService.getPredictions({ limit: 500 }).subscribe({
      next: (lista) => {
        this.prediccionesCargadas = lista || [];
        this.dibujarPredicciones(this.prediccionesCargadas);
      },
      error: () => {
        console.warn('No se pudieron cargar las predicciones.');
        this.prediccionesCargadas = [];
      }
    });
  }

  //pinta un circulo por distrito segun el nivel
  private dibujarPredicciones(predicciones: Prediction[]): void {
    this.predictionsLayer.clearLayers();

    for (const pred of predicciones) {
      const centroide = getCentroid(pred.district);

      if (centroide) {
        const color = this.colorPrediccion(pred.level);
        const popup = this.popupPrediccion(pred, centroide.name);

        L.circleMarker([centroide.lat, centroide.lon], {
          radius: 16,
          color: '#ffffff',
          weight: 2,
          fillColor: color,
          fillOpacity: 0.55
        })
          .bindPopup(popup)
          .addTo(this.predictionsLayer);
      }
    }
  }

  private colorPrediccion(nivel: PredictionLevel): string {
    let color = '#22c55e';

    if (nivel === 'ALTO') {
      color = '#dc2626';
    } else if (nivel === 'MEDIO') {
      color = '#f59e0b';
    } else if (nivel === 'BAJO') {
      color = '#22c55e';
    }

    return color;
  }

  private popupPrediccion(pred: Prediction, nombreDistrito: string): string {
    const probabilidad = Math.round(pred.probability * 100);

    return `
      <b>${nombreDistrito}</b><br>
      <small>Predicción para ${pred.for_date}</small><br>
      Nivel: <b>${pred.level}</b> (${probabilidad}%)<br>
      <small>Objetivo: ${pred.target_type}</small>
    `;
  }

  private cargarIncidencias(): void {
    this.adminService.getIncidents().subscribe({
      next: (lista) => {
        this.dibujarIncidencias(lista || []);
      },
      error: () => {
        //si fallan, el mapa tira igual
        console.warn('No se pudieron cargar las incidencias.');
      }
    });
  }

  //solo pinta las activas
  private dibujarIncidencias(incidencias: IncidentSummary[]): void {
    this.incidentsLayer.clearLayers();

    for (const inc of incidencias) {
      if (inc.active) {
        const color = this.colorIncidencia(inc.type);
        const popup = this.popupIncidencia(inc);

        L.circleMarker([inc.lat, inc.lon], {
          radius: 9,
          color: '#ffffff',
          weight: 2,
          fillColor: color,
          fillOpacity: 0.85
        })
          .bindPopup(popup)
          .addTo(this.incidentsLayer);
      }
    }
  }

  private colorIncidencia(tipo: IncidentType): string {
    let color = '#6c757d';

    if (tipo === 'ACCIDENT') {
      color = '#dc3545';
    } else if (tipo === 'ROADWORK') {
      color = '#f59e0b';
    } else if (tipo === 'EVENT') {
      color = '#0dcaf0';
    }

    return color;
  }

  private popupIncidencia(inc: IncidentSummary): string {
    let etiqueta: string = inc.type;

    if (inc.type === 'ACCIDENT') {
      etiqueta = 'Accidente';
    } else if (inc.type === 'ROADWORK') {
      etiqueta = 'Obras';
    } else if (inc.type === 'EVENT') {
      etiqueta = 'Evento';
    }

    const titulo = inc.title ? inc.title : etiqueta;
    const descripcion = inc.description ? inc.description : '';

    return `<b>${titulo}</b><br><small>${etiqueta}</small><br>${descripcion}`;
  }

  //debounce de 250 ms al teclear
  onSearchInput(): void {
    this.selectedLocation = null;
    this.notificationMessage = '';

    const query = this.searchQuery.trim();

    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }

    this.searchTimer = setTimeout(() => {
      this.loadSuggestions(query);
    }, 250);
  }

  onSearchFocus(): void {
    this.mostrarSugerencias = true;

    if (this.locationSuggestions.length === 0) {
      this.loadSuggestions(this.searchQuery.trim());
    }
  }

  private loadSuggestions(query: string): void {
    this.loadingSuggestions = true;
    this.mostrarSugerencias = true;

    this.dataService.searchLocation(query).subscribe({
      next: (res: any) => {
        this.locationSuggestions = res.results ?? [];
        this.loadingSuggestions = false;
      },
      error: (err: any) => {
        this.locationSuggestions = [];
        this.loadingSuggestions = false;
        this.showNotification('No se pudieron cargar las sugerencias.', 'error');
        console.error('Error buscando ubicaciones:', err);
      }
    });
  }

  //gestiona el click del boton buscar
  onSearch(): void {
    const query = this.searchQuery.trim();

    if (!this.guestId) {
      this.showNotification('No hay sesión de invitado activa. Recarga la página.', 'error');
    } else if (query === '') {
      this.showNotification('Introduce una ubicación para buscar.', 'warning');
    } else if (this.searchCount >= this.maxSearches) {
      this.showLimitModal = true;
    } else if (this.selectedLocation) {
      this.calculateRouteTo(this.selectedLocation);
    } else if (this.locationSuggestions.length > 0) {
      //tiramos con la primera sugerencia
      this.selectedLocation = this.locationSuggestions[0];
      this.searchQuery = this.selectedLocation.text;
      this.mostrarSugerencias = false;
      this.calculateRouteTo(this.selectedLocation);
    } else {
      this.buscarYCalcular(query);
    }
  }

  private buscarYCalcular(query: string): void {
    this.dataService.searchLocation(query).subscribe({
      next: (res: any) => {
        const firstSuggestion = res.results?.[0];

        if (!firstSuggestion) {
          this.showNotification('No se encontró esa ubicación en Madrid.', 'warning');
        } else {
          this.selectedLocation = firstSuggestion;
          this.searchQuery = firstSuggestion.text;
          this.calculateRouteTo(firstSuggestion);
        }
      },
      error: (err: any) => {
        this.showNotification('Error buscando la ubicación.', 'error');
        console.error('Error buscando ubicación:', err);
      }
    });
  }

  selectSuggestion(suggestion: LocationSuggestion): void {
    this.selectedLocation = suggestion;
    this.searchQuery = suggestion.text;
    this.locationSuggestions = [];
    this.mostrarSugerencias = false;
    this.previewLocationOnMap(suggestion);
  }

  private calculateRouteTo(destination: LocationSuggestion): void {
    if (!this.guestId) {
      this.showNotification('No hay sesión de invitado activa.', 'error');
    } else if (this.searchCount >= this.maxSearches) {
      this.showLimitModal = true;
    } else {
      this.lanzarCalculoRuta(destination);
    }
  }

  private lanzarCalculoRuta(destination: LocationSuggestion): void {
    this.loadingRoute = true;

    this.dataService.calculateGuestRoute(this.guestId!, destination).subscribe({
      next: (routeRes: any) => {
        this.loadingRoute = false;
        this.searchCount = routeRes.search_count ?? this.searchCount + 1;
        this.remainingSearches = routeRes.remaining ?? Math.max(0, this.maxSearches - this.searchCount);
        this.maxSearches = routeRes.max ?? this.maxSearches;

        this.displayLocationOnMap(destination, routeRes.summary);
        this.showNotification('Ruta calculada correctamente.', 'success');
      },
      error: (err: any) => {
        this.loadingRoute = false;

        //429 = cuota agotada, mostramos el modal
        if (err.status === 429) {
          this.showLimitModal = true;
        } else {
          this.displayLocationOnMap(destination, null);
          this.showNotification('Se ha encontrado la ubicación, pero no se pudo calcular la ruta.', 'warning');
          console.error('Error calculando ruta:', err);
        }
      }
    });
  }

  private previewLocationOnMap(location: LocationSuggestion): void {
    this.zoneLayer.clearLayers();
    this.map.flyTo([location.lat, location.lon], 14);

    L.marker([location.lat, location.lon])
      .addTo(this.zoneLayer)
      .bindPopup(`<b>${location.text}</b><br>Pulsa el botón verde para calcular la ruta.`)
      .openPopup();
  }

  private displayLocationOnMap(location: LocationSuggestion, summary: any): void {
    this.zoneLayer.clearLayers();

    const popupLines = [`<b>${location.text}</b>`];

    if (summary) {
      popupLines.push(`Distancia: ${summary.distance_km ?? '-'} km`);
      popupLines.push(`Duración: ${summary.duration_min ?? '-'} min`);
    }

    this.map.flyTo([location.lat, location.lon], 15);

    L.marker([location.lat, location.lon])
      .addTo(this.zoneLayer)
      .bindPopup(popupLines.join('<br>'))
      .openPopup();
  }

  getSuggestionTitle(suggestion: LocationSuggestion): string {
    return suggestion.name || suggestion.text;
  }

  getSuggestionSubtitle(suggestion: LocationSuggestion): string {
    const title = this.getSuggestionTitle(suggestion);

    let subtitulo = 'Madrid, España';
    if (suggestion.text && suggestion.text !== title) {
      subtitulo = suggestion.text.replace(title, '').replace(/^,\s*/, '').trim();
    }
    return subtitulo;
  }

  private showNotification(message: string, type: 'success' | 'error' | 'warning'): void {
    this.notificationMessage = message;
    this.notificationType = type;

    setTimeout(() => {
      this.notificationMessage = '';
      this.notificationType = '';
    }, 4500);
  }

  //cierra sugerencias al click fuera del buscador
  @HostListener('document:click', ['$event'])
  clickOut(event: Event): void {
    const target = event.target as HTMLElement;

    if (!target.closest('.card')) {
      this.mostrarSugerencias = false;
    }
  }
}
