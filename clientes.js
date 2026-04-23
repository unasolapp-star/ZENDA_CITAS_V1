const API_URL = "http://localhost:3000";
const grid = document.getElementById('businessGrid');
const slotsDiv = document.getElementById('timeSlots');
let currentPage = 1;
let currentCategory = 'Todas';

// 1. Cargar categorías desde BD
async function cargarCategorias() {
    try {
        const res = await fetch(`${API_URL}/categorias`);
        const categorias = await res.json();
        renderizarCategorias(['Todas', ...categorias]);
    } catch (e) { console.error("Error cargando categorías:", e); }
}

// Renderizar filtro de categorías (botones)
function renderizarCategorias(categoriasUnicas) {
    let catContainer = document.getElementById('categoryContainer');
    if (!catContainer) {
        catContainer = document.createElement('div');
        catContainer.id = 'categoryContainer';
        catContainer.style.marginBottom = '20px';
        catContainer.style.display = 'flex';
        catContainer.style.gap = '10px';
        catContainer.style.overflowX = 'auto'; // Por si hay muchas categorías
        catContainer.style.paddingBottom = '10px';
        grid.parentNode.insertBefore(catContainer, grid);
    }

    catContainer.innerHTML = categoriasUnicas.map(cat => `
        <button class="btn-categoria" onclick="cambiarCategoria('${cat}')"
                style="padding: 8px 16px; border: 2px solid #2563eb; border-radius: 20px; background: ${cat === currentCategory ? '#2563eb' : 'white'}; color: ${cat === currentCategory ? 'white' : '#2563eb'}; cursor: pointer; white-space: nowrap; font-weight: bold; transition: 0.3s;">
            ${cat}
        </button>
    `).join('');
}

function cambiarCategoria(categoria) {
    currentCategory = categoria;
    currentPage = 1; // Reiniciar página al cambiar filtro
    cargarCategorias(); // Para actualizar colores de los botones
    cargarNegocios();
}

// Cargar negocios paginados desde el servidor
async function cargarNegocios() {
    try {
        const response = await fetch(`${API_URL}/negocios?page=${currentPage}&limit=10&categoria=${currentCategory}`);
        const result = await response.json();
        
        if (result.data.length === 0) {
        grid.innerHTML = "<p>No hay negocios disponibles en esta categoría.</p>";
            renderizarPaginacion(1, 1);
        return;
    }

    // Dibujar las tarjetas filtradas
        grid.innerHTML = result.data.map(n => `
            <div class="card" onclick="abrirModal(${n.id})">
                <img src="${n.logo_url ? (n.logo_url.startsWith('http') ? n.logo_url : API_URL + n.logo_url) : 'https://via.placeholder.com/150'}" class="business-logo" style="width:100%; height:150px; object-fit:cover;">
                <div class="card-info">
                    <h3>${n.nombre_negocio}</h3>
                    <p>📍 ${n.categoria || 'Servicios'}</p>
                </div>
            </div>
        `).join('');

        renderizarPaginacion(result.page, result.totalPages);
    } catch (e) { console.error("Error cargando negocios:", e); }
}

// Renderizar botones de paginación
function renderizarPaginacion(page, totalPages) {
    let pagContainer = document.getElementById('paginationContainer');
    if (!pagContainer) {
        pagContainer = document.createElement('div');
        pagContainer.id = 'paginationContainer';
        pagContainer.style.marginTop = '20px';
        pagContainer.style.display = 'flex';
        pagContainer.style.justifyContent = 'center';
        pagContainer.style.alignItems = 'center';
        pagContainer.style.gap = '15px';
        grid.parentNode.insertBefore(pagContainer, grid.nextSibling); // Insertar debajo del grid
    }

    if (totalPages <= 1) {
        pagContainer.innerHTML = ''; // Ocultar si solo hay una página
        return;
    }

    let html = '';
    if (page > 1) {
        html += `<button onclick="cambiarPagina(${page - 1})" style="padding: 8px 16px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; cursor: pointer;">Anterior</button>`;
    }
    
    html += `<span style="font-weight: bold; color: #475569;">Página ${page} de ${totalPages}</span>`;

    if (page < totalPages) {
        html += `<button onclick="cambiarPagina(${page + 1})" style="padding: 8px 16px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; cursor: pointer;">Siguiente</button>`;
    }

    pagContainer.innerHTML = html;
}

function cambiarPagina(nuevaPagina) {
    currentPage = nuevaPagina;
    cargarNegocios();
    // Hacer un scroll suave hacia arriba al cambiar de página
    window.scrollTo({ top: grid.offsetTop - 50, behavior: 'smooth' });
}

// Traductor de días (de números a texto)
function obtenerDiasTexto(diasString) {
    if (!diasString) return "No especificados";
    const mapaDias = { "1": "Lunes", "2": "Martes", "3": "Miércoles", "4": "Jueves", "5": "Viernes", "6": "Sábado", "7": "Domingo" };
    return diasString.split(',').map(num => mapaDias[num]).join(', ');
}

// 2. Abrir modal con detalles y limpiar estados
async function abrirModal(id) {
    try {
        const res = await fetch(`${API_URL}/mi-negocio-detalles/${id}`);
        const n = await res.json();

        const modal = document.getElementById('calendarModal');
        modal.style.display = 'block';
        modal.dataset.bizId = id;
        // Guardamos los días hábiles temporalmente en el modal para usarlos luego al elegir la fecha
        modal.dataset.diasHabiles = n.dias_habiles || "";

        document.getElementById('modalBusinessName').innerText = n.nombre_negocio;
        document.getElementById('businessInfo').innerHTML = `
            <p>📞 <b>Tel:</b> ${n.telefono_negocio || 'No disponible'}</p>
            <p>🏠 <b>Dirección:</b> ${n.calle || 'S/N'}, Col. ${n.colonia || 'S/C'}</p>
            <p>📝 <b>Ref:</b> ${n.referencia || 'Sin referencias'}</p>
            <p>📅 <b>Días de atención:</b> ${obtenerDiasTexto(n.dias_habiles)}</p>
        `;

        // Resetear fecha y mensaje de slots
        document.getElementById('appointmentDate').value = "";
        slotsDiv.innerHTML = "<p style='color: #64748b;'>Selecciona una fecha primero</p>";
    } catch (err) {
        console.error("Error al obtener detalles:", err);
        alert("No se pudieron cargar los detalles del negocio.");
    }
}

// 3. Mostrar nombre en el header
async function mostrarNombreUsuario() {
    const id = localStorage.getItem('userId');
    const display = document.getElementById('userNameDisplay');
    if (!id || !display) return;

    try {
        const res = await fetch(`${API_URL}/usuario-nombre/${id}`);
        const data = await res.json();
        if (data.nombre) display.innerText = `👤 ${data.nombre}`;
    } catch (err) { display.innerText = "Usuario"; }
}

// 4. Gestión de Secciones
function mostrarSeccion(seccion) {
    document.getElementById('explorar-section').style.display = seccion === 'explorar' ? 'block' : 'none';
    document.getElementById('historial-section').style.display = seccion === 'historial' ? 'block' : 'none';
    if(seccion === 'historial') cargarHistorial();
}

let paginaHistorial = 1;
let estadoHistorial = 'pendiente';

async function cargarHistorial() {
    const id = localStorage.getItem('userId');
    const res = await fetch(`${API_URL}/citas-cliente/${id}?page=${paginaHistorial}&limit=10&estado=${estadoHistorial}`);
    const result = await res.json();
    const contenedor = document.getElementById('historialLista');

    let html = `<div style="display:flex; gap:10px; margin-bottom:15px; overflow-x:auto;">
        ${['pendiente', 'confirmada', 'rechazada', 'hecha', 'eliminada'].map(est => `
            <button onclick="cambiarFiltroHistorial('${est}')" style="padding:8px 12px; border:none; border-radius:5px; cursor:pointer; background:${estadoHistorial === est ? '#2563eb' : '#e2e8f0'}; color:${estadoHistorial === est ? 'white' : 'black'}; font-weight:bold; text-transform:capitalize;">
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
                ${(estadoHistorial === 'pendiente' || estadoHistorial === 'confirmada') ? `<button onclick="cancelarCita(${c.id})" style="background:#ff4444; color:white; border:none; padding:8px 12px; border-radius:5px; cursor:pointer;">Cancelar</button>` : ''}
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

// 5. BLOQUEO Y GENERACIÓN DINÁMICA DE HORARIOS
async function actualizarHorarios() {
    const bizId = document.getElementById('calendarModal').dataset.bizId;
    const diasHabilesStr = document.getElementById('calendarModal').dataset.diasHabiles;
    const fecha = document.getElementById('appointmentDate').value;
    if (!fecha) return;

    slotsDiv.innerHTML = "<p>Cargando horarios...</p>";

    // A. Validar que la fecha elegida caiga en un día habilitado por el negocio
    if (diasHabilesStr) {
        const diasPermitidos = diasHabilesStr.split(',');
        const [year, month, day] = fecha.split('-');
        const fechaObj = new Date(year, month - 1, day); // Se crea así para evitar desfases de zona horaria
        let jsDay = fechaObj.getDay(); // 0 es Domingo, 1 es Lunes...
        let myDay = jsDay === 0 ? "7" : jsDay.toString(); // Nuestro sistema usa 7 para Domingo
        
        if (!diasPermitidos.includes(myDay)) {
            slotsDiv.innerHTML = "<p style='color: #dc2626; font-weight: bold;'>El negocio se encuentra cerrado este día. Por favor, selecciona otro.</p>";
            return; // Bloquea y no sigue cargando horas
        }
    }

    try {
        // A. Consultar qué horas están ya ocupadas en la BD
        const resOcupadas = await fetch(`${API_URL}/citas-ocupadas?negocio_id=${bizId}&fecha=${fecha}`);
        const ocupadas = await resOcupadas.json();

        // B. Consultar los slots permitidos según el horario del negocio
        const resSlots = await fetch(`${API_URL}/generar-slots/${bizId}`);
        const horariosDisponibles = await resSlots.json();

        if (horariosDisponibles.length === 0) {
            slotsDiv.innerHTML = "<p>El negocio no tiene horarios configurados.</p>";
            return;
        }

        slotsDiv.innerHTML = horariosDisponibles.map(h => {
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

// 6. Confirmar y Cancelar Citas
async function confirmarCita(hora) {
    const bizId = document.getElementById('calendarModal').dataset.bizId;
    const userId = localStorage.getItem('userId');
    const fecha = document.getElementById('appointmentDate').value;

    if (!confirm(`¿Confirmar tu cita para las ${hora}?`)) return;

    try {
        const res = await fetch(`${API_URL}/citas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cliente_id: userId, negocio_id: bizId, fecha, hora })
        });

        if (res.ok) {
            alert("✅ Cita agendada correctamente.");
            cerrarModal();
        } else {
            const error = await res.json();
            alert("Error: " + (error.error || "No se pudo agendar."));
            actualizarHorarios(); // Refrescar para ver si se ocupó el lugar
        }
    } catch (err) {
        alert("Error de conexión con el servidor.");
    }
}

async function cancelarCita(id) {
    if(!confirm("¿Deseas cancelar esta cita? (Pasará a estado eliminada)")) return;
    // Reutilizamos el endpoint genérico de cambio de estado
    const res = await fetch(`${API_URL}/citas/${id}/estado`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({estado: 'eliminada'}) });
    if(res.ok) { alert("Cita cancelada."); cargarHistorial(); }
}

function cerrarModal() {
    document.getElementById('calendarModal').style.display = 'none';
}

// INICIO ÚNICO
document.addEventListener('DOMContentLoaded', () => {
    mostrarNombreUsuario();
    cargarCategorias();
    cargarNegocios();
});