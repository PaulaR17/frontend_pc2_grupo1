import { Component, OnInit, inject, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PublicDataService, LocationSuggestion } from '../../core/services/public-data';
import { RouteStep } from '../../core/services/route';
import { AdminService, IncidentSummary, IncidentType } from '../../core/services/admin';
import { PredictionService, Prediction, PredictionLevel } from '../../core/services/prediction';
import { PoiService, Poi } from '../../core/services/poi';
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

//home publico de invitados con mapa, predicciones y buscador
@Component({
  selector: 'app-public-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HeaderComponent],
  templateUrl: './public-home.html',
  styleUrls: ['./public-home.scss']
})
export class PublicHomeComponent implements OnInit, AfterViewInit {
  private dataService = inject(PublicDataService);
  private adminService = inject(AdminService);
  private predictionService = inject(PredictionService);
  private poiService = inject(PoiService);

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

  //busqueda paralela para el origen de la ruta. si esta vacio se usa la
  //Puerta del Sol como punto de partida por defecto
  origenQuery = '';
  mostrarSugerenciasOrigen = false;
  loadingSuggestionsOrigen = false;
  origenSuggestions: LocationSuggestion[] = [];
  selectedOrigen: LocationSuggestion | null = null;
  private origenSearchTimer: any = null;

  notificationMessage = '';
  notificationType: 'success' | 'error' | 'warning' | '' = '';

  private map!: L.Map;
  private zoneLayer: L.LayerGroup = L.layerGroup();
  private incidentsLayer: L.LayerGroup = L.layerGroup();
  private predictionsLayer: L.LayerGroup = L.layerGroup();
  private poisLayer: L.LayerGroup = L.layerGroup();
  //capa donde pintamos la polyline de la ruta calculada (se vacia en cada calculo)
  private routeLayer: L.LayerGroup = L.layerGroup();
  //circulos translucidos sobre los distritos peligrosos atravesados
  private riskLayer: L.LayerGroup = L.layerGroup();
  private searchTimer: any = null;

  mostrarPredicciones = false;
  prediccionesCargadas: Prediction[] = [];

  //resumen de la ultima ruta calculada (km/duracion) + pasos textuales.
  //null mientras no haya ruta calculada
  resumenRuta: { distance_km: number; duration_min: number } | null = null;
  pasosRuta: RouteStep[] = [];

  mostrarPois = false;
  poisLoading = false;
  //ultima ruta dibujada en puntos [lat, lng]; sirve para mostrar POIs a lo
  //largo del recorrido en vez de solo en el centro del mapa
  private puntosRutaActual: [number, number][] = [];

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
    this.routeLayer.addTo(this.map);
    this.riskLayer.addTo(this.map);
    //la capa de predicciones y la de POIs solo se meten al activar el toggle
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
        //si la capa de POIs esta activa, los recargamos sobre el trayecto
        if (this.mostrarPois) {
          this.cargarPois();
        }
      }
    }
  }

  //pinta un circulo translucido sobre cada distrito de la lista de riesgos:
  //rojo para ALTO, naranja para MEDIO, amarillo claro para BAJO. asi el usuario
  //ve de un vistazo por que zonas conflictivas pasa su ruta.
  private dibujarZonasRiesgo(zonas: Array<{ district: number; level: string; probability: number }>): void {
    this.riskLayer.clearLayers();

    for (const zona of zonas) {
      //BAJO no merece marca visual, asi evitamos saturar el mapa
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

  //activa o desactiva la capa de POIs
  togglePois(): void {
    this.mostrarPois = !this.mostrarPois;

    if (this.mostrarPois) {
      this.poisLayer.addTo(this.map);
      this.cargarPois();
    } else {
      this.map.removeLayer(this.poisLayer);
    }
  }

  //refresca los POIs en la zona que se ve ahora en el mapa
  refrescarPois(): void {
    if (this.mostrarPois) {
      this.cargarPois();
    }
  }

  //pide POIs repartidos a lo largo de la ruta (muestras cada ~700 m) en vez
  //de concentrarlos solo en inicio/medio/final. cuando no hay ruta, pide
  //alrededor del centro del mapa con un radio mas grande.
  private cargarPois(): void {
    this.poisLoading = true;

    const hayRuta = this.puntosRutaActual.length >= 2;
    const centros = this.puntosBusquedaPois();
    //radios y limite por consulta: en la ruta usamos circulos pequeños para
    //que cada muestra cubra solo su tramo y se vean POIs durante todo el
    //recorrido; sin ruta usamos un radio grande sobre el centro del mapa
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

  //devuelve los centros [lat, lng] donde pediremos POIs. si hay ruta saca
  //una muestra cada ~700 m con un tope de 8 puntos; si no, el centro del mapa
  private puntosBusquedaPois(): [number, number][] {
    const ruta = this.puntosRutaActual;
    let puntos: [number, number][];

    if (ruta.length >= 2) {
      puntos = muestrearRuta(ruta, 700, 8);
    } else {
      const centro = this.map.getCenter();
      puntos = [[centro.lat, centro.lng]];
    }

    return puntos;
  }

  //quita POIs duplicados (mismo lat/lng) y agrupa los que esten muy
  //cerca (<80m) para que el mapa no salga lleno de marcadores pegados.
  //usamos un cuadricula muy gruesa (5 decimales = ~1.1m, asi que con
  //3 decimales = ~110m) como clave de bucket.
  private dedupePois(lista: Poi[]): Poi[] {
    const vistos = new Set<string>();
    const unicos: Poi[] = [];

    for (const poi of lista) {
      //3 decimales agrupa POIs en una rejilla de unos ~80m
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

  //input del origen: mismo flujo que el destino pero sobre su propio estado
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

    this.dataService.calculateGuestRoute(this.guestId!, destination, this.selectedOrigen).subscribe({
      next: (routeRes: any) => {
        this.loadingRoute = false;
        this.searchCount = routeRes.search_count ?? this.searchCount + 1;
        this.remainingSearches = routeRes.remaining ?? Math.max(0, this.maxSearches - this.searchCount);
        this.maxSearches = routeRes.max ?? this.maxSearches;

        this.displayLocationOnMap(destination, routeRes.summary);
        //pintamos tambien un marcador A en el origen (si no se eligio uno,
        //por defecto el backend arranca en la Puerta del Sol)
        const origenLat = this.selectedOrigen?.lat ?? 40.4167;
        const origenLon = this.selectedOrigen?.lon ?? -3.7033;
        const origenLabel = this.selectedOrigen?.text ?? 'Puerta del Sol';
        this.dibujarMarcadorOrigen(origenLat, origenLon, origenLabel);
        this.dibujarRuta(routeRes.geometry);
        this.dibujarZonasRiesgo(routeRes.risk_zones ?? []);

        //guardamos resumen + indicaciones para el panel de info de la ruta
        this.resumenRuta = routeRes.summary ?? null;
        this.pasosRuta = routeRes.steps ?? [];

        //si la ruta atraviesa distritos con prediccion ALTO/MEDIO avisamos al usuario
        const peligros = (routeRes.risk_zones ?? []) as Array<{district: number, level: string, probability: number}>;
        const altos = peligros.filter((z) => z.level === 'ALTO');
        const medios = peligros.filter((z) => z.level === 'MEDIO');
        let aviso = 'Ruta calculada correctamente.';
        if (altos.length > 0) {
          aviso = `Ruta calculada. Atención: ${altos.length} zona(s) con riesgo ALTO en el camino.`;
        } else if (medios.length > 0) {
          aviso = `Ruta calculada. ${medios.length} zona(s) con riesgo MEDIO en el camino.`;
        }
        const tipoAviso = altos.length > 0 ? 'warning' : 'success';
        this.showNotification(aviso, tipoAviso);
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

  //pinta el marcador A en el punto de salida de la ruta
  private dibujarMarcadorOrigen(lat: number, lon: number, label: string): void {
    L.marker([lat, lon], { icon: iconoOrigen() })
      .addTo(this.zoneLayer)
      .bindPopup(`<b>Origen</b><br>${label}`);
  }

  //formato legible del tiempo total y de la distancia de cada paso. los
  //llamamos desde el template, no son funciones puras de utilidad solo
  //porque Angular necesita que el metodo este en el componente
  duracionLegible(min: number | null | undefined): string {
    return formatearDuracion(min);
  }

  metrosLegibles(m: number | null | undefined): string {
    return formatearMetros(m);
  }

  //cierra el panel flotante de resumen + indicaciones de la ruta
  cerrarPanelRuta(): void {
    this.resumenRuta = null;
    this.pasosRuta = [];
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
