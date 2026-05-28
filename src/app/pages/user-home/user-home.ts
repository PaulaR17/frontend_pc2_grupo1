import { Component, OnInit, inject, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { PublicDataService, LocationSuggestion } from '../../core/services/public-data';
import { AdminService, IncidentSummary, IncidentType } from '../../core/services/admin';
import { PredictionService, Prediction, PredictionLevel } from '../../core/services/prediction';
import { PoiService, Poi } from '../../core/services/poi';
import { RouteService, RouteResponse, RiskZone, UserProfile, RouteStep } from '../../core/services/route';
import { getCentroid } from '../../core/services/madrid-districts';
import { decodePolyline } from '../../core/utils/polyline';
import { iconoPoi } from '../../core/utils/poi-icon';
import { iconoOrigen, iconoDestino } from '../../core/utils/route-markers';
import { formatearFecha } from '../../core/utils/date-format';
import { muestrearRuta } from '../../core/utils/route-sampling';
import { formatearDuracion, formatearMetros } from '../../core/utils/route-format';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import * as L from 'leaflet';
import { HeaderComponent } from '../../core/components/header/header';

interface SavedRoute {
  name: string;
  distance_km: number;
  duration_min: number;
  lat: number;
  lng: number;
}

//home del usuario registrado con mapa, busqueda origen+destino, ruta real,
//predicciones, POIs, zonas de riesgo y guardado en favoritos
@Component({
  selector: 'app-user-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HeaderComponent],
  templateUrl: './user-home.html',
  styleUrls: ['./user-home.scss']
})
export class UserHomeComponent implements OnInit, AfterViewInit {
  private authService = inject(AuthService);
  private dataService = inject(PublicDataService);
  private adminService = inject(AdminService);
  private predictionService = inject(PredictionService);
  private poiService = inject(PoiService);
  private routeService = inject(RouteService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

  user: any = null;
  userInitials = '';
  userMenuOpen = false;

  searchCount = 0;
  ecoScore = 0;

  //modal de reportar incidencia
  reporteAbierto = false;
  reporteTipo: IncidentType = 'ACCIDENT';
  reporteTitulo = '';
  reporteDescripcion = '';
  reporteEnviando = false;

  //destino
  searchQuery = '';
  mostrarSugerencias = false;
  loadingSuggestions = false;
  locationSuggestions: LocationSuggestion[] = [];
  selectedLocation: LocationSuggestion | null = null;
  private searchTimer: any = null;

  //origen
  origenQuery = '';
  mostrarSugerenciasOrigen = false;
  loadingSuggestionsOrigen = false;
  origenSuggestions: LocationSuggestion[] = [];
  selectedOrigen: LocationSuggestion | null = null;
  private origenSearchTimer: any = null;

  loadingRoute = false;
  notificationMessage = '';
  notificationType: 'success' | 'error' | 'warning' | '' = '';

  activeTab: 'inicio' | 'rutas' | 'ayuda' | 'vehiculos' | 'mascota' = 'inicio';

  //que pregunta del FAQ esta abierta (1..5). 0 = ninguna
  ayudaAbierta: number = 0;

  savedRoutes: SavedRoute[] = [];

  //perfil con ubicaciones guardadas (casa/trabajo)
  profile: UserProfile | null = null;
  //decide a cual de los dos campos (home/work) guardara la siguiente busqueda
  configurandoUbicacion: 'home' | 'work' | null = null;

  //ultima ruta calculada; al pulsar "guardar en favoritos" se persiste primero
  //en historial y luego se marca como favorita
  ultimaRuta: {
    origin: { lat: number; lon: number; label?: string };
    destination: { lat: number; lon: number; label?: string };
    summary: any;
  } | null = null;
  guardandoFavorito = false;

  //zonas de riesgo atravesadas por la ultima ruta calculada. se muestra
  //en un panel persistente al lado del mapa con el nombre del distrito.
  zonasRiesgoActuales: RiskZone[] = [];
  recalculandoRuta = false;

  //resumen + indicaciones paso a paso de la ruta actual
  resumenRuta: { distance_km: number; duration_min: number } | null = null;
  pasosRuta: RouteStep[] = [];

  private map!: L.Map;
  private zoneLayer: L.LayerGroup = L.layerGroup();
  private incidentsLayer: L.LayerGroup = L.layerGroup();
  private predictionsLayer: L.LayerGroup = L.layerGroup();
  private poisLayer: L.LayerGroup = L.layerGroup();
  private routeLayer: L.LayerGroup = L.layerGroup();
  //circulos translucidos sobre los distritos peligrosos atravesados por la ruta
  private riskLayer: L.LayerGroup = L.layerGroup();

  mostrarPredicciones = false;
  prediccionesCargadas: Prediction[] = [];

  //fechas distintas de prediccion (ordenadas) y el indice seleccionado
  //en el slider; sirve para que el usuario pueda ver predicciones de
  //los proximos dias
  fechasPrediccion: string[] = [];
  fechaPrediccionIdx: number = 0;

  mostrarPois = false;
  poisLoading = false;
  private puntosRutaActual: [number, number][] = [];

  ngOnInit(): void {
    this.cargarUsuarioActual();
    this.cargarRutasGuardadas();
  }

  ngAfterViewInit(): void {
    this.initMap();
    //si venimos desde el historial con queryParams, recalculamos la ruta
    this.recalcularDesdeQueryParams();
  }

  //si la URL trae origin_lat/lon/label y dest_lat/lon/label, rellena
  //los campos del buscador y dispara el calculo automatico. Lo usa el
  //boton "Volver a calcular" de la pagina /routes
  private recalcularDesdeQueryParams(): void {
    const params = this.activatedRoute.snapshot.queryParamMap;
    const oLat = params.get('origin_lat');
    const oLon = params.get('origin_lon');
    const dLat = params.get('dest_lat');
    const dLon = params.get('dest_lon');

    const hayCoords = oLat && oLon && dLat && dLon;

    if (hayCoords) {
      const origenLabel = params.get('origin_label') ?? 'Origen';
      const destinoLabel = params.get('dest_label') ?? 'Destino';

      this.selectedOrigen = {
        lat: Number(oLat),
        lon: Number(oLon),
        text: origenLabel,
        name: origenLabel
      } as LocationSuggestion;
      this.origenQuery = origenLabel;

      const destino: LocationSuggestion = {
        lat: Number(dLat),
        lon: Number(dLon),
        text: destinoLabel,
        name: destinoLabel
      } as LocationSuggestion;
      this.selectedLocation = destino;
      this.searchQuery = destinoLabel;

      this.calculateRouteTo(destino);
    }
  }

  //carga el usuario actual; si no hay id en localStorage hace logout
  private cargarUsuarioActual(): void {
    const id = localStorage.getItem('user_id');

    if (id) {
      const userId = Number(id);
      this.authService.getUser(userId).subscribe({
        next: (res: any) => {
          this.user = res;
          this.userInitials = this.buildInitials(res.name);
          this.ecoScore = res.eco_score ?? Math.floor(Math.random() * 40) + 60;
          this.cargarPerfilUbicaciones(userId);
        },
        error: () => this.logout()
      });
    } else {
      this.logout();
    }
  }

  //recupera home/work del usuario para los accesos rapidos
  private cargarPerfilUbicaciones(userId: number): void {
    this.routeService.getProfile(userId).subscribe({
      next: (perfil) => {
        this.profile = perfil;
      },
      error: () => {
        console.warn('No se pudo cargar el perfil del usuario.');
      }
    });
  }

  private cargarRutasGuardadas(): void {
    const storedRoutes = localStorage.getItem('saved_routes');

    if (storedRoutes) {
      this.savedRoutes = JSON.parse(storedRoutes);
    }
  }

  //iniciales (1 o 2 letras) a partir del nombre
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
    this.routeLayer.addTo(this.map);
    this.riskLayer.addTo(this.map);

    this.cargarIncidencias();
  }

  //dibuja la polyline de la ruta sobre el mapa; reemplaza la anterior si la habia
  private dibujarRuta(geometry: string | null | undefined): void {
    this.routeLayer.clearLayers();

    if (geometry) {
      const puntos = decodePolyline(geometry);
      const hayPuntos = puntos.length > 0;
      if (hayPuntos) {
        const polyline = L.polyline(puntos, {
          color: '#198754',
          weight: 5,
          opacity: 0.85,
        });
        polyline.addTo(this.routeLayer);
        this.map.fitBounds(polyline.getBounds(), { padding: [30, 30] });
        this.puntosRutaActual = puntos;
        if (this.mostrarPois) {
          this.cargarPois();
        }
      }
    }
  }

  //pinta un circulo translucido sobre cada distrito de la lista de riesgos:
  //rojo para ALTO, naranja para MEDIO, sin marca para BAJO (no satura el mapa)
  private dibujarZonasRiesgo(zonas: Array<{ district: number; level: string; probability: number }>): void {
    this.riskLayer.clearLayers();

    for (const zona of zonas) {
      const pintar = zona.level === 'ALTO' || zona.level === 'MEDIO';
      const centroide = getCentroid(zona.district);

      if (pintar && centroide) {
        const color = zona.level === 'ALTO' ? '#dc3545' : '#fd7e14';
        const popup = `<b>${centroide.name}</b><br>Riesgo: <strong>${zona.level}</strong><br>Probabilidad: ${(zona.probability * 100).toFixed(0)}%`;

        L.circle([centroide.lat, centroide.lon], {
          radius: 1500,
          color,
          weight: 1,
          fillColor: color,
          fillOpacity: 0.18,
        })
          .bindPopup(popup)
          .addTo(this.riskLayer);
      }
    }
  }

  togglePredicciones(): void {
    this.mostrarPredicciones = !this.mostrarPredicciones;

    if (this.mostrarPredicciones) {
      this.predictionsLayer.addTo(this.map);
      this.cargarPredicciones();
    } else {
      this.map.removeLayer(this.predictionsLayer);
    }
  }

  togglePois(): void {
    this.mostrarPois = !this.mostrarPois;

    if (this.mostrarPois) {
      this.poisLayer.addTo(this.map);
      this.cargarPois();
    } else {
      this.map.removeLayer(this.poisLayer);
    }
  }

  refrescarPois(): void {
    if (this.mostrarPois) {
      this.cargarPois();
    }
  }

  //POIs repartidos a lo largo de la ruta (muestras cada ~700 m, radio
  //pequeño) en vez de 3 grandes circulos al inicio/medio/final
  private cargarPois(): void {
    this.poisLoading = true;

    const hayRuta = this.puntosRutaActual.length >= 2;
    const centros = this.puntosBusquedaPois();
    const radio = hayRuta ? 600 : 1500;
    const limitePorPunto = hayRuta ? 10 : 25;

    const llamadas = centros.map((c) =>
      this.poiService.search(c[0], c[1], radio, limitePorPunto).pipe(catchError(() => of([] as Poi[])))
    );

    forkJoin(llamadas).subscribe({
      next: (resultados) => {
        this.poisLoading = false;
        const todos: Poi[] = ([] as Poi[]).concat(...resultados);
        this.dibujarPois(this.dedupePois(todos));
      },
      error: () => {
        this.poisLoading = false;
        console.warn('No se pudieron cargar los POIs.');
      }
    });
  }

  private puntosBusquedaPois(): [number, number][] {
    const ruta = this.puntosRutaActual;
    let puntos: [number, number][];

    if (ruta.length >= 2) {
      //tope de 8 muestras para no disparar demasiadas peticiones a ORS
      puntos = muestrearRuta(ruta, 700, 8);
    } else {
      const centro = this.map.getCenter();
      puntos = [[centro.lat, centro.lng]];
    }

    return puntos;
  }

  //agrupa POIs en una rejilla de ~80m (3 decimales) para que el mapa
  //no se llene de marcadores pegados que no se pueden pulsar bien
  private dedupePois(lista: Poi[]): Poi[] {
    const vistos = new Set<string>();
    const unicos: Poi[] = [];

    for (const poi of lista) {
      const clave = `${poi.lat.toFixed(3)},${poi.lng.toFixed(3)}`;
      const nuevo = !vistos.has(clave);
      if (nuevo) {
        vistos.add(clave);
        unicos.push(poi);
      }
    }

    return unicos;
  }

  //pinta cada POI con un icono distinto segun su grupo (gastronomia, ocio, turismo)
  private dibujarPois(pois: Poi[]): void {
    this.poisLayer.clearLayers();

    for (const poi of pois) {
      const popup = `<b>${poi.name}</b><br><small>${poi.category}</small>`;

      L.marker([poi.lat, poi.lng], { icon: iconoPoi(poi.group) })
        .bindPopup(popup)
        .addTo(this.poisLayer);
    }
  }

  private cargarPredicciones(): void {
    this.predictionService.getPredictions({ limit: 500 }).subscribe({
      next: (lista) => {
        this.prediccionesCargadas = lista || [];
        this.calcularFechasPrediccion();
        this.dibujarPrediccionesDelDia();
      },
      error: () => {
        console.warn('No se pudieron cargar las predicciones.');
        this.prediccionesCargadas = [];
        this.fechasPrediccion = [];
      }
    });
  }

  //extrae las fechas distintas de las predicciones cargadas, las ordena
  //de la mas antigua a la mas reciente y selecciona la primera por
  //defecto (normalmente "hoy" o el dia siguiente disponible)
  private calcularFechasPrediccion(): void {
    const conjunto = new Set<string>();
    for (const pred of this.prediccionesCargadas) {
      if (pred.for_date) {
        conjunto.add(pred.for_date);
      }
    }

    const lista = Array.from(conjunto);
    lista.sort();

    this.fechasPrediccion = lista;
    this.fechaPrediccionIdx = 0;
  }

  //dibuja solo las predicciones del dia actualmente seleccionado por el slider
  private dibujarPrediccionesDelDia(): void {
    let predsHoy: Prediction[] = this.prediccionesCargadas;

    if (this.fechasPrediccion.length > 0) {
      const fecha = this.fechasPrediccion[this.fechaPrediccionIdx];
      predsHoy = this.prediccionesCargadas.filter((p) => p.for_date === fecha);
    }

    this.dibujarPredicciones(predsHoy);
  }

  //handler del slider del HTML
  cambiarDiaPrediccion(idx: number): void {
    this.fechaPrediccionIdx = idx;
    this.dibujarPrediccionesDelDia();
  }

  //texto legible de la fecha seleccionada (vacio si no hay fechas)
  fechaPrediccionTexto(): string {
    let texto = '';
    if (this.fechasPrediccion.length > 0) {
      texto = formatearFecha(this.fechasPrediccion[this.fechaPrediccionIdx]);
    }
    return texto;
  }

  //version corta para los extremos del slider ("16 may")
  fechaCorta(iso: string): string {
    let texto = '';
    if (iso) {
      const fecha = new Date(iso);
      if (!isNaN(fecha.getTime())) {
        texto = fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
      } else {
        texto = iso;
      }
    }
    return texto;
  }

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
    const fecha = formatearFecha(pred.for_date);

    return `
      <b>${nombreDistrito}</b><br>
      <small>Predicción para ${fecha}</small><br>
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

  //debounce de 250 ms al teclear en destino
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
      error: () => {
        this.locationSuggestions = [];
        this.loadingSuggestions = false;
        this.showNotification('No se pudieron cargar las sugerencias.', 'error');
      }
    });
  }

  //click del boton de buscar/calcular ruta
  onSearch(): void {
    const query = this.searchQuery.trim();

    if (query === '') {
      this.showNotification('Introduce una ubicación para buscar.', 'warning');
    } else if (this.configurandoUbicacion) {
      this.guardarUbicacionDesdeBusqueda(query);
    } else if (this.selectedLocation) {
      this.calculateRouteTo(this.selectedLocation);
    } else if (this.locationSuggestions.length > 0) {
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
      error: () => {
        this.showNotification('Error buscando la ubicación.', 'error');
      }
    });
  }

  //input del origen
  onOrigenInput(): void {
    this.selectedOrigen = null;

    const query = this.origenQuery.trim();

    if (this.origenSearchTimer) {
      clearTimeout(this.origenSearchTimer);
    }

    this.origenSearchTimer = setTimeout(() => {
      this.loadOrigenSuggestions(query);
    }, 250);
  }

  onOrigenFocus(): void {
    this.mostrarSugerenciasOrigen = true;

    if (this.origenSuggestions.length === 0) {
      this.loadOrigenSuggestions(this.origenQuery.trim());
    }
  }

  private loadOrigenSuggestions(query: string): void {
    this.loadingSuggestionsOrigen = true;
    this.mostrarSugerenciasOrigen = true;

    this.dataService.searchLocation(query).subscribe({
      next: (res: any) => {
        this.origenSuggestions = res.results ?? [];
        this.loadingSuggestionsOrigen = false;
      },
      error: () => {
        this.origenSuggestions = [];
        this.loadingSuggestionsOrigen = false;
      }
    });
  }

  selectOrigenSuggestion(suggestion: LocationSuggestion): void {
    this.selectedOrigen = suggestion;
    this.origenQuery = suggestion.text;
    this.origenSuggestions = [];
    this.mostrarSugerenciasOrigen = false;
  }

  selectSuggestion(suggestion: LocationSuggestion): void {
    this.selectedLocation = suggestion;
    this.searchQuery = suggestion.text;
    this.locationSuggestions = [];
    this.mostrarSugerencias = false;
    this.previewLocationOnMap(suggestion);
  }

  //pide preview al backend y pinta polyline + zonas de riesgo.
  //"avoidDistricts" permite pedir al backend una ruta que evite los
  //distritos peligrosos (lo usa el boton "Recalcular evitando").
  private calculateRouteTo(destination: LocationSuggestion, avoidDistricts: number[] = []): void {
    this.loadingRoute = true;

    const origenLat = this.selectedOrigen?.lat ?? 40.4167;
    const origenLon = this.selectedOrigen?.lon ?? -3.7033;
    const origenLabel = this.selectedOrigen?.text ?? 'Puerta del Sol';
    const origen = { lat: origenLat, lon: origenLon, label: origenLabel };
    const destino = { lat: destination.lat, lon: destination.lon, label: destination.text };

    this.routeService.preview(origen, destino, 'driving-car', avoidDistricts).subscribe({
      next: (routeRes: RouteResponse) => {
        this.loadingRoute = false;
        this.recalculandoRuta = false;
        this.searchCount = this.searchCount + 1;

        this.displayLocationOnMap(destination, routeRes.summary);
        //marcador A en el origen para que se vea claro desde donde sale la ruta
        this.dibujarMarcadorOrigen(origenLat, origenLon, origenLabel);
        this.dibujarRuta(routeRes.geometry);
        this.dibujarZonasRiesgo(routeRes.risk_zones ?? []);

        this.ultimaRuta = { origin: origen, destination: destino, summary: routeRes.summary };
        this.guardarRutaLocal(destination, routeRes.summary);

        //resumen + indicaciones para el panel flotante
        this.resumenRuta = routeRes.summary ?? null;
        this.pasosRuta = routeRes.steps ?? [];

        const peligros = (routeRes.risk_zones ?? []) as RiskZone[];
        this.zonasRiesgoActuales = peligros;

        const altos = peligros.filter((z) => z.level === 'ALTO');
        const medios = peligros.filter((z) => z.level === 'MEDIO');
        let aviso = 'Ruta calculada correctamente.';
        if (avoidDistricts.length > 0 && peligros.length === 0) {
          aviso = 'Ruta recalculada sin pasar por zonas de riesgo.';
        } else if (altos.length > 0) {
          aviso = `Ruta calculada. Atención: ${altos.length} zona(s) con riesgo ALTO en el camino.`;
        } else if (medios.length > 0) {
          aviso = `Ruta calculada. ${medios.length} zona(s) con riesgo MEDIO en el camino.`;
        }
        const tipoAviso = altos.length > 0 ? 'warning' : 'success';
        this.showNotification(aviso, tipoAviso);
      },
      error: () => {
        this.loadingRoute = false;
        this.recalculandoRuta = false;
        this.displayLocationOnMap(destination, null);
        const msg = avoidDistricts.length > 0
          ? 'No se ha encontrado una ruta alternativa que evite esas zonas.'
          : 'Se ha encontrado la ubicación, pero no se pudo calcular la ruta.';
        this.showNotification(msg, 'warning');
      }
    });
  }

  //repite el calculo de la ruta pidiendo a ORS que evite los distritos
  //actualmente marcados como peligrosos. Lo dispara el boton del panel
  //de "zonas de riesgo".
  recalcularEvitandoRiesgo(): void {
    if (this.selectedLocation && this.zonasRiesgoActuales.length > 0) {
      const ids = this.zonasRiesgoActuales.map((z) => z.district);
      this.recalculandoRuta = true;
      this.calculateRouteTo(this.selectedLocation, ids);
    }
  }

  //guarda la ultima ruta en localStorage (max 20) para el historial rapido
  private guardarRutaLocal(destination: LocationSuggestion, summary: any): void {
    const route: SavedRoute = {
      name: destination.text ?? destination.name ?? this.searchQuery,
      distance_km: summary?.distance_km ?? 0,
      duration_min: summary?.duration_min ?? 0,
      lat: destination.lat,
      lng: destination.lon
    };

    this.savedRoutes.unshift(route);
    this.savedRoutes = this.savedRoutes.slice(0, 20);
    localStorage.setItem('saved_routes', JSON.stringify(this.savedRoutes));
  }

  private previewLocationOnMap(location: LocationSuggestion): void {
    this.zoneLayer.clearLayers();
    this.map.flyTo([location.lat, location.lon], 14);

    L.marker([location.lat, location.lon], { icon: iconoDestino() })
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

    //marcador del destino (B, rojo)
    L.marker([location.lat, location.lon], { icon: iconoDestino() })
      .addTo(this.zoneLayer)
      .bindPopup(popupLines.join('<br>'))
      .openPopup();
  }

  //marcador A para el punto de salida; se llama justo despues de pintar el destino
  private dibujarMarcadorOrigen(lat: number, lon: number, label: string): void {
    L.marker([lat, lon], { icon: iconoOrigen() })
      .addTo(this.zoneLayer)
      .bindPopup(`<b>Origen</b><br>${label}`);
  }

  //primero crea la entrada de historial via POST /routes y luego la marca
  //como favorita en POST /users/{id}/routes/favorites
  guardarEnFavoritos(): void {
    const userId = this.authService.getCurrentUserId();

    if (!this.ultimaRuta) {
      this.showNotification('Primero calcula una ruta.', 'warning');
    } else if (!userId) {
      this.showNotification('Sesión no válida.', 'error');
    } else {
      this.guardandoFavorito = true;

      this.routeService.calculate(userId, this.ultimaRuta.origin, this.ultimaRuta.destination, 'driving-car').subscribe({
        next: (res: RouteResponse) => {
          const historyId = res.history_id;
          const reward = res.reward;
          if (historyId) {
            this.routeService.addFavorite(userId, historyId).subscribe({
              next: () => {
                this.guardandoFavorito = false;
                let msg = 'Ruta guardada en favoritos.';
                if (reward && reward.coins > 0) {
                  msg = msg + ` +${reward.coins} chapitas, +${reward.xp} XP`;
                  if (reward.level_up) {
                    msg = msg + ` (¡nivel ${reward.new_level}!)`;
                  }
                }
                this.showNotification(msg, 'success');
              },
              error: () => {
                this.guardandoFavorito = false;
                this.showNotification('No se pudo marcar la ruta como favorita.', 'error');
              }
            });
          } else {
            this.guardandoFavorito = false;
            this.showNotification('No se pudo crear la entrada de historial.', 'error');
          }
        },
        error: () => {
          this.guardandoFavorito = false;
          this.showNotification('Error guardando la ruta.', 'error');
        }
      });
    }
  }

  //rellena el destino con la ubicacion de casa o trabajo y dispara la ruta
  irA(tipo: 'home' | 'work'): void {
    if (!this.profile) {
      this.showNotification('Aún no se ha cargado tu perfil.', 'warning');
    } else {
      const lat = tipo === 'home' ? this.profile.home_lat : this.profile.work_lat;
      const lon = tipo === 'home' ? this.profile.home_lon : this.profile.work_lon;
      const etiqueta = tipo === 'home' ? 'Casa' : 'Trabajo';

      if (lat === null || lat === undefined || lon === null || lon === undefined) {
        this.showNotification(`Aún no has configurado tu ${etiqueta.toLowerCase()}.`, 'warning');
      } else {
        const destino: LocationSuggestion = { text: etiqueta, lat, lon };
        this.selectedLocation = destino;
        this.searchQuery = etiqueta;
        this.mostrarSugerencias = false;
        this.calculateRouteTo(destino);
      }
    }
  }

  //pone el buscador en modo "configurar casa/trabajo": la siguiente busqueda
  //no calcula ruta, guarda esa ubicacion en el perfil del usuario
  configurarUbicacion(tipo: 'home' | 'work'): void {
    this.configurandoUbicacion = tipo;
    this.searchQuery = '';
    this.selectedLocation = null;
    this.locationSuggestions = [];
    const etiqueta = tipo === 'home' ? 'casa' : 'trabajo';
    this.showNotification(`Busca tu ${etiqueta} y pulsa el botón verde para guardarla.`, 'warning');
  }

  cancelarConfiguracion(): void {
    this.configurandoUbicacion = null;
    this.searchQuery = '';
    this.locationSuggestions = [];
    this.notificationMessage = '';
  }

  //resuelve la ubicacion buscada y llama al endpoint de setHome/setWork
  private guardarUbicacionDesdeBusqueda(query: string): void {
    const userId = this.authService.getCurrentUserId();
    const tipo = this.configurandoUbicacion;

    if (!userId || !tipo) {
      this.showNotification('Sesión no válida.', 'error');
    } else if (this.selectedLocation) {
      this.persistirUbicacion(userId, tipo, this.selectedLocation);
    } else {
      this.dataService.searchLocation(query).subscribe({
        next: (res: any) => {
          const first = res.results?.[0];
          if (!first) {
            this.showNotification('No se encontró esa ubicación.', 'warning');
          } else {
            this.persistirUbicacion(userId, tipo, first);
          }
        },
        error: () => {
          this.showNotification('Error buscando la ubicación.', 'error');
        }
      });
    }
  }

  private persistirUbicacion(userId: number, tipo: 'home' | 'work', loc: LocationSuggestion): void {
    const llamada = tipo === 'home'
      ? this.routeService.setHome(userId, loc.lat, loc.lon)
      : this.routeService.setWork(userId, loc.lat, loc.lon);

    llamada.subscribe({
      next: (perfil) => {
        this.profile = perfil;
        this.configurandoUbicacion = null;
        this.searchQuery = '';
        const etiqueta = tipo === 'home' ? 'Casa' : 'Trabajo';
        this.showNotification(`${etiqueta} guardada en tu perfil.`, 'success');
      },
      error: () => {
        this.showNotification('No se pudo guardar la ubicación.', 'error');
      }
    });
  }

  replayRoute(route: SavedRoute): void {
    const destino: LocationSuggestion = { text: route.name, lat: route.lat, lon: route.lng };
    this.selectedLocation = destino;
    this.searchQuery = route.name;
    this.activeTab = 'inicio';
    this.calculateRouteTo(destino);
  }

  goToVehicles(): void {
    this.activeTab = 'vehiculos';
    this.router.navigate(['/vehicles']);
  }

  //abre el modal de reportar incidencia (precarga el centro del mapa como punto)
  abrirReporte(): void {
    this.reporteAbierto = true;
    this.reporteTipo = 'ACCIDENT';
    this.reporteTitulo = '';
    this.reporteDescripcion = '';
  }

  cerrarReporte(): void {
    this.reporteAbierto = false;
  }

  //envia la incidencia al backend usando como coords el centro actual del mapa
  enviarReporte(): void {
    const centro = this.map.getCenter();
    this.reporteEnviando = true;

    this.adminService.reportIncident({
      type: this.reporteTipo,
      lat: centro.lat,
      lon: centro.lng,
      title: this.reporteTitulo || null,
      description: this.reporteDescripcion || null,
    }).subscribe({
      next: (res: any) => {
        this.reporteEnviando = false;
        this.reporteAbierto = false;
        let msg = 'Incidencia reportada. ¡Gracias por avisar!';
        const reward = res?.reward;
        if (reward && reward.coins > 0) {
          msg = msg + ` +${reward.coins} chapitas, +${reward.xp} XP`;
          if (reward.level_up) {
            msg = msg + ` (¡nivel ${reward.new_level}!)`;
          }
        }
        this.showNotification(msg, 'success');
        //recargamos la capa de incidencias para que la vea en el mapa al instante
        this.cargarIncidencias();
      },
      error: () => {
        this.reporteEnviando = false;
        this.showNotification('No se pudo enviar la incidencia.', 'error');
      },
    });
  }

  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
  }

  //abre/cierra una pregunta del FAQ de ayuda. si pulsas la misma
  //que ya estaba abierta, la cierra
  toggleAyuda(numero: number): void {
    if (this.ayudaAbierta === numero) {
      this.ayudaAbierta = 0;
    } else {
      this.ayudaAbierta = numero;
    }
  }

  logout(): void {
    this.authService.logout();
  }

  //formatos del panel flotante de la ruta
  duracionLegible(min: number | null | undefined): string {
    return formatearDuracion(min);
  }

  metrosLegibles(m: number | null | undefined): string {
    return formatearMetros(m);
  }

  //cierra el panel de info de ruta (resumen + zonas de riesgo + indicaciones)
  cerrarPanelRuta(): void {
    this.resumenRuta = null;
    this.pasosRuta = [];
    this.zonasRiesgoActuales = [];
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

  //cierra menus y sugerencias si el usuario clica fuera de ellos
  @HostListener('document:click', ['$event'])
  clickOut(event: Event): void {
    const target = event.target as HTMLElement;

    if (!target.closest('.card') && !target.closest('.input-group')) {
      this.mostrarSugerencias = false;
      this.mostrarSugerenciasOrigen = false;
    }

    if (!target.closest('.navbar')) {
      this.userMenuOpen = false;
    }
  }
}
