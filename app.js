const DOM_ELEMENTS = {
    imageContainer: document.getElementById('image-container'),
    hotspotWrapper: document.getElementById('hotspot-wrapper'),
    mainModal: document.getElementById('main-modal'),
    modalContent: document.getElementById('modal-content'),
    adminBtn: document.getElementById('admin-btn'),
    reportBtn: document.getElementById('report-btn'),
    licitacionBtn: document.getElementById('licitacion-btn'), // NUEVO
    projectImage: document.getElementById('project-image'),
    yearFilterStart: document.getElementById('year-filter-start'),
    yearFilterEnd: document.getElementById('year-filter-end'),
    receptionFilterSi: document.getElementById('filter-recepcionado-si'),
    receptionFilterNo: document.getElementById('filter-recepcionado-no'),
    showButtonsBtn: document.getElementById('show-buttons-btn'),
    hiddenButtonsContainer: document.getElementById('hidden-buttons-container'),
    estudioSueloFilterContainer: document.getElementById('estudio-suelo-filter'),
    estudioSueloFilterSi: document.getElementById('filter-suelo-si'),
    estudioSueloFilterNo: document.getElementById('filter-suelo-no')
};

const CONSTANTS = {
    STORAGE_KEY: 'project_hotspots_v4',
    TIPO_PROYECTO_OPTIONS: ['Proyecto', 'Obra', 'Recepcionado'],
    ESTADO_OPTIONS: ['Proyecto', 'Bases', 'Licitación', 'Licitación sin Adjudicar', 'Adjudicación - Contrato', 'Construcción', 'Recepción Provisoria', 'Recepción Definitiva', 'Revisión Externa', 'Paralizada'],
    COLOR_MAP: {
        'Proyecto': 'modal-header-proyecto',
        'Obra': 'modal-header-obra',
        'Recepcionado': 'modal-header-recepcionado'
    },
    ESTADO_SORT_ORDER: [
        'Proyecto', 'Bases', 'Revisión Externa', 'Licitación', 'Licitación sin Adjudicar', 'Adjudicación - Contrato',
        'Construcción', 'Recepción Provisoria', 'Recepción Definitiva', 'Paralizada'
    ],
    // MODIFICADO: Mapeo de estados a letras (excluyendo 'P' de Proyecto)
    STATE_LETTER_MAP: {
        'Revisión Externa': 'E',
        'Bases': 'B',
        'Licitación': 'L',
        'Licitación sin Adjudicar': 'Lx',
        'Adjudicación - Contrato': 'AC', // MODIFICACIÓN: 'A' reemplazado por 'AC'
    },
    // INICIO MODIFICACIÓN: Opciones de menú desplegable para ITO y Ejecutiva
    ITO_OPTIONS: ['Karin Escalona', 'Héctor Jofré', 'Miguel Llanos', 'Juan Carlos Maluenda'],
    EJECUTIVA_OPTIONS: ['Graciela Quiroz', 'Claudia Ortiz'],
    // FIN MODIFICACIÓN
};

let hotspots = [];
let isEditingMode = false;
let showAllHotspots = false;

function saveHotspots() {
    try {
        localStorage.setItem(CONSTANTS.STORAGE_KEY, JSON.stringify(hotspots));
    } catch (error) {
        console.error("Error al guardar en localStorage:", error);
    }
}

function loadHotspots() {
    try {
        const storedHotspots = localStorage.getItem(CONSTANTS.STORAGE_KEY);
        if (storedHotspots) {
            hotspots = JSON.parse(storedHotspots);
            // AGREGADO: Inicializa fechaAdjudicacionContrato para datos antiguos
            hotspots = hotspots.map(h => ({ 
                ...h, 
                estudioSuelo: h.estudioSuelo || 'No',
                fechaAdjudicacionContrato: h.fechaAdjudicacionContrato || '' 
            }));
            renderHotspots();
        }
    } catch (error) {
        console.error("Error al cargar desde localStorage:", error);
    }
}

function formatDate(dateString) {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}-${month}-${year}`;
}

function calculateDaysBetweenDates(date1, date2) {
    if (!date1 || !date2) return '';
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

function getFilteredHotspots() {
    let filtered = hotspots;

    if (!showAllHotspots) {
        filtered = filtered.filter(h => h.tipoProyecto !== 'Proyecto');
    }

    const showSiRecepcion = DOM_ELEMENTS.receptionFilterSi.checked;
    const showNoRecepcion = DOM_ELEMENTS.receptionFilterNo.checked;
    
    const showSiSuelo = DOM_ELEMENTS.estudioSueloFilterSi.checked;
    const showNoSuelo = DOM_ELEMENTS.estudioSueloFilterNo.checked;
    
    const startYearValue = DOM_ELEMENTS.yearFilterStart.value.trim();
    const endYearValue = DOM_ELEMENTS.yearFilterEnd.value.trim();

    const startYear = startYearValue ? parseInt(startYearValue) : null;
    let endYear = endYearValue ? parseInt(endYearValue) : null;
    
    if (startYear !== null && endYear === null) {
        endYear = startYear;
    } else if (startYear === null && endYear !== null) {
    }
    
    if (startYear !== null && endYear !== null && startYear > endYear) {
        [startYear, endYear] = [endYear, startYear];
    }

    if (showSiRecepcion !== showNoRecepcion) {
        if (showSiRecepcion) {
            filtered = filtered.filter(h => h.recepcionado === 'Sí');
        } else {
            filtered = filtered.filter(h => h.recepcionado !== 'Sí');
        }
    }

    if (startYear !== null || endYear !== null) {
        filtered = filtered.filter(h => {
            if (!h.anioInicio) return false;
            const projectYear = parseInt(h.anioInicio);

            const isAfterStart = startYear === null || projectYear >= startYear;
            const isBeforeEnd = endYear === null || projectYear <= endYear;
            
            return isAfterStart && isBeforeEnd;
        });
    }

    if (showSiSuelo !== showNoSuelo) {
        if (showSiSuelo) {
            filtered = filtered.filter(h => h.estudioSuelo === 'Sí');
        } else {
            filtered = filtered.filter(h => h.estudioSuelo !== 'Sí');
        }
    }

    return filtered;
}

function renderHotspots() {
    DOM_ELEMENTS.hotspotWrapper.innerHTML = '';
    const filteredHotspots = getFilteredHotspots();

    filteredHotspots.forEach(hotspot => {
        const hotspotEl = document.createElement('div');
        hotspotEl.className = 'hotspot';

        const tipoClase = hotspot.tipoProyecto === 'Proyecto' ? 'hotspot-proyecto' :
            hotspot.tipoProyecto === 'Obra' ? 'hotspot-obra' :
            hotspot.tipoProyecto === 'Recepcionado' ? 'hotspot-recepcionado' :
            'hotspot-proyecto';

        hotspotEl.classList.add(tipoClase);
        hotspotEl.style.left = `${hotspot.x * 100}%`;
        hotspotEl.style.top = `${hotspot.y * 100}%`;
        hotspotEl.dataset.id = hotspot.id;

        // MODIFICADO: Mostrar letra de estado para hotspots 'Proyecto' (excluye 'P')
        if (hotspot.tipoProyecto === 'Proyecto') {
            const estadoLetter = CONSTANTS.STATE_LETTER_MAP[hotspot.estado] || '';
            if (estadoLetter) { 
                const letterEl = document.createElement('div');
                letterEl.className = 'hotspot-state-letter';
                letterEl.textContent = estadoLetter;
                hotspotEl.appendChild(letterEl);
            }
        }
        // FIN MODIFICACIÓN

        const tooltipEl = document.createElement('div');
        tooltipEl.className = 'hotspot-tooltip';
        
        let tooltipContent = '';
        if (hotspot.imagenProyectoUrl && (hotspot.tipoProyecto === 'Obra' || hotspot.tipoProyecto === 'Recepcionado')) {
            // AJUSTE REQUERIDO: Anteponer la carpeta 'Imagenes/' al nombre del archivo
            const imageUrl = `Imagenes/${hotspot.imagenProyectoUrl}`;
            tooltipContent += `<img src="${imageUrl}" alt="Imagen del proyecto" class="project-tooltip-image">`;
        }

        tooltipContent += `<h3 class="font-semibold text-center">${hotspot.nombreProyecto || ''}</h3>`;
        
        if (hotspot.tipoProyecto === 'Obra' || hotspot.tipoProyecto === 'Recepcionado') {
            tooltipContent += `
                <div class="project-info mt-2 text-xs">
                    
                    <div class="flex justify-between">
                        <span>Superficie:</span>
                        <span class="font-normal">${hotspot.superficie || 'N/A'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Monto:</span>
                        <span class="font-normal">${hotspot.monto || 'N/A'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Inicio:</span>
                        <span class="font-normal">${formatDate(hotspot.fechaEntregaTerreno) || 'N/A'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Término:</span>
                        <span class="font-normal">${formatDate(hotspot.fechaTerminoObra) || 'N/A'}</span>
                    </div>
                </div>
            `;
        }
        
        tooltipEl.innerHTML = tooltipContent;
        hotspotEl.appendChild(tooltipEl);

        hotspotEl.addEventListener('click', (event) => {
            event.stopPropagation();
            if (showAllHotspots) {
                if (isEditingMode) {
                    showEditHotspotModal(hotspot);
                } else {
                    showViewHotspotModal(hotspot);
                }
            }
        });

        DOM_ELEMENTS.hotspotWrapper.appendChild(hotspotEl);
    });
}

function showModal(contentHtml, isEditMode = false, isPasswordModal = false) {
    DOM_ELEMENTS.mainModal.classList.toggle('modal', !isEditMode && !isPasswordModal);
    DOM_ELEMENTS.mainModal.classList.toggle('bg-white', isEditMode);
    DOM_ELEMENTS.modalContent.innerHTML = contentHtml;

    DOM_ELEMENTS.modalContent.classList.remove('max-w-md', 'max-w-sm', 'max-w-6xl', 'max-w-screen-2xl');
    if (isPasswordModal) {
        DOM_ELEMENTS.modalContent.classList.add('max-w-sm');
    } else if (document.getElementById('report-content-to-save')) {
        DOM_ELEMENTS.modalContent.classList.add('max-w-screen-2xl');
    } else if (document.getElementById('licitacion-table-content')) { // NUEVO: Ajuste para modal de licitaciones
        DOM_ELEMENTS.modalContent.classList.add('max-w-3xl');
    } else {
        DOM_ELEMENTS.modalContent.classList.add('max-w-6xl');
    }

    DOM_ELEMENTS.mainModal.classList.remove('hidden');
}


function hideModal() {
    DOM_ELEMENTS.mainModal.classList.add('hidden');
}

function showPasswordModal() {
    const html = `
        <div class="bg-white p-6 rounded-xl">
            <h2 class="text-xl font-bold mb-4 text-center">Acceso de Administrador</h2>
            <p class="text-center text-gray-600 mb-6">Iniciar sesión con servicio externo.</p>
            <div class="flex justify-center space-x-4">
                <button type="button" id="simulate-login-btn" class="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center space-x-2">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"></path></svg>
                    <span>Acceder con OAuth</span>
                </button>
                <button type="button" id="cancel-password-btn" class="bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300">Cancelar</button>
            </div>
        </div>
    `;
    showModal(html, false, true);
    
    document.getElementById('simulate-login-btn').addEventListener('click', handlePasswordFormSubmit); 
    document.getElementById('cancel-password-btn').addEventListener('click', hideModal);
}

function handleAuthenticationSuccess() {
    isEditingMode = true;
    DOM_ELEMENTS.adminBtn.textContent = 'Modo de edición';
    DOM_ELEMENTS.adminBtn.classList.remove('bg-gray-200');
    DOM_ELEMENTS.adminBtn.classList.add('bg-red-500', 'text-white');
    hideModal();
}

function handlePasswordFormSubmit(event) {
    event.preventDefault();
    handleAuthenticationSuccess();
}

function showViewHotspotModal(hotspot) {
    // MODIFICADO: Cálculo de duración de fases
    const proyectoDays = calculateDaysBetweenDates(hotspot.fechaInicioProyecto, hotspot.fechaEnvioBases);
    const basesDays = calculateDaysBetweenDates(hotspot.fechaEnvioBases, hotspot.fechaLicitacion);
    // NUEVO: Licitación ahora termina en fechaAdjudicacionContrato
    const licitacionDays = calculateDaysBetweenDates(hotspot.fechaLicitacion, hotspot.fechaAdjudicacionContrato); 
    // NUEVO: Adjudicación-Contrato termina en Entrega Terreno
    const adjudicacionContratoDays = calculateDaysBetweenDates(hotspot.fechaAdjudicacionContrato, hotspot.fechaEntregaTerreno); 
    const construccionDays = calculateDaysBetweenDates(hotspot.fechaEntregaTerreno, hotspot.fechaTerminoObra);
    
    const revisionExternaDays = hotspot.revisionExterna === 'Sí'
        ? calculateDaysBetweenDates(hotspot.fechaRevisionExterna, hotspot.fechaEnvioBases)
        : '';

    const modalColorClass = CONSTANTS.COLOR_MAP[hotspot.tipoProyecto] || 'bg-gray-300';

    // MODIFICADO: Agregar fila para Adjudicación-Contrato
    const fechaTablaHtml = `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">Inicio Proyecto</td>
            <td class="px-6 py-4 whitespace-nowrap">${formatDate(hotspot.fechaInicioProyecto)}</td>
            <td class="px-6 py-4 whitespace-nowrap">${proyectoDays} (Proyecto)</td>
        </tr>
        ${hotspot.revisionExterna === 'Sí' ? `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">Revisión Externa</td>
            <td class="px-6 py-4 whitespace-nowrap">${formatDate(hotspot.fechaRevisionExterna)}</td>
            <td class="px-6 py-4 whitespace-nowrap">${revisionExternaDays} (Revisión Externa)</td>
        </tr>
        ` : ''}
        <tr class="hover:bg-white">
            <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">Envío a Bases</td>
            <td class="px-6 py-4 whitespace-nowrap">${formatDate(hotspot.fechaEnvioBases)}</td>
            <td class="px-6 py-4 whitespace-nowrap">${basesDays} (Bases)</td>
        </tr>
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">Licitación</td>
            <td class="px-6 py-4 whitespace-nowrap">${formatDate(hotspot.fechaLicitacion)}</td>
            <td class="px-6 py-4 whitespace-nowrap">${licitacionDays} (Licitación)</td>
        </tr>
        <tr class="hover:bg-white">
            <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">Adjudicación-Contrato</td>
            <td class="px-6 py-4 whitespace-nowrap">${formatDate(hotspot.fechaAdjudicacionContrato)}</td>
            <td class="px-6 py-4 whitespace-nowrap">${adjudicacionContratoDays} (Adjudicación-Contrato)</td>
        </tr>
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">Entrega Terreno</td>
            <td class="px-6 py-4 whitespace-nowrap">${formatDate(hotspot.fechaEntregaTerreno)}</td>
            <td class="px-6 py-4 whitespace-nowrap">${construccionDays} (Construcción)</td>
        </tr>
        <tr class="hover:bg-white">
            <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">Término de Obra</td>
            <td class="px-6 py-4 whitespace-nowrap">${formatDate(hotspot.fechaTerminoObra)}</td>
            <td class="px-6 py-4 whitespace-nowrap"></td>
        </tr>
    `;

    const html = `
        <div class="rounded-t-xl py-3 px-6 text-white ${modalColorClass}">
            <h2 class="text-2xl font-bold text-center">${hotspot.nombreProyecto || ''}</h2>
        </div>
        <div class="p-6 bg-white rounded-b-xl">
            <div class="space-y-6">
                <div class="p-6 bg-gray-50 rounded-lg">
                    <div class="data-grid-container text-sm">
                        <div class="data-grid-item">
                            <strong class="block text-gray-900">Año Inicio:</strong>
                            <span class="block">${hotspot.anioInicio || ''}</span>
                        </div>
                        <div class="data-grid-item">
                            <strong class="block text-gray-900">Superficie:</strong>
                            <span class="block">${hotspot.superficie || ''}</span>
                        </div>
                        <div class="data-grid-item">
                            <strong class="block text-gray-900">Monto:</strong>
                            <span class="block">${hotspot.monto || ''}</span>
                        </div>
                        <div class="data-grid-item">
                            <strong class="block text-gray-900">Centro de Costo:</strong>
                            <span class="block">${hotspot.centroCosto || ''}</span>
                        </div>
                        <div class="data-grid-item">
                            <strong class="block text-gray-900">Estado:</strong>
                            <span class="block">${hotspot.estado || ''}</span>
                        </div>
                         <div class="data-grid-item">
                            <strong class="block text-gray-900">Ejecutiva:</strong>
                            <span class="block">${hotspot.ejecutiva || ''}</span>
                        </div>
                        <div class="data-grid-item">
                            <strong class="block text-gray-900">ID Licitación:</strong>
                            <span class="block">${hotspot.idLicitacion || ''}</span>
                        </div>
                        <div class="data-grid-item">
                            <strong class="block text-gray-900">Financiamiento:</strong>
                            <span class="block">${hotspot.financiamiento || ''}</span>
                        </div>
                        <div class="data-grid-item">
                            <strong class="block text-gray-900">Ord. Req. Bases:</strong>
                            <span class="block">${hotspot.ordReqBases || ''}</span>
                        </div>
                        <div class="data-grid-item">
                            <strong class="block text-gray-900">Permiso Edificación:</strong>
                            <span class="block">${hotspot.permisoEdificacion || ''}</span>
                        </div>
                        <div class="data-grid-item">
                            <strong class="block text-gray-900">ITO:</strong>
                            <span class="block">${hotspot.ito || ''}</span>
                        </div>
                        <div class="data-grid-item">
                            <strong class="block text-gray-900">Documentos:</strong>
                            <span class="block">
                                ${hotspot.carpetaArchivos ? `<a href="${hotspot.carpetaArchivos}" target="_blank" class="text-blue-600 hover:underline">Ver Documentos</a>` : ''}
                            </span>
                        </div>
                        <div class="col-span-3 data-grid-item border-right-0">
                            <strong class="block text-gray-900">Observaciones:</strong>
                            <span class="block">${hotspot.observaciones || ''}</span>
                        </div>
                    </div>
                </div>

                <div class="p-6 bg-white rounded-lg shadow-sm">
                    <h3 class="font-bold text-lg mb-4 text-gray-700">Eventos y Duración</h3>
                    <div class="overflow-x-auto">
                        <table class="min-w-full text-xs text-left text-gray-500">
                            <thead class="text-xs text-white uppercase bg-gray-700">
                                <tr>
                                    <th class="px-6 py-3 text-left font-medium">Evento</th>
                                    <th class="px-6 py-3 text-left font-medium">Fecha</th>
                                    <th class="px-6 py-3 text-left font-medium">Duración (Días)</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${fechaTablaHtml}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="p-6 bg-white rounded-lg shadow-sm">
                    <h3 class="font-bold text-lg mb-4 text-gray-700">Duración por Etapa</h3>
                    <canvas id="durationChart" height="60"></canvas>
                </div>
            </div>

            <div class="flex justify-end mt-6">
                <button id="close-view-modal-btn" class="bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300">Cerrar</button>
            </div>
        </div>
    `;

    showModal(html);

    document.getElementById('close-view-modal-btn').addEventListener('click', hideModal);

    setTimeout(() => {
        // MODIFICADO: Agregar Adjudicación-Contrato a los datos del gráfico
        const timelineData = [
            { label: 'Proyecto', days: proyectoDays, color: '#ef4444' },
            { label: 'Bases', days: basesDays, color: '#f59e0b' },
            { label: 'Licitación', days: licitacionDays, color: '#10b981' },
            { label: 'Adjudicación-Contrato', days: adjudicacionContratoDays, color: '#facc15' }, // NUEVO color amarillo
            { label: 'Construcción', days: construccionDays, color: '#3b82f6' }
        ];

        if (hotspot.revisionExterna === 'Sí') {
            timelineData.splice(1, 0, { label: 'Revisión Externa', days: revisionExternaDays, color: '#a855f7' });
        }

        const labels = timelineData.map(item => item.label);
        const data = timelineData.map(item => (typeof item.days === 'number' ? item.days : 0));
        const backgroundColors = timelineData.map(item => item.color);
        const borderColors = backgroundColors.map(color => color.replace('0.6)', '1)'));

        const ctx = document.getElementById('durationChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Línea de tiempo del proyecto'],
                datasets: labels.map((label, index) => ({
                    label: label,
                    data: [data[index]],
                    backgroundColor: backgroundColors[index],
                    borderColor: borderColors[index],
                    borderWidth: 1,
                    barThickness: 40,
                    stack: 'timeline'
                }))
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                    },
                    title: {
                        display: false,
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Días'
                        },
                        grid: {
                            display: false
                        },
                        ticks: {
                            callback: function(value) {
                                return value;
                            }
                        }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        grid: {
                            display: false
                        },
                        ticks: {
                            display: false
                        }
                    }
                }
            }
        });
    }, 0);
}

// INICIO MODIFICACIÓN: Función showEditHotspotModal actualizada
function showEditHotspotModal(hotspot = null, coords = null) {
    const isEditing = !!hotspot;
    const hotspotData = isEditing ? hotspot : {
        id: Date.now(),
        x: coords.x,
        y: coords.y,
        nombreProyecto: '',
        anioInicio: new Date().getFullYear(),
        tipoProyecto: 'Proyecto',
        recepcionado: 'No',
        ejecutiva: CONSTANTS.EJECUTIVA_OPTIONS[0], // VALOR PREDETERMINADO
        superficie: '',
        monto: '',
        centroCosto: '',
        estado: 'Proyecto',
        idLicitacion: '',
        financiamiento: '',
        ordReqBases: '',
        ito: CONSTANTS.ITO_OPTIONS[0], // VALOR PREDETERMINADO
        revisionExterna: 'No',
        estudioSuelo: 'No',
        fechaInicioProyecto: '',
        fechaEnvioBases: '',
        fechaRevisionExterna: '',
        fechaLicitacion: '',
        fechaAdjudicacionContrato: '',
        fechaEntregaTerreno: '',
        fechaTerminoObra: '',
        carpetaArchivos: '',
        observaciones: '',
        imagenProyectoUrl: '',
    };

    const formFields = [
        { id: 'nombreProyecto', label: 'Nombre', type: 'text' },
        { id: 'anioInicio', label: 'Año Inicio', type: 'number' },
        { id: 'tipoProyecto', label: 'Tipo', type: 'select', options: CONSTANTS.TIPO_PROYECTO_OPTIONS },
        { id: 'recepcionado', label: 'Recepcionado', type: 'select', options: ['No', 'Sí'] },
        // MODIFICACIÓN: Campo Ejecutiva ahora es select
        { id: 'ejecutiva', label: 'Ejecutiva', type: 'select', options: CONSTANTS.EJECUTIVA_OPTIONS },
        { id: 'centroCosto', label: 'Centro de Costo', type: 'text' },
        { id: 'estado', label: 'Estado', type: 'select', options: CONSTANTS.ESTADO_OPTIONS },
        { id: 'idLicitacion', label: 'ID Licitación', type: 'text' },
        { id: 'monto', label: 'Monto', type: 'text' },
        { id: 'ordReqBases', label: 'Ord. Req. Bases', type: 'text' },
        // MODIFICACIÓN: Campo ITO ahora es select
        { id: 'ito', label: 'ITO', type: 'select', options: CONSTANTS.ITO_OPTIONS },
        { id: 'carpetaArchivos', label: 'Documentos (URL)', type: 'text' },
        { id: 'financiamiento', label: 'Financiamiento', type: 'text' },
        { id: 'superficie', label: 'Superficie', type: 'text' },
        { id: 'permisoEdificacion', label: 'Permiso Edificación', type: 'text' },
        { id: 'imagenProyectoUrl', label: 'Imagen Proyecto', type: 'text' },
        { id: 'estudioSuelo', label: 'Estudio Suelo', type: 'select', options: ['No', 'Sí'] },
    ];

    const formHtml = formFields.map(field => {
        if (field.type === 'select') {
            const optionsHtml = field.options.map(option => `<option value="${option}" ${hotspotData[field.id] === option ? 'selected' : ''}>${option}</option>`).join('');
            return `
                <div>
                    <label for="${field.id}" class="block text-sm font-medium text-gray-700">${field.label}</label>
                    <select id="${field.id}" class="w-full p-2 border border-gray-300 rounded-md">${optionsHtml}</select>
                </div>
            `;
        }
        return `
            <div>
                <label for="${field.id}" class="block text-sm font-medium text-gray-700">${field.label}</label>
                <input type="${field.type}" id="${field.id}" value="${hotspotData[field.id] || ''}" class="w-full p-2 border border-gray-300 rounded-md">
            </div>
        `;
    }).join('');

    // MODIFICADO: Agregar el campo de fecha para Adjudicación-Contrato
    const html = `
        <div class="bg-white p-6 rounded-xl">
            <h2 class="text-xl font-bold mb-4">${isEditing ? 'Editar Hotspot' : 'Agregar Hotspot'}</h2>
            <form id="hotspot-form" class="space-y-6">
                <input type="hidden" id="hotspot-x" value="${hotspotData.x || ''}">
                <input type="hidden" id="hotspot-y" value="${hotspotData.y || ''}">
                <input type="hidden" id="hotspot-id" value="${hotspotData.id || ''}">
                
                <div>
                    <h3 class="text-lg font-semibold text-gray-700 mb-2">Información</h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        ${formHtml}
                        <div class="sm:col-span-2">
                            <label for="observaciones" class="block text-sm font-medium text-gray-700">Observaciones</label>
                            <textarea id="observaciones" rows="3" class="w-full p-2 border border-gray-300 rounded-md">${hotspotData.observaciones || ''}</textarea>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 class="text-lg font-semibold text-gray-700 mb-2">Fechas</h3>
                    <table class="w-full text-sm text-left text-gray-500">
                        <thead>
                            <tr class="bg-gray-50">
                                <th class="py-2 px-4">Evento</th>
                                <th class="py-2 px-4">Fecha</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="bg-white border-b">
                                <td class="py-2 px-4 font-medium text-gray-900">Fecha inicio Proyecto</td>
                                <td class="py-2 px-4"><input type="date" id="fechaInicioProyecto" value="${hotspotData.fechaInicioProyecto || ''}" class="w-full p-1 border border-gray-300 rounded-md"></td>
                            </tr>
                            <tr class="bg-gray-50 border-b">
                                <td class="py-2 px-4 font-medium text-gray-900">Revisión Externa</td>
                                <td class="py-2 px-4">
                                    <select id="revisionExterna" class="w-full p-1 border border-gray-300 rounded-md">
                                        <option value="No" ${hotspotData.revisionExterna === 'No' ? 'selected' : ''}>No</option>
                                        <option value="Sí" ${hotspotData.revisionExterna === 'Sí' ? 'selected' : ''}>Sí</option>
                                    </select>
                                </td>
                            </tr>
                            <tr id="fechaRevisionExternaRow" class="bg-white border-b ${hotspotData.revisionExterna === 'Sí' ? '' : 'hidden'}">
                                <td class="py-2 px-4 font-medium text-gray-900">Fecha Revisión Externa</td>
                                <td class="py-2 px-4"><input type="date" id="fechaRevisionExterna" value="${hotspotData.fechaRevisionExterna || ''}" class="w-full p-1 border border-gray-300 rounded-md"></td>
                            </tr>
                            <tr class="bg-gray-50 border-b">
                                <td class="py-2 px-4 font-medium text-gray-900">Fecha envío a Bases</td>
                                <td class="py-2 px-4"><input type="date" id="fechaEnvioBases" value="${hotspotData.fechaEnvioBases || ''}" class="w-full p-1 border border-gray-300 rounded-md"></td>
                            </tr>
                            <tr class="bg-white border-b">
                                <td class="py-2 px-4 font-medium text-gray-900">Fecha Licitación</td>
                                <td class="py-2 px-4"><input type="date" id="fechaLicitacion" value="${hotspotData.fechaLicitacion || ''}" class="w-full p-1 border border-gray-300 rounded-md"></td>
                            </tr>
                            <tr class="bg-gray-50 border-b">
                                <td class="py-2 px-4 font-medium text-gray-900">Fecha Adjudicación-Contrato</td>
                                <td class="py-2 px-4"><input type="date" id="fechaAdjudicacionContrato" value="${hotspotData.fechaAdjudicacionContrato || ''}" class="w-full p-1 border border-gray-300 rounded-md"></td>
                            </tr>
                            <tr class="bg-white border-b">
                                <td class="py-2 px-4 font-medium text-gray-900">Entrega Terreno</td>
                                <td class="py-2 px-4"><input type="date" id="fechaEntregaTerreno" value="${hotspotData.fechaEntregaTerreno || ''}" class="w-full p-1 border border-gray-300 rounded-md"></td>
                            </tr>
                            <tr class="bg-gray-50">
                                <td class="py-2 px-4 font-medium text-gray-900">Término de Obra</td>
                                <td class="py-2 px-4"><input type="date" id="fechaTerminoObra" value="${hotspotData.fechaTerminoObra || ''}" class="w-full p-1 border border-gray-300 rounded-md"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="flex justify-end space-x-2 pt-4">
                    <button type="button" id="cancel-form-btn" class="bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300">Cancelar</button>
                    ${isEditing ? `<button type="button" id="delete-btn" class="bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600">Eliminar</button>` : ''}
                    <button type="submit" class="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700">Guardar</button>
                </div>
            </form>
        </div>
    `;
    showModal(html, true);

    const revisionExternaSelect = document.getElementById('revisionExterna');
    const fechaRevisionExternaRow = document.getElementById('fechaRevisionExternaRow');

    revisionExternaSelect.addEventListener('change', (event) => {
        if (event.target.value === 'Sí') {
            fechaRevisionExternaRow.classList.remove('hidden');
        } else {
            fechaRevisionExternaRow.classList.add('hidden');
        }
    });

    document.getElementById('hotspot-form').addEventListener('submit', (event) => {
        event.preventDefault();

        // AGREGADO: Obtener el valor del nuevo campo de fecha
        const formData = {
            nombreProyecto: document.getElementById('nombreProyecto').value,
            anioInicio: document.getElementById('anioInicio').value,
            tipoProyecto: document.getElementById('tipoProyecto').value,
            recepcionado: document.getElementById('recepcionado').value,
            ejecutiva: document.getElementById('ejecutiva').value,
            centroCosto: document.getElementById('centroCosto').value,
            estado: document.getElementById('estado').value,
            idLicitacion: document.getElementById('idLicitacion').value,
            monto: document.getElementById('monto').value,
            ordReqBases: document.getElementById('ordReqBases').value,
            ito: document.getElementById('ito').value,
            carpetaArchivos: document.getElementById('carpetaArchivos').value,
            financiamiento: document.getElementById('financiamiento').value,
            superficie: document.getElementById('superficie').value,
            permisoEdificacion: document.getElementById('permisoEdificacion').value,
            observaciones: document.getElementById('observaciones').value,
            fechaInicioProyecto: document.getElementById('fechaInicioProyecto').value,
            fechaEnvioBases: document.getElementById('fechaEnvioBases').value,
            fechaLicitacion: document.getElementById('fechaLicitacion').value,
            fechaAdjudicacionContrato: document.getElementById('fechaAdjudicacionContrato').value, // NUEVO
            fechaEntregaTerreno: document.getElementById('fechaEntregaTerreno').value,
            fechaTerminoObra: document.getElementById('fechaTerminoObra').value,
            revisionExterna: document.getElementById('revisionExterna').value,
            fechaRevisionExterna: document.getElementById('fechaRevisionExterna').value,
            imagenProyectoUrl: document.getElementById('imagenProyectoUrl').value,
            estudioSuelo: document.getElementById('estudioSuelo').value,
        };

        if (isEditing) {
            const index = hotspots.findIndex(h => h.id === hotspotData.id);
            if (index !== -1) {
                hotspots[index] = { ...hotspotData, ...formData };
            }
        } else {
            const newHotspot = {
                id: Date.now(),
                x: document.getElementById('hotspot-x').value,
                y: document.getElementById('hotspot-y').value,
                ...formData
            };
            hotspots.push(newHotspot);
        }

        saveHotspots();
        renderHotspots();
        hideModal();
    });
    // FIN MODIFICACIÓN: Función showEditHotspotModal actualizada

    document.getElementById('cancel-form-btn').addEventListener('click', hideModal);

    if (isEditing) {
        document.getElementById('delete-btn').addEventListener('click', () => {
            if (confirm('¿Estás seguro de que quieres eliminar este hotspot?')) {
                hotspots = hotspots.filter(h => h.id !== hotspotData.id);
                saveHotspots();
                renderHotspots();
                hideModal();
            }
        });
    }
}


// INICIO MODIFICACIÓN: Nueva función para el reporte de licitaciones
function showLicitacionReportModal() {
    const licitacionStates = ['Licitación', 'Licitación sin Adjudicar', 'Adjudicación - Contrato'];
    
    // Filtrar proyectos en estado de licitación o subestados relacionados
    const licitacionHotspots = hotspots.filter(h => licitacionStates.includes(h.estado));
    
    // Ordenar por fecha de licitación (más antigua primero)
    licitacionHotspots.sort((a, b) => {
        if (!a.fechaLicitacion) return 1;
        if (!b.fechaLicitacion) return -1;
        return new Date(a.fechaLicitacion) - new Date(b.fechaLicitacion);
    });

    let tableRows = '';
    
    if (licitacionHotspots.length === 0) {
        tableRows = `
            <tr>
                <td colspan="5" class="px-6 py-4 text-center text-gray-500">No hay proyectos actualmente en fase de Licitación o Adjudicación.</td>
            </tr>
        `;
    } else {
        tableRows = licitacionHotspots.map(h => {
            const daysToAdjudication = calculateDaysBetweenDates(new Date().toISOString().split('T')[0], h.fechaAdjudicacionContrato);
            const daysText = h.fechaAdjudicacionContrato 
                ? (daysToAdjudication >= 0 ? `(${daysToAdjudication} días restantes)` : `(Finalizado hace ${Math.abs(daysToAdjudication)} días)`)
                : 'N/A';
                
            const daysClass = h.fechaAdjudicacionContrato ? (daysToAdjudication > 30 ? 'text-green-600' : daysToAdjudication > 0 ? 'text-yellow-600' : 'text-red-600') : 'text-gray-500';

            return `
                <tr class="bg-white border-b hover:bg-gray-50">
                    <td class="px-6 py-4 font-medium text-gray-900">${h.nombreProyecto || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${h.estado || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${formatDate(h.fechaLicitacion) || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${formatDate(h.fechaAdjudicacionContrato) || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap ${daysClass}">${daysText}</td>
                </tr>
            `;
        }).join('');
    }

    const html = `
        <div class="rounded-xl shadow-2xl bg-white">
            <div class="rounded-t-xl py-3 px-6 text-white bg-yellow-500">
                <h2 class="text-2xl font-bold text-center">Proyectos en Licitación/Adjudicación</h2>
            </div>
            <div class="p-6 bg-white rounded-b-xl">
                <div id="licitacion-table-content" class="overflow-x-auto max-h-[70vh]">
                    <table class="min-w-full divide-y divide-gray-200 text-sm text-left text-gray-500">
                        <thead class="bg-gray-700 text-white sticky top-0">
                            <tr>
                                <th scope="col" class="px-6 py-3 text-left font-medium uppercase tracking-wider">Proyecto</th>
                                <th scope="col" class="px-6 py-3 text-left font-medium uppercase tracking-wider">Estado</th>
                                <th scope="col" class="px-6 py-3 text-left font-medium uppercase tracking-wider">Fecha Licitación</th>
                                <th scope="col" class="px-6 py-3 text-left font-medium uppercase tracking-wider">Fecha Adjudicación-Contrato</th>
                                <th scope="col" class="px-6 py-3 text-left font-medium uppercase tracking-wider">Días restantes/pasados</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${tableRows}
                        </tbody>
                    </table>
                </div>
                <div class="flex justify-end mt-6">
                    <button id="close-licitacion-modal-btn" class="bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300">Cerrar</button>
                </div>
            </div>
        </div>
    `;

    showModal(html, false);
    document.getElementById('close-licitacion-modal-btn').addEventListener('click', hideModal);
}
// FIN MODIFICACIÓN: Nueva función para el reporte de licitaciones


function showReportModal() {
    const visibleHotspots = getFilteredHotspots();
    const hasHotspots = visibleHotspots.length > 0;

    if (!hasHotspots) {
        const html = `
            <div class="rounded-xl shadow-2xl bg-white p-6">
                <p class="text-center text-gray-500 py-8">No hay hotspots visibles para generar el reporte.</p>
                <div class="flex justify-end mt-6">
                    <button id="close-report-modal-btn" class="bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300">Cerrar</button>
                </div>
            </div>
        `;
        showModal(html, false);
        document.getElementById('close-report-modal-btn').addEventListener('click', hideModal);
        return;
    }

    const groupedHotspots = visibleHotspots.reduce((acc, hotspot) => {
        const tipo = hotspot.tipoProyecto;
        if (!acc[tipo]) {
            acc[tipo] = [];
        }
        acc[tipo].push(hotspot);
        return acc;
    }, {});

    let tableHtml = '';
    const tableHeaders = [
        { key: 'nombreProyecto', label: 'Proyecto' },
        { key: 'anioInicio', label: 'Año Inicio' },
        { key: 'estado', label: 'Estado' },
        { key: 'superficie', label: 'Superficie' },
        { key: 'monto', label: 'Monto' },
        { key: 'centroCosto', label: 'Centro de Costo' },
        { key: 'idLicitacion', label: 'ID Licitación' },
        { key: 'financiamiento', label: 'Financiamiento' },
        { key: 'ito', label: 'ITO' },
        { key: 'ejecutiva', label: 'Ejecutiva' }
    ];

    CONSTANTS.TIPO_PROYECTO_OPTIONS.forEach(tipo => {
        const hotspotsInGroup = groupedHotspots[tipo];
        if (hotspotsInGroup && hotspotsInGroup.length > 0) {
            hotspotsInGroup.sort((a, b) => {
                const indexA = CONSTANTS.ESTADO_SORT_ORDER.indexOf(a.estado);
                const indexB = CONSTANTS.ESTADO_SORT_ORDER.indexOf(b.estado);

                if (indexA === -1 && indexB === -1) return 0;
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;
                
                return indexA - indexB;
            });

            const modalColorClass = CONSTANTS.COLOR_MAP[tipo];
            const headerRow = tableHeaders.map(h => `<th scope="col" class="px-6 py-3 text-left font-medium uppercase tracking-wider">${h.label}</th>`).join('');
            
            const rowsHtml = hotspotsInGroup.map(h => {
                const rowData = tableHeaders.map(header => {
                    const value = h[header.key] || '';
                    return `<td class="px-6 py-4 text-gray-500">${value}</td>`;
                }).join('');
                return `<tr>${rowData}</tr>`;
            }).join('');
            
            tableHtml += `
                <div class="mb-6">
                    <div class="rounded-t-lg py-2 px-4 text-white font-bold text-lg ${modalColorClass}">
                        ${tipo.toUpperCase()} (${hotspotsInGroup.length})
                    </div>
                    <div class="report-table-container">
                        <table class="min-w-full divide-y divide-gray-200 text-[10px]" data-tipo="${tipo}">
                            <thead class="report-table-header">
                                <tr>
                                    ${headerRow}
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
    });

    const html = `
        <div class="rounded-xl shadow-2xl bg-white p-6">
            <div id="report-content-to-save">
                ${tableHtml}
            </div>
            <div class="flex justify-end mt-6 space-x-2">
                <button id="export-excel-btn" class="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700">Exportar a Excel</button>
                <button id="print-report-btn" class="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700">Imprimir</button>
                <button id="close-report-modal-btn" class="bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300">Cerrar</button>
            </div>
        </div>
    `;

    showModal(html, false);
    
    document.getElementById('print-report-btn').addEventListener('click', () => {
        window.print();
    });

    document.getElementById('close-report-modal-btn').addEventListener('click', hideModal);

    document.getElementById('export-excel-btn').addEventListener('click', () => {
        handleExportToCSV(visibleHotspots);
    });
}

function escapeForCsv(value) {
    if (value === null || typeof value === 'undefined') {
        return '';
    }
    let stringValue = String(value);
    stringValue = stringValue.replace(/"/g, '""');
    return `"${stringValue}"`;
}

function handleExportToCSV(hotspotsToExport) {
    const headers = [
        "Proyecto", "Año Inicio", "Tipo Proyecto", "Estado", "Superficie",
        "Monto", "Centro de Costo", "ID Licitación", "Financiamiento",
        "Ord. Req. Bases", "Permiso Edificación", "ITO", "Observaciones",
        "Revisión Externa", 
        "Estudio Suelo", 
        "Fecha Inicio Proyecto", "Fecha Revisión Externa",
        "Fecha Envío a Bases", "Fecha Licitación", 
        "Fecha Adjudicación-Contrato", // AGREGADO a CSV
        "Fecha Entrega Terreno",
        "Fecha Término de Obra", "Carpeta de Archivos", "Ejecutiva"
    ];

    const rows = hotspotsToExport.map(h => [
        escapeForCsv(h.nombreProyecto),
        escapeForCsv(h.anioInicio),
        escapeForCsv(h.tipoProyecto),
        escapeForCsv(h.estado),
        escapeForCsv(h.superficie),
        escapeForCsv(h.monto),
        escapeForCsv(h.centroCosto),
        escapeForCsv(h.idLicitacion),
        escapeForCsv(h.financiamiento),
        escapeForCsv(h.ordReqBases),
        escapeForCsv(h.permisoEdificacion),
        escapeForCsv(h.ito),
        escapeForCsv(h.observaciones),
        escapeForCsv(h.revisionExterna),
        escapeForCsv(h.estudioSuelo),
        escapeForCsv(formatDate(h.fechaInicioProyecto)),
        escapeForCsv(formatDate(h.fechaRevisionExterna)),
        escapeForCsv(formatDate(h.fechaEnvioBases)),
        escapeForCsv(formatDate(h.fechaLicitacion)),
        escapeForCsv(formatDate(h.fechaAdjudicacionContrato)), // NUEVO
        escapeForCsv(formatDate(h.fechaEntregaTerreno)),
        escapeForCsv(formatDate(h.fechaTerminoObra)),
        escapeForCsv(h.carpetaArchivos),
        escapeForCsv(h.ejecutiva)
    ]);

    const csvContent = "\uFEFF" + [headers.map(h => `"${h}"`).join(';'), ...rows.map(row => row.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "reporte_proyectos.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function init() {
    loadHotspots();
    window.addEventListener('resize', renderHotspots);

    DOM_ELEMENTS.imageContainer.addEventListener('click', (event) => {
        if (isEditingMode) {
            const rect = DOM_ELEMENTS.imageContainer.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width;
            const y = (event.clientY - rect.top) / rect.height;
            showEditHotspotModal(null, { x, y });
        }
    });

    DOM_ELEMENTS.adminBtn.addEventListener('click', () => {
        if (isEditingMode) {
            isEditingMode = false;
            DOM_ELEMENTS.adminBtn.textContent = 'Editar';
            DOM_ELEMENTS.adminBtn.classList.remove('bg-red-500', 'text-white');
            DOM_ELEMENTS.adminBtn.classList.add('bg-gray-200');
        } else {
            showPasswordModal();
        }
    });

    DOM_ELEMENTS.mainModal.addEventListener('click', (event) => {
        if (event.target === DOM_ELEMENTS.mainModal) {
            hideModal();
        }
    });

    DOM_ELEMENTS.yearFilterStart.addEventListener('input', renderHotspots);
    DOM_ELEMENTS.yearFilterEnd.addEventListener('input', renderHotspots);
    
    DOM_ELEMENTS.receptionFilterSi.addEventListener('change', renderHotspots);
    DOM_ELEMENTS.receptionFilterNo.addEventListener('change', renderHotspots);

    DOM_ELEMENTS.estudioSueloFilterSi.addEventListener('change', renderHotspots);
    DOM_ELEMENTS.estudioSueloFilterNo.addEventListener('change', renderHotspots);

    DOM_ELEMENTS.reportBtn.addEventListener('click', (event) => {
        event.preventDefault();
        showReportModal();
    });
    
    // NUEVO: Manejador de eventos para el botón de Licitaciones
    DOM_ELEMENTS.licitacionBtn.addEventListener('click', (event) => {
        event.preventDefault();
        showLicitacionReportModal();
    });

    DOM_ELEMENTS.showButtonsBtn.addEventListener('click', () => {
        showAllHotspots = true;
        DOM_ELEMENTS.hiddenButtonsContainer.classList.remove('hidden');
        DOM_ELEMENTS.showButtonsBtn.classList.add('hidden');
        document.getElementById('leyenda-proyecto').classList.remove('hidden');
        DOM_ELEMENTS.estudioSueloFilterContainer.classList.remove('hidden');
        renderHotspots();
    });
}

document.addEventListener('DOMContentLoaded', init);