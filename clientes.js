// ============================================================================
// 📁 ARCHIVO: clientes.js
// 🎯 PROPÓSITO: Manejar la lógica visual del cliente (Buscar negocios, agendar citas, ver historial).
// ============================================================================

// --- 1. CONFIGURACIÓN Y ESTADO GLOBAL ---
const API_URL = ""; // URL base para las peticiones al servidor (vacío = mismo dominio donde se despliega)
const grid = document.getElementById('businessGrid'); // Contenedor visual donde se pintan las tarjetas de negocios
const slotsDiv = document.getElementById('timeSlots'); // Contenedor visual de los botones de horarios disponibles
let currentPage = 1; // Control de la página actual para la paginación de negocios
let currentCategory = 'Todas'; // Filtro de categoría actual (por defecto muestra 'Todas')

// Variables globales para manejar el mapa interactivo de la librería Leaflet
let mapCliente, markerCliente;

// --- 2. INICIALIZACIÓN (Se ejecuta al arrancar la página) ---
document.addEventListener('DOMContentLoaded', () => {
    mostrarNombreUsuario(); // Verifica si hay sesión y saluda al usuario en el header superior
    cargarCategorias(); // Descarga los botones de categorías dinámicamente desde la BD
    cargarNegocios(); // Descarga y dibuja la primera tanda de negocios
});

// --- 3. MÓDULO DE BÚSQUEDA: NEGOCIOS Y CATEGORÍAS ---

// Función que consulta al servidor las categorías únicas existentes
async function cargarCategorias() {
    try {
        const res = await fetch(`${API_URL}/categorias`); // Petición GET al backend
        const categorias = await res.json(); // Convertimos la respuesta a JSON
        renderizarCategorias(['Todas', ...categorias]); // Inyectamos la opción 'Todas' por defecto al inicio del arreglo
    } catch (e) { console.error("Error cargando categorías:", e); }
}

// Función encargada de inyectar dinámicamente los botones de filtro por categoría
function renderizarCategorias(categoriasUnicas) {
    let catContainer = document.getElementById('categoryContainer');
    if (!catContainer) { // Si el contenedor no existe en el HTML, lo creamos desde cero
        catContainer = document.createElement('div');
        catContainer.id = 'categoryContainer';
        // Aplicamos estilos de Flexbox para hacer un carrusel desplazable
        catContainer.style.cssText = 'margin-bottom:20px; display:flex; gap:10px; overflow-x:auto; padding-bottom:10px;';
        grid.parentNode.insertBefore(catContainer, grid); // Insertamos el contenedor justo encima de la cuadrícula de negocios
    }

    // Generamos el código HTML interno iterando sobre el arreglo de categorías
    catContainer.innerHTML = categoriasUnicas.map(cat => `
        <button class="btn-categoria" onclick="cambiarCategoria('${cat}')"
                style="padding: 8px 16px; border: 2px solid #2563eb; border-radius: 20px; 
                       background: ${cat === currentCategory ? '#2563eb' : 'white'}; 
                       color: ${cat === currentCategory ? 'white' : '#2563eb'}; 
                       cursor: pointer; white-space: nowrap; font-weight: bold; transition: 0.3s;">
            ${cat}
        </button>
    `).join('');
}

// Acción que se dispara al hacer clic en algún botón de categoría
function cambiarCategoria(categoria) {
    currentCategory = categoria; // Actualizamos el estado global de la categoría elegida
    currentPage = 1; // Reiniciamos a la página 1 ya que cambió la búsqueda
    cargarCategorias(); // Repintamos las categorías para que cambie el color del botón activo
    cargarNegocios(); // Consultamos a la BD usando el nuevo filtro
}

// Función principal: Consulta al servidor la lista de locales y las dibuja
async function cargarNegocios() {
    try {
        // Petición con variables en la URL (Query Params) para filtrar y paginar dinámicamente
        const response = await fetch(`${API_URL}/negocios?page=${currentPage}&limit=10&categoria=${currentCategory}`);
        const result = await response.json();
        
        // Si la base de datos no devolvió nada, mostramos un aviso
        if (result.data.length === 0) {
            grid.innerHTML = "<p>No hay negocios disponibles en esta categoría.</p>";
            renderizarPaginacion(1, 1); // Forzamos paginación a 1 para evitar crasheos
            return;
        }

        // Transformamos cada elemento JSON en una tarjeta HTML (Card)
        grid.innerHTML = result.data.map(n => `
            <div class="card" onclick="abrirModal(${n.id})">
                <!-- Comprobador inteligente: Si no hay logo válido, usa una imagen de relleno -->
                <img src="${n.logo_url ? (n.logo_url.startsWith('http') ? n.logo_url : API_URL + n.logo_url) : 'https://via.placeholder.com/150'}" 
                     class="business-logo" style="width:100%; height:150px; object-fit:cover;">
                <div class="card-info">
                    <h3>${n.nombre_negocio}</h3>
                    <p>📍 ${n.categoria || 'Servicios'}</p>
                </div>
            </div>
        `).join('');

        renderizarPaginacion(result.page, result.totalPages); // Dibuja botones inferior de paginación
    } catch (e) { console.error("Error cargando negocios:", e); }
}

// --- 3.1 PAGINACIÓN DE NEGOCIOS ---

function renderizarPaginacion(page, totalPages) {
    let pagContainer = document.getElementById('paginationContainer');
    if (!pagContainer) { // Creación al vuelo si no existe
        pagContainer = document.createElement('div');
        pagContainer.id = 'paginationContainer';
        pagContainer.style.cssText = 'margin-top:20px; display:flex; justify-content:center; align-items:center; gap:15px;';
        grid.parentNode.insertBefore(pagContainer, grid.nextSibling); // Insertar debajo del grid
    }

    if (totalPages <= 1) { // Si los negocios caben en 1 hoja, ocultamos el control
        pagContainer.innerHTML = ''; 
        return;
    }

    let html = '';
    if (page > 1) { // Lógica del botón Anterior
        html += `<button onclick="cambiarPagina(${page - 1})" style="padding:8px 16px; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:8px; cursor:pointer;">Anterior</button>`;
    }
    
    html += `<span style="font-weight:bold; color:#475569;">Página ${page} de ${totalPages}</span>`;

    if (page < totalPages) { // Lógica del botón Siguiente
        html += `<button onclick="cambiarPagina(${page + 1})" style="padding:8px 16px; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:8px; cursor:pointer;">Siguiente</button>`;
    }
    pagContainer.innerHTML = html;
}

function cambiarPagina(nuevaPagina) {
    currentPage = nuevaPagina;
    cargarNegocios();
    window.scrollTo({ top: grid.offsetTop - 50, behavior: 'smooth' }); // Desplazamiento cinético agradable hacia arriba
}

// Utilidad: Convierte los IDs de días en MySQL a texto legible para el usuario (Ej. "1,2" -> "Lunes, Martes")
function obtenerDiasTexto(diasString) {
    if (!diasString) return "No especificados";
    const mapaDias = { "1": "Lunes", "2": "Martes", "3": "Miércoles", "4": "Jueves", "5": "Viernes", "6": "Sábado", "7": "Domingo" };
    return diasString.split(',').map(num => mapaDias[num]).join(', ');
}

// --- 4. MÓDULO DE AGENDAMIENTO (MODAL DEL NEGOCIO) ---

// Acción al dar clic a un negocio. Trae los detalles e inicializa el calendario de citas.
async function abrirModal(id) {
    try {
        const res = await fetch(`${API_URL}/mi-negocio-detalles/${id}`); // Trae detalles privados
        const n = await res.json();

        const modal = document.getElementById('calendarModal');
        modal.style.display = 'block';
        modal.dataset.bizId = id; // Inyección de Meta-Data al DOM para manipular más adelante
        modal.dataset.diasHabiles = n.dias_habiles || ""; // Guarda días habilitados escondidos en HTML

        // Setear datos de texto al interior del PopUp
        document.getElementById('modalBusinessName').innerText = n.nombre_negocio;
        document.getElementById('businessInfo').innerHTML = `
            <p>📞 <b>Tel:</b> ${n.telefono_negocio || 'No disponible'}</p>
            <p>📅 <b>Días de atención:</b> ${obtenerDiasTexto(n.dias_habiles)}</p>
        `;

        // Inicializador dinámico del Mapa Leaflet en la tarjeta del negocio
        const mapContainer = document.getElementById('mapa-cliente-container');
        if (n.latitud && n.longitud) {
            mapContainer.style.display = 'block';
            const lat = parseFloat(n.latitud);
            const lng = parseFloat(n.longitud);
            
            // Actualiza enlace de botón hacia redirección de App de Google Maps
            document.getElementById('btnGoogleMaps').href = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

            if (!mapCliente) { // Inicialización tardía: Solo se crea el mapa una vez para ahorrar memoria
                mapCliente = L.map('mapa-cliente').setView([lat, lng], 16);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(mapCliente);
                markerCliente = L.marker([lat, lng]).addTo(mapCliente);
            } else { // Si ya existía el mapa, simplemente movemos el marcador sin recargar el componente
                markerCliente.setLatLng([lat, lng]);
                mapCliente.setView([lat, lng], 16);
            }
            
            // Hack arquitectónico: Los mapas basados en canvas (Leaflet) crashean si se instancian estando "display:none". Forzamos recálculo.
            setTimeout(() => { mapCliente.invalidateSize(); }, 300);
        } else {
            mapContainer.style.display = 'none'; // Si este negocio no tiene dirección, ocultamos contenedor
        }

        // Configuración defensiva del selector de fechas (Input Type Date)
        const inputFecha = document.getElementById('appointmentDate');
        if (inputFecha) {
            inputFecha.value = ""; // Resetea valor viejo 
            const today = new Date();
            const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];
            inputFecha.min = localDate; // Le prohíbe explícitamente al navegador mostrar fechas del pasado
        }
        slotsDiv.innerHTML = "<p style='color: #64748b;'>Selecciona una fecha primero</p>"; // Estado neutro
    } catch (err) {
        console.error("Error al obtener detalles:", err);
        await customAlert("No se pudieron cargar los detalles del negocio.", "#ef4444");
    }
}

// --- 4.1 MOTOR DE AGENDAMIENTO ---

// Función medular que cruza el horario del negocio con las citas ya agendadas
async function actualizarHorarios() {
    const bizId = document.getElementById('calendarModal').dataset.bizId;
    const diasHabilesStr = document.getElementById('calendarModal').dataset.diasHabiles;
    const fecha = document.getElementById('appointmentDate').value;
    if (!fecha) return;

    // Seguridad extra: Revisar que no sea fecha pasada por si el input del HTML fue manipulado
    const nowOriginal = new Date();
    const hoyLocal = new Date(nowOriginal.getTime() - nowOriginal.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    if (fecha < hoyLocal) {
        slotsDiv.innerHTML = "<p style='color: #dc2626; font-weight: bold;'>No puedes seleccionar fechas pasadas.</p>";
        return;
    }

    slotsDiv.innerHTML = "<p>Cargando horarios...</p>"; // UI Loading State

    // Algoritmo: Revisa si el día del mes seleccionado cae en el número de día de la semana que atiende el negocio
    if (diasHabilesStr) {
        const diasPermitidos = diasHabilesStr.split(',');
        const [year, month, day] = fecha.split('-');
        const fechaObj = new Date(year, month - 1, day); // Instanciación precisa para omitir problemas de Timezones
        let jsDay = fechaObj.getDay(); // Retorna 0 a 6
        let myDay = jsDay === 0 ? "7" : jsDay.toString(); // Adaptación a lógica de MySQL donde Domingo = 7
        
        if (!diasPermitidos.includes(myDay)) {
            slotsDiv.innerHTML = "<p style='color: #dc2626; font-weight: bold;'>El negocio se encuentra cerrado este día. Por favor, selecciona otro.</p>";
            return; // Cortafuegos. Si el negocio no atiende hoy, ni siquiera le preguntamos al backend las citas ocupadas
        }
    }

    try {
        // Extraer citas tomadas para esa fecha específica
        const resOcupadas = await fetch(`${API_URL}/citas-ocupadas?negocio_id=${bizId}&fecha=${fecha}`);
        const ocupadas = await resOcupadas.json();

        // Extraer estructura vacía de turnos del negocio (Apertura a Cierre y su Segmentación)
        const resSlots = await fetch(`${API_URL}/generar-slots/${bizId}`);
        const horariosDisponibles = await resSlots.json();

        if (horariosDisponibles.length === 0) {
            slotsDiv.innerHTML = "<p>El negocio no tiene horarios configurados.</p>";
            return;
        }

        // Restricción anti-falla temporal: Ocúltale al usuario los slots muy cercanos a la hora actual (holgura de 30 mins)
        const today = new Date();
        today.setMinutes(today.getMinutes() + 30);
        const minDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        const minTime = today.toTimeString().substring(0, 5);
        
        const horariosValidos = horariosDisponibles.filter(h => !(fecha < minDate || (fecha === minDate && h < minTime)));

        if (horariosValidos.length === 0) {
            slotsDiv.innerHTML = "<p style='color: #d97706;'>Ya no hay horarios disponibles para hoy.</p>";
            return;
        }

        // Transformar la matriz matemática en botones HTML funcionales (Pintando rojo a los ocupados)
        slotsDiv.innerHTML = horariosValidos.map(h => {
            const estaOcupado = ocupadas.includes(h);
            return `
                <div class="slot ${estaOcupado ? 'ocupado' : 'libre'}" 
                     onclick="${estaOcupado ? '' : `confirmarCita('${h}')`}"> 
                    ${h} ${estaOcupado ? '(Ocupado)' : ''}
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error("Error al generar horarios:", err);
        slotsDiv.innerHTML = "<p>Error al cargar disponibilidad.</p>";
    }
}

// Función ejecutora: Inserta la Cita en Base de datos
async function confirmarCita(hora) {
    const bizId = document.getElementById('calendarModal').dataset.bizId;
    const userId = sessionStorage.getItem('userId');
    
    // Filtro estricto: Impide que los usuarios que ingresaron de chismosos sin cuenta puedan apartar lugar
    if (!userId || sessionStorage.getItem('userRole') === 'invitado') {
        await customAlert("Debes iniciar sesión o crear una cuenta para poder agendar citas.", "#ef4444");
        window.location.href = 'index.html';
        return;
    }

    const fecha = document.getElementById('appointmentDate').value;
    const confirmar = await customConfirm(`¿Confirmar tu cita para las ${hora}?`, "Confirmar", "#22c55e");
    if (!confirmar) return;

    try {
        const res = await fetch(`${API_URL}/citas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cliente_id: userId, negocio_id: bizId, fecha, hora })
        });

        if (res.ok) {
            await customAlert("✅ Cita agendada correctamente.", "#22c55e");
            cerrarModal();
        } else {
            const error = await res.json();
            await customAlert("Error: " + (error.error || "No se pudo agendar."), "#ef4444");
            actualizarHorarios(); // En caso de Condición de Carrera (2 clic al mismo tiempo), la BD rechaza, forzamos recarga
        }
    } catch (err) {
        await customAlert("Error de conexión con el servidor.", "#ef4444");
    }
}

function cerrarModal() { document.getElementById('calendarModal').style.display = 'none'; }

// --- 5. MÓDULO DEL HISTORIAL DEL CLIENTE ---

// Transición entre Vistas (Módulos) dentro de la misma pantalla (SPA)
function mostrarSeccion(seccion) {
    const id = sessionStorage.getItem('userId');
    const role = sessionStorage.getItem('userRole');
    
    // Se le prohíbe el acceso a los visitantes temporales a la pestaña "Historial"
    if (seccion === 'historial' && (!id || role === 'invitado')) {
        customAlert("Debes iniciar sesión para ver tu historial de citas.", "#ef4444").then(() => window.location.href = 'index.html');
        return;
    }
    document.getElementById('explorar-section').style.display = seccion === 'explorar' ? 'block' : 'none';
    document.getElementById('historial-section').style.display = seccion === 'historial' ? 'block' : 'none';
    if(seccion === 'historial') cargarHistorial(); // Lazy Load: Se llama al servidor solo cuando abren la ventana
}

let paginaHistorial = 1;
let estadoHistorial = 'pendiente';

// Constructor de Gráfico: Extrae del Servidor qué citas hemos apartados y dibuja Cards
async function cargarHistorial() {
    const id = sessionStorage.getItem('userId');
    const res = await fetch(`${API_URL}/citas-cliente/${id}?page=${paginaHistorial}&limit=10&estado=${estadoHistorial}`);
    const result = await res.json();
    const contenedor = document.getElementById('historialLista');

    // Selector de Pestañas (En forma de Flexbox) para filtrar estados de cita
    let html = `<div style="display:flex; gap:10px; margin-bottom:15px; overflow-x:auto;">
        ${['pendiente', 'confirmada', 'rechazada', 'hecha', 'eliminada'].map(est => `
            <button onclick="cambiarFiltroHistorial('${est}')" 
                    style="padding:8px 12px; border:none; border-radius:5px; cursor:pointer; 
                           background:${estadoHistorial === est ? '#2563eb' : '#e2e8f0'}; 
                           color:${estadoHistorial === est ? 'white' : 'black'}; font-weight:bold; text-transform:capitalize;">
                ${est}s
            </button>
        `).join('')}
    </div>`;

    if (!result.data || result.data.length === 0) {
        html += `<p>No hay citas en este apartado.</p>`;
    } else {
        html += result.data.map(c => `
            <div class="cita-card" style="background:white; padding:15px; margin-bottom:10px; border-radius:10px; display:flex; justify-content:space-between; align-items:center; border:1px solid #ddd;">
                <div>
                    <strong>${c.nombre_negocio}</strong><br>
                    📅 ${c.fecha} a las ${c.hora}
                </div>
                ${(estadoHistorial === 'pendiente' || estadoHistorial === 'confirmada') 
                   ? `<button onclick="cancelarCita(${c.id})" style="background:#ff4444; color:white; border:none; padding:8px 12px; border-radius:5px; cursor:pointer;">Cancelar</button>` 
                   : ''}
            </div>
        `).join('');
        
        if (result.totalPages > 1) {
            html += `<div style="display:flex; justify-content:center; gap:10px; margin-top:15px;">
                ${result.page > 1 ? `<button onclick="cambiarPaginaHistorial(${result.page - 1})" style="padding:5px 10px;">Anterior</button>` : ''}
                <span>Página ${result.page} / ${result.totalPages}</span>
                ${result.page < result.totalPages ? `<button onclick="cambiarPaginaHistorial(${result.page + 1})" style="padding:5px 10px;">Siguiente</button>` : ''}
            </div>`;
        }
    }
    contenedor.innerHTML = html;
}

function cambiarFiltroHistorial(estado) { estadoHistorial = estado; paginaHistorial = 1; cargarHistorial(); }
function cambiarPaginaHistorial(pag) { paginaHistorial = pag; cargarHistorial(); }

// Transforma el estado de un registro hacia Eliminada (Baja lógica).
async function cancelarCita(id) {
    const confirmar = await customConfirm("¿Deseas cancelar esta cita? (Pasará a estado eliminada)", "Cancelar cita", "#ef4444");
    if(!confirmar) return;
    // Se recicla el conector de actualización genérico
    const res = await fetch(`${API_URL}/citas/${id}/estado`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({estado: 'eliminada'}) });
    if(res.ok) { await customAlert("Cita cancelada.", "#22c55e"); cargarHistorial(); }
}

// --- 6. MÓDULO DE IDENTIDAD DEL PERFIL ---

// Control Visual: Determina qué botones dibujar en la Barra Superior según el estatus del usuario
async function mostrarNombreUsuario() {
    const id = sessionStorage.getItem('userId');
    const role = sessionStorage.getItem('userRole');
    const display = document.getElementById('userNameDisplay');
    if (!display) return;

    // Manipulación Dinámica: Reemplazar saludo por Botón Azul a Invitados.
    if (!id || role === 'invitado') {
        display.innerText = "Iniciar sesión / Crear cuenta";
        display.style.cssText = 'cursor:pointer; background-color:#2563eb; color:white; padding:8px 15px; border-radius:8px;';
        display.title = 'Ir al login';
        display.onclick = () => window.location.href = 'index.html';
        
        // Eliminación visual del botón "Cerrar sesión" sobrante (Si hubiere)
        const btnLogout = display.nextElementSibling;
        if (btnLogout && btnLogout.tagName === 'BUTTON') btnLogout.style.display = 'none';
        return;
    }

    try {
        const res = await fetch(`${API_URL}/usuario-nombre/${id}`);
        const data = await res.json();
        if (data.nombre) {
            display.innerText = `👤 ${data.nombre}`;
            display.style.cursor = 'pointer';
            display.title = 'Ver mi perfil';
            display.onclick = abrirPerfil;
        }
    } catch (err) { display.innerText = "Usuario"; }
}

// Abre ventana flotante para conocer los datos de sesión y eliminar cuenta
async function abrirPerfil() {
    const id = sessionStorage.getItem('userId');
    if (!id) return;
    try {
        const res = await fetch(`${API_URL}/usuario/${id}`);
        const data = await res.json();
        
        // Inyección de HTML 100% puro al vuelo (Patrón Modal)
        let modal = document.getElementById('perfilModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'perfilModal';
            modal.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999;";
            document.body.appendChild(modal);
        }
        
        modal.innerHTML = `
            <div style="background:white; padding:30px; border-radius:12px; width:90%; max-width:400px; box-shadow:0 10px 25px rgba(0,0,0,0.2); position:relative;">
                <button onclick="document.getElementById('perfilModal').style.display='none'" style="position:absolute; top:10px; right:15px; background:none; border:none; font-size:20px; cursor:pointer;">&times;</button>
                <h2 style="margin-top:0; color:#1e293b;">Mi Perfil</h2>
                <div style="margin-bottom:20px; color:#475569; line-height:1.6;">
                    <p><b>Nombre:</b> ${data.nombre}</p>
                    <p><b>Email:</b> ${data.email}</p>
                    <p><b>Teléfono:</b> ${data.telefono || 'No registrado'}</p>
                    <p><b>Tipo de cuenta:</b> <span style="text-transform:capitalize;">${data.rol}</span></p>
                </div>
                <div style="border-top:1px solid #e2e8f0; padding-top:20px; text-align:center;">
                    <button onclick="eliminarCuenta()" style="background:#ef4444; color:white; border:none; padding:10px 15px; border-radius:8px; cursor:pointer; font-weight:bold; width:100%;">🗑️ Eliminar mi cuenta</button>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
    } catch (err) { await customAlert("Error al cargar la información del perfil.", "#ef4444"); }
}

// Lógica destructiva atada a un Borrado en Cascada sobre DB
async function eliminarCuenta() {
    const confirmar = await customConfirm("¿Estás seguro de que deseas eliminar tu cuenta? Esta acción no se puede deshacer y perderás el registro de tus citas.", "Eliminar cuenta", "#ef4444");
    if (!confirmar) return; // Paro defensivo
    
    const id = sessionStorage.getItem('userId');
    try {
        const res = await fetch(`${API_URL}/usuario/${id}`, { method: 'DELETE' });
        if (res.ok) {
            await customAlert("Cuenta eliminada exitosamente.", "#22c55e");
            sessionStorage.clear(); // Limpiamos huellas locales
            window.location.href = 'index.html'; // Expulsión al root
        } else { await customAlert("Error al eliminar la cuenta.", "#ef4444"); }
    } catch (err) { await customAlert("Error de conexión al intentar eliminar la cuenta.", "#ef4444"); }
}