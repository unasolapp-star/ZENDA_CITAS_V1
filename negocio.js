const API_URL = "http://localhost:3000";
const duenoId = localStorage.getItem('userId');

// 1. MOSTRAR NOMBRE EN EL HEADER
async function mostrarNombreUsuario() {
    const display = document.getElementById('userNameDisplay');
    if (!duenoId || !display) return;

    try {
        const res = await fetch(`${API_URL}/usuario-nombre/${duenoId}`);
        const data = await res.json();
        if (data.nombre) {
            display.innerText = `👤 ${data.nombre}`;
        }
    } catch (err) {
        display.innerText = "Error";
    }
}

// INYECTAR Y CONTROLAR LOS DÍAS HÁBILES EN EL FORMULARIO
function inicializarDiasHabiles(diasGuardados = "") {
    const configForm = document.getElementById('businessConfig');
    if (!configForm) return;
    
    // Si el contenedor no existe, lo creamos e insertamos antes del botón Guardar
    if (!document.getElementById('dias-container')) {
        const wrapper = document.createElement('div');
        wrapper.style.marginBottom = "15px";
        wrapper.innerHTML = `
            <label style="display:block; margin-bottom:5px; font-weight:bold;">Días Disponibles:</label>
            <div id="dias-container" style="display: flex; gap: 5px; flex-wrap: wrap;">
                <button type="button" class="btn-dia" data-dia="1" style="background-color: red; color: white; padding: 8px 12px; border: none; border-radius: 4px; cursor: pointer;">Lun</button>
                <button type="button" class="btn-dia" data-dia="2" style="background-color: red; color: white; padding: 8px 12px; border: none; border-radius: 4px; cursor: pointer;">Mar</button>
                <button type="button" class="btn-dia" data-dia="3" style="background-color: red; color: white; padding: 8px 12px; border: none; border-radius: 4px; cursor: pointer;">Mié</button>
                <button type="button" class="btn-dia" data-dia="4" style="background-color: red; color: white; padding: 8px 12px; border: none; border-radius: 4px; cursor: pointer;">Jue</button>
                <button type="button" class="btn-dia" data-dia="5" style="background-color: red; color: white; padding: 8px 12px; border: none; border-radius: 4px; cursor: pointer;">Vie</button>
                <button type="button" class="btn-dia" data-dia="6" style="background-color: red; color: white; padding: 8px 12px; border: none; border-radius: 4px; cursor: pointer;">Sáb</button>
                <button type="button" class="btn-dia" data-dia="7" style="background-color: red; color: white; padding: 8px 12px; border: none; border-radius: 4px; cursor: pointer;">Dom</button>
            </div>
        `;
        const submitBtn = configForm.querySelector('button[type="submit"]');
        submitBtn ? configForm.insertBefore(wrapper, submitBtn) : configForm.appendChild(wrapper);

        // Evento para alternar colores
        document.querySelectorAll('.btn-dia').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.classList.toggle('activo');
                btn.style.backgroundColor = btn.classList.contains('activo') ? 'green' : 'red';
            });
        });
    }

    // Establecer el estado inicial basado en lo guardado en BD
    const diasArr = diasGuardados ? diasGuardados.split(',') : [];
    document.querySelectorAll('.btn-dia').forEach(btn => {
        if (diasArr.includes(btn.dataset.dia)) {
            btn.classList.add('activo');
            btn.style.backgroundColor = 'green';
        } else {
            btn.classList.remove('activo');
            btn.style.backgroundColor = 'red';
        }
    });
}

// INYECTAR Y CONTROLAR LA IMAGEN/LOGO DEL NEGOCIO
function inicializarLogo(logo_url) {
    const configForm = document.getElementById('businessConfig');
    if (!configForm) return;

    if (!document.getElementById('logo-container')) {
        const wrapper = document.createElement('div');
        wrapper.style.marginBottom = "20px";
        wrapper.innerHTML = `
            <label style="display:block; margin-bottom:5px; font-weight:bold;">Logo del Negocio:</label>
            <div id="logo-container" style="display: flex; align-items: center; gap: 15px;">
                <img id="logoPreview" src="${logo_url ? API_URL + logo_url : 'https://via.placeholder.com/150'}" alt="Logo" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; border: 1px solid #ccc;">
                <div>
                    <input type="file" id="logoInput" accept="image/*" style="display: none;">
                    <button type="button" id="btnUploadLogo" style="background-color: #2563eb; color: white; padding: 8px 12px; border: none; border-radius: 4px; cursor: pointer;">Subir / Cambiar Logo</button>
                    <p id="logoStatus" style="font-size: 12px; color: #666; margin-top: 5px;"></p>
                </div>
            </div>
        `;
        // Insertar al inicio del formulario
        configForm.insertBefore(wrapper, configForm.firstChild);

        document.getElementById('btnUploadLogo').addEventListener('click', () => document.getElementById('logoInput').click());

        document.getElementById('logoInput').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const formData = new FormData();
            formData.append('logo', file);
            document.getElementById('logoStatus').innerText = "Subiendo...";
            
            try {
                const res = await fetch(`${API_URL}/upload-logo/${duenoId}`, { method: 'POST', body: formData });
                const data = await res.json();
                if (res.ok) {
                    document.getElementById('logoPreview').src = API_URL + data.logo_url;
                    document.getElementById('logoStatus').innerText = "✅ Logo actualizado!";
                    document.getElementById('logoStatus').style.color = "green";
                } else {
                    document.getElementById('logoStatus').innerText = "❌ Error al subir";
                    document.getElementById('logoStatus').style.color = "red";
                }
            } catch (err) {
                document.getElementById('logoStatus').innerText = "Error de conexión";
            }
        });
    } else {
        document.getElementById('logoPreview').src = logo_url ? (API_URL + logo_url) : 'https://via.placeholder.com/150';
    }
}

// 2. PRECARGAR DATOS DEL NEGOCIO (Configuración)
async function cargarDatosNegocio() {
    if (!duenoId) return;
    try {
        const res = await fetch(`${API_URL}/mi-negocio/${duenoId}`);
        const data = await res.json();
        
        if (data && data.nombre_negocio) {
            // Datos generales
            document.getElementById('bizName').value = data.nombre_negocio;
            document.getElementById('bizPhone').value = data.telefono_negocio || '';
            document.getElementById('bizCategory').value = data.categoria || 'Barbería';
            
            // Dirección detallada
            document.getElementById('bizStreet').value = data.calle || '';
            document.getElementById('bizNeighborhood').value = data.colonia || '';
            document.getElementById('bizRef').value = data.referencia || '';

            // Horarios: Si MySQL manda "09:00:00", extraemos solo "09:00" para el HTML
            if (data.hora_apertura) document.getElementById('bizOpen').value = data.hora_apertura.slice(0, 5);
            if (data.hora_cierre) document.getElementById('bizClose').value = data.hora_cierre.slice(0, 5);
            if (data.intervalo_minutos) document.getElementById('bizInterval').value = data.intervalo_minutos;
            
            // Inicializar los días hábiles
            inicializarDiasHabiles(data.dias_habiles);
            // Inicializar el logo
            inicializarLogo(data.logo_url);
        }
    } catch (err) { 
        console.error("Error al precargar datos:", err); 
    }
}

// 3. ACTUALIZAR DATOS DEL NEGOCIO (LA CORRECCIÓN ESTÁ AQUÍ)
const configForm = document.getElementById('businessConfig');
if (configForm) {
    configForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Obtenemos los valores de los inputs de tiempo (ej. "09:00" o "09:00:00")
        let rawOpen = document.getElementById('bizOpen').value || "09:00";
        let rawClose = document.getElementById('bizClose').value || "18:00";
        
        // Forzamos que siempre sean exactamente 5 caracteres (HH:mm) y les pegamos los segundos exactos
        let finalOpen = rawOpen.slice(0, 5) + ":00";
        let finalClose = rawClose.slice(0, 5) + ":00";

        // Recolectar días seleccionados (los que están en verde / activos)
        const diasSeleccionados = Array.from(document.querySelectorAll('.btn-dia.activo'))
                                       .map(btn => btn.dataset.dia)
                                       .join(',');

        const datos = {
            nombre_negocio: document.getElementById('bizName').value || "",
            telefono_negocio: document.getElementById('bizPhone').value || "",
            categoria: document.getElementById('bizCategory').value || "Servicios",
            calle: document.getElementById('bizStreet').value || "",
            colonia: document.getElementById('bizNeighborhood').value || "",
            referencia: document.getElementById('bizRef').value || "",
            // Enviamos las horas ya blindadas y formateadas
            hora_apertura: finalOpen,
            hora_cierre: finalClose,
            intervalo_minutos: parseInt(document.getElementById('bizInterval').value) || 60,
            dias_habiles: diasSeleccionados
        };

        // Imprimimos en consola para que veas que ahora dice "09:00:00" perfecto
        console.log("Intentando guardar:", datos); 

        try {
            const res = await fetch(`${API_URL}/actualizar-negocio/${duenoId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });

            const respuestaServer = await res.json();

            if (res.ok) {
                alert("✅ Información del negocio actualizada correctamente.");
            } else {
                alert("❌ Error al guardar: " + (respuestaServer.error || "Revisa la consola"));
                console.error("Error desde Node:", respuestaServer);
            }
        } catch (err) { 
            console.error("Fallo de red:", err);
            alert("Error de conexión. ¿Está encendido el servidor Node.js?"); 
        }
    });
}

// 4. CARGAR TABLA DE CITAS
let paginaCitasAdmin = 1;
let estadoCitasAdmin = 'pendiente';

async function cargarCitasAdmin() {
    if (!duenoId) return;
    const contenedor = document.getElementById('adminAppointmentsList');

    try {
        const res = await fetch(`${API_URL}/citas-negocio/${duenoId}?page=${paginaCitasAdmin}&limit=10&estado=${estadoCitasAdmin}`);
        const result = await res.json();
        
        let html = `
            <div style="display:flex; gap:10px; margin-bottom:15px; overflow-x:auto;">
                ${['pendiente', 'confirmada', 'rechazada', 'hecha', 'eliminada'].map(est => `
                    <button onclick="cambiarFiltroAdmin('${est}')" style="padding:8px 12px; border:none; border-radius:5px; cursor:pointer; background:${estadoCitasAdmin === est ? '#2563eb' : '#e2e8f0'}; color:${estadoCitasAdmin === est ? 'white' : 'black'}; font-weight:bold; text-transform:capitalize;">
                        ${est}s
                    </button>
                `).join('')}
            </div>
        `;

        if (!result.data || result.data.length === 0) {
            html += `<p style="color:#64748b;">No hay citas en este apartado.</p>`;
        } else {
            html += `
                <div style="margin-bottom:10px;">
                    <button onclick="seleccionarTodasCitas()" style="padding:5px 10px; cursor:pointer; margin-right:5px; border-radius:4px; border:1px solid #ccc;">Seleccionar Todas</button>
                    ${estadoCitasAdmin !== 'eliminada' ? `<button onclick="accionLoteCitas('eliminada')" style="padding:5px 10px; cursor:pointer; background:#ef4444; color:white; border:none; border-radius:4px;">🗑️ Borrar Seleccionadas</button>` : ''}
                </div>
                <table style="width:100%; border-collapse: collapse; margin-top: 10px;">
                    <thead>
                        <tr style="background: #f1f5f9; text-align: left;">
                            <th style="padding: 10px; width:40px;"></th>
                            <th style="padding: 10px;">Fecha/Hora</th>
                            <th style="padding: 10px;">Cliente</th>
                            <th style="padding: 10px;">📞 Teléfono</th>
                            <th style="padding: 10px;">Acción</th>
                        </tr>
                    </thead>
                    <tbody>`;

            result.data.forEach(c => {
                let botones = '';
                if(estadoCitasAdmin === 'pendiente') {
                    botones = `<button onclick="cambiarEstadoCita(${c.id}, 'confirmada')" style="background:#22c55e; color:white; border:none; padding:5px 8px; border-radius:3px; cursor:pointer; margin-right:5px;">✅</button>
                               <button onclick="cambiarEstadoCita(${c.id}, 'rechazada')" style="background:#f97316; color:white; border:none; padding:5px 8px; border-radius:3px; cursor:pointer; margin-right:5px;">❌</button>`;
                } else if(estadoCitasAdmin === 'confirmada') {
                    botones = `<button onclick="cambiarEstadoCita(${c.id}, 'hecha')" style="background:#3b82f6; color:white; border:none; padding:5px 8px; border-radius:3px; cursor:pointer; margin-right:5px;">🏁 Hecha</button>`;
                }
                
                if (estadoCitasAdmin !== 'eliminada') {
                    botones += `<button onclick="cambiarEstadoCita(${c.id}, 'eliminada')" style="background:#ef4444; color:white; border:none; padding:5px 8px; border-radius:3px; cursor:pointer;">🗑️</button>`;
                }

                html += `<tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px;"><input type="checkbox" class="cita-check" value="${c.id}"></td>
                            <td style="padding: 10px;">${c.fecha} - ${c.hora}</td>
                            <td style="padding: 10px;">${c.cliente_nombre}</td>
                            <td style="padding: 10px;"><a href="tel:${c.cliente_tel}" style="color: #2563eb;">${c.cliente_tel || 'S/N'}</a></td>
                            <td style="padding: 10px;">${botones || 'Sin acciones'}</td>
                         </tr>`;
            });
            html += `</tbody></table>`;
            
            if (result.totalPages > 1) {
                html += `<div style="margin-top:15px; display:flex; justify-content:center; gap:10px; align-items:center;">
                    ${result.page > 1 ? `<button onclick="cambiarPaginaAdmin(${result.page - 1})" style="padding:5px 10px;">Anterior</button>` : ''}
                    <span style="font-weight:bold;">Página ${result.page} de ${result.totalPages}</span>
                    ${result.page < result.totalPages ? `<button onclick="cambiarPaginaAdmin(${result.page + 1})" style="padding:5px 10px;">Siguiente</button>` : ''}
                </div>`;
            }
        }
        contenedor.innerHTML = html;

    } catch (err) {
        console.error("Error al cargar citas:", err);
        if (contenedor) contenedor.innerHTML = "<p>Error al cargar la lista de citas.</p>";
    }
}

function cambiarFiltroAdmin(estado) { estadoCitasAdmin = estado; paginaCitasAdmin = 1; cargarCitasAdmin(); }
function cambiarPaginaAdmin(pag) { paginaCitasAdmin = pag; cargarCitasAdmin(); }
function seleccionarTodasCitas() { document.querySelectorAll('.cita-check').forEach(cb => cb.checked = true); }

async function cambiarEstadoCita(id, estado) {
    if(estado === 'eliminada' && !confirm("¿Seguro que deseas eliminar esta cita? (Se purgará en 3 días)")) return;
    try {
        await fetch(`${API_URL}/citas/${id}/estado`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({estado}) });
        cargarCitasAdmin();
    } catch(e) { alert("Error de conexión"); }
}

async function accionLoteCitas(estado) {
    const ids = Array.from(document.querySelectorAll('.cita-check:checked')).map(cb => cb.value);
    if(ids.length === 0) return alert("Selecciona al menos una cita de la lista.");
    if(!confirm(`¿Aplicar acción a las ${ids.length} citas seleccionadas?`)) return;
    try {
        await fetch(`${API_URL}/citas/batch-estado`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ids, estado}) });
        cargarCitasAdmin();
    } catch(e) { alert("Error de conexión"); }
}

// 6. INICIO ÚNICO AL CARGAR EL DOM
document.addEventListener('DOMContentLoaded', () => {
    mostrarNombreUsuario();
    cargarDatosNegocio();
    cargarCitasAdmin();
});