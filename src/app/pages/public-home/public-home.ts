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
  
  // Estado de sesión y búsqueda
  guestId: string | null = null;
  searchCount: number = 0;
  showLimitModal: boolean = false;
  searchQuery: string = ''; 
  
  // Sugerencias de zonas
  zonasDisponibles: string[] = ['Centro', 'Arganzuela', 'Retiro', 'Salamanca', 'Chamartín', 
            'Tetuán', 'Chamberí', 'Fuencarral-El Pardo', 'Moncloa-Aravaca', 
            'Latina', 'Carabanchel', 'Usera', 'Puente de Vallecas', 
            'Moratalaz', 'Ciudad Lineal', 'Hortaleza', 'Villaverde', 
            'Villa de Vallecas', 'Vicálvaro', 'San Blas-Canillejas', 'Barajas'];
  mostrarSugerencias: boolean = false;
  
  // Mapa
  private map!: L.Map;
  private zoneLayer: L.LayerGroup = L.layerGroup();

  ngOnInit(): void {
    this.dataService.createGuestSession().subscribe({
      next: (res: any) => {
        this.guestId = res.session_id;
        localStorage.setItem('guest_id', res.session_id);
        this.checkQuota(res.session_id);
      }
    });
  }

  private checkQuota(id: string): void {
    this.dataService.getQuota(id).subscribe({
      next: (res: any) => {
        this.searchCount = res.search_count;
      }
    });
  }

  ngAfterViewInit(): void {
    this.initMap();
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
    const id = this.guestId;
    const query = this.searchQuery.trim();

    if (id !== null && query !== '') {
      this.executeSearchLogic(id, query);
    }
  }

  private executeSearchLogic(id: string, query: string): void {
    if (this.searchCount < 3) {
      this.dataService.searchByZone(id, query).subscribe({
        next: (res: any) => {
          this.searchCount = res.new_count;
          this.mostrarSugerencias = false;
          this.displayZoneOnMap(res.zone_data);
        },
        error: (err: any) => {
          if (err.status === 403) {
            this.showLimitModal = true;
          }
        }
      });
    }

    if (this.searchCount >= 3) {
      this.showLimitModal = true;
    }
  }

  private displayZoneOnMap(zone: any): void {
    this.zoneLayer.clearLayers();
    // Coordenadas fallback por si el back no las trae
    const lat = zone?.latitude || 40.4167;
    const lng = zone?.longitude || -3.7033;
    
    this.map.flyTo([lat, lng], 14);
    L.marker([lat, lng])
      .addTo(this.zoneLayer)
      .bindPopup(`<b>Zona: ${this.searchQuery}</b>`)
      .openPopup();
  }

  seleccionarZona(zona: string): void {
    this.searchQuery = zona;
    this.mostrarSugerencias = false;
    this.onSearch();
  }

  @HostListener('document:click', ['$event'])
  clickOut(event: Event): void {
    if (!(event.target as HTMLElement).closest('.search-wrapper')) {
      this.mostrarSugerencias = false;
    }
  }
}