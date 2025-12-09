const DOM_ELEMENTS = {
    imageContainer: document.getElementById('image-container'),
    hotspotWrapper: document.getElementById('hotspot-wrapper'),
    mainModal: document.getElementById('main-modal'),
    modalContent: document.getElementById('modal-content'),
    adminBtn: document.getElementById('admin-btn'),
    reportBtn: document.getElementById('report-btn'),
    licitacionBtn: document.getElementById('licitacion-btn'),
    projectImage: document.getElementById('project-image'),
    yearFilterStart: document.getElementById('year-filter-start'),
    yearFilterEnd: document.getElementById('year-filter-end'),
    receptionFilterSi: document.getElementById('filter-recepcionado-si'),
    receptionFilterNo: document.getElementById('filter-recepcionado-no'),
    showButtonsBtn: document.getElementById('show-buttons-btn'), // ✅ CLAVE: Botón para mostrar opciones
    hiddenButtonsContainer: document.getElementById('hidden-buttons-container'), // ✅ CLAVE: Contenedor de opciones ocultas
    estudioSueloFilterContainer: document.getElementById('estudio-suelo-filter'),
    estudioSueloFilterSi: document.getElementById('filter-suelo-si'),
    estudioSueloFilterNo: document.getElementById('filter-suelo-no')
};

const CONSTANTS = {
    API_URL: 'hotspots.json', // URL de su API Back-end. Debe apuntar a su servidor real.
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
    STATE_LETTER_MAP: {
        'Revisión Externa': 'E',
        'Bases': 'B',
        'Licitación': 'L',
        'Licitación sin Adjudicar': 'Lx',
        'Adjudicación - Contrato': 'AC',
    },
    ITO_OPTIONS: ['Karin Escalona', 'Héctor Jofré', 'Miguel Llanos', 'Juan Carlos Maluenda'],
    EJECUTIVA_OPTIONS: ['Graciela Quiroz', 'Claudia Ortiz'],
};

let hotspots = [];
let isEditingMode = false;
let showAllHotspots = false; // Controla si se muestran los hotspots de tipo 'Proyecto'


// =================================================================
// FUNCIONES DE PERSISTENCIA (FETCH API) - Requieren Back-end
// =================================================================

async function fetchHotspots() {
    try {
        // Simulación: Si la API_URL está en la misma URL, usa esa. De lo contrario, cambie el prefijo.
        const response = await fetch(CONSTANTS.API_URL);
        if (!response.ok) {
            // Si el servidor responde con 404 (no existe la API), esto se captura aquí.
            throw new Error(`Error HTTP: ${response.status}. Asegúrese de que el servidor Back-end esté funcionando en ${CONSTANTS.API_URL}`);
        }
        hotspots = await response.json();
        hotspots = hotspots.map(h => ({ 
            ...h, 
            estudioSuelo: h.estudioSuelo || 'No',
            fechaAdjudicacionContrato: h.fechaAdjudicacionContrato || '' 
        }));
        renderHotspots();
    } catch (error) {
        console.error("Error al cargar hotspots del servidor:", error);
        // Mensaje de error si la API falla.
        alert("¡Error de conexión! No se pudieron cargar los datos del servidor. (Revise la consola para detalles)");
    }
}

async function saveHotspot(hotspotData, isNew) {
    try {
        const method = isNew ? 'POST' : 'PUT';
        const url = isNew ? CONSTANTS.API_URL : `${CONSTANTS.API_URL}/${hotspotData.id}`;
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(hotspotData)
        });

        if (!response.ok) {
            throw new Error(`Error HTTP al guardar: ${response.status}`);
        }

        const savedHotspot = await response.json();
        return savedHotspot;
        
    } catch (error) {
        console.error("Error al guardar hotspot en el servidor:", error);
        alert(`Error al guardar el hotspot. Detalle: ${error.message}`);
        return null;
    }
}

async function deleteHotspotById(id) {
    try {
        const response = await fetch(`${CONSTANTS.API_URL}/${id}`, {
            method: 'DELETE',
        });
        
        if (!response.ok) {
            throw new Error(`Error HTTP al eliminar: ${response.status}`);
        }
        
        return true; 
        
    } catch (error) {
        console.error("Error al eliminar hotspot del servidor:", error);
        alert(`Error al eliminar el hotspot. Detalle: ${error.message}`);
        return false;
    }
}

// =================================================================
// LÓGICA DE INTERFAZ Y FILTROS (Mantenido y funcional)
// =================================================================

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
        // Si no se han mostrado las opciones de gestión, solo mostramos Obra y Recepcionado
        filtered = filtered.filter(h => h.tipoProyecto !== 'Proyecto');
    }

    const showSiRecepcion = DOM_ELEMENTS.receptionFilterSi.checked;
    const showNoRecepcion = DOM_ELEMENTS.receptionFilterNo.checked;
    
    const showSiSuelo = DOM_ELEMENTS.estudioSueloFilterSi.checked;
    const showNoSuelo = DOM_ELEMENTS.estudioSueloFilterNo.checked;
    
    const startYearValue = DOM_ELEMENTS.yearFilterStart.value.trim();
    const endYearValue = DOM_ELEMENTS.yearFilterEnd.value.trim();

    let startYear = startYearValue ? parseInt(startYearValue) : null;
    let endYear = endYearValue ? parseInt(endYearValue) : null;
    
    // Lógica para manejar filtros de año (se mantiene igual)
    if (startYear !== null && endYear === null) {
        endYear = startYear;
    } else if (startYear === null && endYear !== null) {
        // No hacer nada si solo hay endYear
    }
    
    if (startYear !== null && endYear !== null && startYear > endYear) {
        [startYear, endYear] = [endYear, startYear];
    }

    // Filtrar por recepcionado
    if (showSiRecepcion !== showNoRecepcion) {
        if (showSiRecepcion) {
            filtered = filtered.filter(h => h.recepcionado === 'Sí');
        } else {
            filtered = filtered.filter(h => h.recepcionado !== 'Sí');
        }
    }
    
    // Filtrar por estudio de suelo
    if (showSiSuelo !== showNoSuelo) {
        if (showSiSuelo) {
            filtered = filtered.filter(h => h.estudioSuelo === 'Sí');
        } else {
            filtered = filtered.filter(h => h.estudioSuelo !== 'Sí');
        }
    }

    // Filtrar por rango de año
    if (startYear !== null || endYear !== null) {
        filtered = filtered.filter(h => {
            if (!h.anioInicio) return false;
            const projectYear = parseInt(h.anioInicio);

            const isAfterStart = startYear === null || projectYear >= startYear;
            const isBeforeEnd = endYear === null || projectYear <= endYear;
            
            return isAfterStart && isBeforeEnd;
        });
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

        if (hotspot.tipoProyecto === 'Proyecto') {
            const estadoLetter = CONSTANTS.STATE_LETTER_MAP[hotspot.estado] || '';
            if (estadoLetter) { 
                const letterEl = document.createElement('div');
                letterEl.className = 'hotspot-state-letter';
                letterEl.textContent = estadoLetter;
                hotspotEl.appendChild(letterEl);
            }
        }

        const tooltipEl = document.createElement('div');
        tooltipEl.className = 'hotspot-tooltip';
        
        let tooltipContent = '';
        if (hotspot.imagenProyectoUrl && (hotspot.tipoProyecto === 'Obra' || hotspot.tipoProyecto === 'Recepcionado')) {
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
            // Solo si se han mostrado las opciones (showAllHotspots = true)
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

    DOM_ELEMENTS.modalContent.classList.remove('max-w-md', 'max-w-sm', 'max-w-6xl', 'max-w-screen-2xl', 'max-w-3xl');
    if (isPasswordModal) {
        DOM_ELEMENTS.modalContent.classList.add('max-w-sm');
    } else if (document.getElementById('report-content-to-save')) {
        DOM_ELEMENTS.modalContent.classList.add('max-w-screen-2xl');
    } else if (document.getElementById('licitacion-table-content')) {
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
    DOM_ELEMENTS.adminBtn.textContent = 'Modo de edición (ON)';
    DOM_ELEMENTS.adminBtn.classList.remove('bg-gray-200');
    DOM_ELEMENTS.adminBtn.classList.add('bg-red-500', 'text-white');
    hideModal();
}

function handlePasswordFormSubmit(event) {
    event.preventDefault();
    handleAuthenticationSuccess();
}

function showViewHotspotModal(hotspot) {
    const proyectoDays = calculateDaysBetweenDates(hotspot.fechaInicioProyecto, hotspot.fechaEnvioBases);
    const basesDays = calculateDaysBetweenDates(hotspot.fechaEnvioBases, hotspot.fechaLicitacion);
    const licitacionDays = calculateDaysBetweenDates(hotspot.fechaLicitacion, hotspot.fechaAdjudicacionContrato); 
    const adjudicacionContratoDays = calculateDaysBetweenDates(hotspot.fechaAdjudicacionContrato, hotspot.fechaEntregaTerreno); 
    const construccionDays = calculateDaysBetweenDates(hotspot.fechaEntregaTerreno, hotspot.fechaTerminoObra);
    
    const revisionExternaDays = hotspot.revisionExterna === 'Sí'
        ? calculateDaysBetweenDates(hotspot.fechaRevisionExterna, hotspot.fechaEnvioBases)
        : '';

    const modalColorClass = CONSTANTS.COLOR_MAP[hotspot.tipoProyecto] || 'bg-gray-300';

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