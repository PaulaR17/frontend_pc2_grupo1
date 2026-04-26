import { Component, OnInit, inject, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PublicDataService, LocationSuggestion } from '../../core/services/public-data';
import * as L from 'leaflet';

@Component({
  selector: 'app-public-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './public-home.html',
  styleUrls: ['./public-home.scss']
})
export class PublicHomeComponent implements OnInit, AfterViewInit {
  private dataService = inject(PublicDataService);

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

  zonasDisponibles: string[] = [
    'Centro', 'Arganzuela', 'Retiro', 'Salamanca', 'Chamartín',
    'Tetuán', 'Chamberí', 'Fuencarral-El Pardo', 'Moncloa-Aravaca',
    'Latina', 'Carabanchel', 'Usera', 'Puente de Vallecas',
    'Moratalaz', 'Ciudad Lineal', 'Hortaleza', 'Villaverde',
    'Villa de Vallecas', 'Vicálvaro', 'San Blas-Canillejas', 'Barajas'
  ];

  private map!: L.Map;
  private zoneLayer: L.LayerGroup = L.layerGroup();
  private searchTimer: any = null;

  ngOnInit(): void {
    this.startGuestSession();
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  private startGuestSession(): void {
    const storedGuestId = localStorage.getItem('guest_id');

    if (storedGuestId) {
      this.guestId = storedGuestId;
      this.checkQuota(storedGuestId);
      return;
    }

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
        this.startGuestSession();
        console.error('Error consultando cuota:', err);
      }
    });
  }

  private initMap(): void {
    this.map = L.map('map', {
      center: [40.4167, -3.7033],
      zoom: 12,
      zoomControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

    this.zoneLayer.addTo(this.map);
  }

  onSearchInput(): void {
    this.selectedLocation = null;
    this.notificationMessage = '';

    const query = this.searchQuery.trim();

    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }

    if (query.length < 2) {
      this.locationSuggestions = [];
      this.mostrarSugerencias = true;
      return;
    }

    this.searchTimer = setTimeout(() => {
      this.loadSuggestions(query);
    }, 350);
  }

  private loadSuggestions(query: string): void {
    this.loadingSuggestions = true;
    this.mostrarSugerencias = true;

    this.dataService.searchLocation(query).subscribe({
      next: (res: any) => {
        this.locationSuggestions = res.results ?? [];
        this.loadingSuggestions = false;

        if (this.locationSuggestions.length === 0) {
          this.showNotification('No se encontraron ubicaciones para esa búsqueda.', 'warning');
        }
      },
      error: (err: any) => {
        this.locationSuggestions = [];
        this.loadingSuggestions = false;
        this.showNotification('No se pudieron cargar las sugerencias.', 'error');
        console.error('Error buscando ubicaciones:', err);
      }
    });
  }

  onSearch(): void {
    const query = this.searchQuery.trim();

    if (!this.guestId) {
      this.showNotification('No hay sesión de invitado activa. Recarga la página.', 'error');
      return;
    }

    if (query === '') {
      this.showNotification('Introduce una ubicación para buscar.', 'warning');
      return;
    }

    if (this.searchCount >= this.maxSearches) {
      this.showLimitModal = true;
      return;
    }

    if (this.selectedLocation) {
      this.calculateRouteTo(this.selectedLocation);
      return;
    }

    if (this.locationSuggestions.length > 0) {
      this.selectSuggestion(this.locationSuggestions[0]);
      return;
    }

    this.dataService.searchLocation(query).subscribe({
      next: (res: any) => {
        const firstSuggestion = res.results?.[0];

        if (!firstSuggestion) {
          this.showNotification('No se encontró esa ubicación en Madrid.', 'warning');
          return;
        }

        this.selectSuggestion(firstSuggestion);
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

    this.calculateRouteTo(suggestion);
  }

  seleccionarZona(zona: string): void {
    this.searchQuery = zona;
    this.selectedLocation = null;
    this.onSearchInput();
  }

  private calculateRouteTo(destination: LocationSuggestion): void {
    if (!this.guestId) {
      this.showNotification('No hay sesión de invitado activa.', 'error');
      return;
    }

    if (this.searchCount >= this.maxSearches) {
      this.showLimitModal = true;
      return;
    }

    this.loadingRoute = true;

    this.dataService.calculateGuestRoute(this.guestId, destination).subscribe({
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

        if (err.status === 429) {
          this.showLimitModal = true;
          return;
        }

        this.displayLocationOnMap(destination, null);
        this.showNotification('Se ha encontrado la ubicación, pero no se pudo calcular la ruta.', 'warning');

        console.error('Error calculando ruta:', err);
      }
    });
  }

  private displayLocationOnMap(location: LocationSuggestion, summary: any): void {
    this.zoneLayer.clearLayers();

    const popupLines = [
      `<b>${location.text}</b>`
    ];

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

  private showNotification(message: string, type: 'success' | 'error' | 'warning'): void {
    this.notificationMessage = message;
    this.notificationType = type;

    setTimeout(() => {
      this.notificationMessage = '';
      this.notificationType = '';
    }, 4500);
  }

  @HostListener('document:click', ['$event'])
  clickOut(event: Event): void {
    const target = event.target as HTMLElement;

    if (!target.closest('.search-wrapper')) {
      this.mostrarSugerencias = false;
    }
  }
}