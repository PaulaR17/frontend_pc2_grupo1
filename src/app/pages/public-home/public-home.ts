import { Component, OnInit, inject, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PublicDataService } from '../../core/services/public-data';
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
  showLimitModal = false;
  searchQuery = '';
  mostrarSugerencias = false;

  zonasDisponibles: string[] = [
    'Centro', 'Arganzuela', 'Retiro', 'Salamanca', 'Chamartín',
    'Tetuán', 'Chamberí', 'Fuencarral-El Pardo', 'Moncloa-Aravaca',
    'Latina', 'Carabanchel', 'Usera', 'Puente de Vallecas',
    'Moratalaz', 'Ciudad Lineal', 'Hortaleza', 'Villaverde',
    'Villa de Vallecas', 'Vicálvaro', 'San Blas-Canillejas', 'Barajas'
  ];

  private map!: L.Map;
  private zoneLayer: L.LayerGroup = L.layerGroup();

  ngOnInit(): void {
    this.dataService.createGuestSession().subscribe({
      next: (res: any) => {
        this.guestId = res.session_id;
        localStorage.setItem('guest_id', res.session_id);
        this.checkQuota(res.session_id);
      },
      error: (err: any) => {
        console.error('Error creando sesión de invitado:', err);
      }
    });
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  private checkQuota(sessionId: string): void {
    this.dataService.getQuota(sessionId).subscribe({
      next: (res: any) => {
        this.searchCount = res.search_count ?? 0;
      },
      error: (err: any) => {
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

  onSearch(): void {
    const query = this.searchQuery.trim();

    if (!this.guestId || query === '') {
      return;
    }

    this.executeSearchLogic(this.guestId, query);
  }

  private executeSearchLogic(sessionId: string, query: string): void {
    if (this.searchCount >= 4) {
      this.showLimitModal = true;
      return;
    }

    this.dataService.searchLocation(query).subscribe({
      next: (searchRes: any) => {
        const destination = searchRes.results?.[0];

        if (!destination) {
          console.warn('No se encontró ubicación para:', query);
          return;
        }

        this.dataService.calculateGuestRoute(sessionId, destination).subscribe({
          next: (routeRes: any) => {
            this.searchCount = routeRes.search_count ?? this.searchCount + 1;
            this.mostrarSugerencias = false;

            this.displayZoneOnMap({
              latitude: destination.lat,
              longitude: destination.lon,
              text: destination.text,
              summary: routeRes.summary
            });
          },
          error: (err: any) => {
  console.error('Error calculando ruta:', err);

  this.searchCount++;

  this.displayZoneOnMap({
    latitude: destination.lat,
    longitude: destination.lon,
    text: destination.text
  });

  if (err.status === 403 || err.status === 429) {
    this.showLimitModal = true;
  }
}
        });
      },
      error: (err: any) => {
        console.error('Error buscando ubicación:', err);
      }
    });
  }

  private displayZoneOnMap(zone: any): void {
    this.zoneLayer.clearLayers();

    const lat = zone?.latitude ?? 40.4167;
    const lng = zone?.longitude ?? -3.7033;
    const text = zone?.text ?? this.searchQuery;

    let popup = `<b>${text}</b>`;

    if (zone?.summary) {
      popup += `<br>Distancia: ${zone.summary.distance_km ?? '-'} km`;
      popup += `<br>Duración: ${zone.summary.duration_min ?? '-'} min`;
    }

    this.map.flyTo([lat, lng], 14);

    L.marker([lat, lng])
      .addTo(this.zoneLayer)
      .bindPopup(popup)
      .openPopup();
  }

  seleccionarZona(zona: string): void {
    this.searchQuery = zona;
    this.mostrarSugerencias = false;
    this.onSearch();
  }

  @HostListener('document:click', ['$event'])
  clickOut(event: Event): void {
    const target = event.target as HTMLElement;

    if (!target.closest('.search-wrapper')) {
      this.mostrarSugerencias = false;
    }
  }
}