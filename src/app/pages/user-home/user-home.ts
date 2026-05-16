import { Component, OnInit, inject, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { PublicDataService } from '../../core/services/public-data';
import { AdminService, IncidentSummary, IncidentType } from '../../core/services/admin';
import * as L from 'leaflet';

interface SavedRoute {
  name: string;
  distance_km: number;
  duration_min: number;
  lat: number;
  lng: number;
}

@Component({
  selector: 'app-user-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './user-home.html',
  styleUrls: ['./user-home.scss']
})
export class UserHomeComponent implements OnInit, AfterViewInit {
  private authService = inject(AuthService);
  private dataService = inject(PublicDataService);
  private adminService = inject(AdminService);
  private router = inject(Router);

  user: any = null;
  userInitials = '';
  userMenuOpen = false;

  searchCount = 0;
  ecoScore = 0;
  searchQuery = '';
  mostrarSugerencias = false;

  activeTab: 'inicio' | 'rutas' | 'ayuda' | 'vehiculos' | 'mascota' = 'inicio';

  savedRoutes: SavedRoute[] = [];

  // Distritos de Madrid (no cambia)
  zonasDisponibles: string[] = [
    'Centro', 'Arganzuela', 'Retiro', 'Salamanca', 'Chamartín', 'Tetuán',
    'Chamberí', 'Fuencarral-El Pardo', 'Moncloa-Aravaca', 'Latina',
    'Carabanchel', 'Usera', 'Puente de Vallecas', 'Moratalaz', 'Ciudad Lineal',
    'Hortaleza', 'Villaverde', 'Villa de Vallecas', 'Vicálvaro',
    'San Blas-Canillejas', 'Barajas'
  ];

  private map!: L.Map;
  private zoneLayer: L.LayerGroup = L.layerGroup();
  private incidentsLayer: L.LayerGroup = L.layerGroup();

  ngOnInit(): void {
    this.cargarUsuarioActual();
    this.cargarRutasGuardadas();
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  // -------------------------------------------------------
  //  CARGA INICIAL
  // -------------------------------------------------------

  /**
   * Carga el usuario actual.
   * Refactorizado para usar if/else (sin return dentro del if).
   */
  private cargarUsuarioActual(): void {
    const id = localStorage.getItem('user_id');

    if (id) {
      this.authService.getUser(Number(id)).subscribe({
        next: (res: any) => {
          this.user = res;
          this.userInitials = this.buildInitials(res.name);
          this.ecoScore = res.eco_score ?? Math.floor(Math.random() * 40) + 60;
        },
        error: () => this.logout()
      });
    } else {
      this.logout();
    }
  }

  private cargarRutasGuardadas(): void {
    const storedRoutes = localStorage.getItem('saved_routes');

    if (storedRoutes) {
      this.savedRoutes = JSON.parse(storedRoutes);
    }
  }

  /** Iniciales (1 ó 2 letras) a partir del nombre. */
  private buildInitials(name: string): string {
    let iniciales = '?';

    if (name) {
      const parts = name.trim().split(' ');
      iniciales = parts.length >= 2
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : parts[0][0].toUpperCase();
    }
    return iniciales;
  }

  private initMap(): void {
    this.map = L.map('map', {
      center: [40.4167, -3.7033],
      zoom: 12,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);
    this.zoneLayer.addTo(this.map);
    this.incidentsLayer.addTo(this.map);

    // Pintamos las incidencias activas en el mapa.
    this.cargarIncidencias();
  }

  // -------------------------------------------------------
  //  CAPA DE INCIDENCIAS
  // -------------------------------------------------------

  private cargarIncidencias(): void {
    this.adminService.getIncidents().subscribe({
      next: (lista) => {
        this.dibujarIncidencias(lista || []);
      },
      error: () => {
        console.warn('No se pudieron cargar las incidencias.');
      }
    });
  }

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

  // -------------------------------------------------------
  //  BÚSQUEDA Y RUTA
  // -------------------------------------------------------

  /**
   * Lanza una búsqueda; solo procede si hay texto.
   * Refactorizado: if/else en vez de return-temprano.
   */
  onSearch(): void {
    const query = this.searchQuery.trim();

    if (query !== '') {
      this.mostrarSugerencias = false;
      this.realizarBusqueda(query);
    }
  }

  private realizarBusqueda(query: string): void {
    this.dataService.searchLocation(query).subscribe({
      next: (searchRes: any) => {
        const destination = searchRes.results?.[0];

        if (destination) {
          this.guardarYMostrarRuta(destination, query);
        }
      },
      error: () => {
        alert('No se ha podido buscar la ubicación.');
      }
    });
  }

  private guardarYMostrarRuta(destination: any, query: string): void {
    this.searchCount++;

    const route: SavedRoute = {
      name: destination.text ?? query,
      distance_km: destination.distance_km ?? 0,
      duration_min: destination.duration_min ?? 0,
      lat: destination.lat,
      lng: destination.lon
    };

    this.savedRoutes.unshift(route);
    localStorage.setItem('saved_routes', JSON.stringify(this.savedRoutes.slice(0, 20)));

    this.displayZoneOnMap({
      latitude: destination.lat,
      longitude: destination.lon,
      text: destination.text
    });
  }

  private displayZoneOnMap(zone: any): void {
    this.zoneLayer.clearLayers();

    const lat = zone?.latitude ?? 40.4167;
    const lng = zone?.longitude ?? -3.7033;
    const text = zone?.text ?? this.searchQuery;

    this.map.flyTo([lat, lng], 14);

    L.marker([lat, lng])
      .addTo(this.zoneLayer)
      .bindPopup(`<b>${text}</b>`)
      .openPopup();
  }

  replayRoute(route: SavedRoute): void {
    this.displayZoneOnMap({
      latitude: route.lat,
      longitude: route.lng,
      text: route.name
    });
    this.activeTab = 'inicio';
  }

  seleccionarZona(zona: string): void {
    this.searchQuery = zona;
    this.mostrarSugerencias = false;
    this.onSearch();
  }

  goToVehicles(): void {
    this.activeTab = 'vehiculos';
    this.router.navigate(['/vehicles']);
  }


  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
  }

  logout(): void {
    this.authService.logout();
  }

  /** Cierra menús cuando el usuario clica fuera. */
  @HostListener('document:click', ['$event'])
  clickOut(event: Event): void {
    const target = event.target as HTMLElement;

    if (!target.closest('.input-group')) {
      this.mostrarSugerencias = false;
    }

    if (!target.closest('.navbar')) {
      this.userMenuOpen = false;
    }
  }
}