const API_URL = "";
const duenoId = sessionStorage.getItem('userId');

// Variables para el mapa
let map, marker;
let selectedLat = 18.46222; // Coordenadas por defecto de Santiago Tuxtla
let selectedLng = -95.30138;

// 1. MOSTRAR NOMBRE EN EL HEADER
async function mostrarNombreUsuario() {
    const display = document.getElementById('userNameDisplay');
    if (!duenoId || !display) return;

    try {
        const res = await fetch(`${API_URL}/usuario-nombre/${duenoId}`);
        const data = await res.json();
        if (data.nombre) {
            display.innerText = `👤 ${data.nombre}`;
            display.style.cursor = 'pointer';
            display.title = 'Ver mi perfil';
            display.onclick = abrirPerfil;
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

// INICIALIZAR EL MAPA
function inicializarMapa() {
    if (map) return;
    map = L.map('mapa-negocio').setView([selectedLat, selectedLng], 15);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);

    marker = L.marker([selectedLat, selectedLng], { draggable: true }).addTo(map);
    marker.on('dragend', function (e) {
        const position = marker.getLatLng();
        selectedLat = position.lat;
        selectedLng = position.lng;
    });
}

// VARIABLE Y FUNCIÓN PARA CONTROLAR EL MODO EDICIÓN
let isEditingMode = false;
function toggleEditMode(state) {
    isEditingMode = state !== undefined ? state : !isEditingMode;
    
    const configForm = document.getElementById('businessConfig');
    if (!configForm) return;

    // Bloquear/Desbloquear inputs y selects
    configForm.querySelectorAll('input, select, textarea').forEach(el => el.disabled = !isEditingMode);
    
    // Bloquear botones dinámicos (Días y Logo)
    configForm.querySelectorAll('.btn-dia, #btnUploadLogo').forEach(btn => {
        btn.disabled = !isEditingMode;
        btn.style.opacity = isEditingMode ? "1" : "0.6";
        btn.style.cursor = isEditingMode ? "pointer" : "not-allowed";
    });

    // Bloquear el pin del mapa
    if (marker) marker.dragging[isEditingMode ? 'enable' : 'disable']();

    // Cambiar estado del botón principal
    const btnToggle = document.getElementById('btnToggleEdit');
    if (btnToggle) {
        btnToggle.type = isEditingMode ? "submit" : "button";
        btnToggle.innerHTML = isEditingMode ? "💾 Guardar Cambios" : "⚙️ Modificar datos del negocio";
        btnToggle.style.backgroundColor = isEditingMode ? "#2563eb" : "#475569";
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
            
            // Horarios: Si MySQL manda "09:00:00", extraemos solo "09:00" para el HTML
            if (data.hora_apertura) document.getElementById('bizOpen').value = data.hora_apertura.slice(0, 5);
            if (data.hora_cierre) document.getElementById('bizClose').value = data.hora_cierre.slice(0, 5);
            if (data.intervalo_minutos) document.getElementById('bizInterval').value = data.intervalo_minutos;
            
            // Inicializar los días hábiles
            inicializarDiasHabiles(data.dias_habiles);
            // Inicializar el logo
            inicializarLogo(data.logo_url);
            
            // Actualizar coordenadas si existen
            if (data.latitud && data.longitud) {
                selectedLat = parseFloat(data.latitud);
                selectedLng = parseFloat(data.longitud);
            }
            inicializarMapa();
            if (marker) {
                marker.setLatLng([selectedLat, selectedLng]);
                map.setView([selectedLat, selectedLng], 15);
            }
            
            // Bloqueamos el formulario una vez que se carga la información
            toggleEditMode(false);
        }
    } catch (err) { 
        console.error("Error al precargar datos:", err); 
    }
}

// 2.5 VALIDACIÓN EN TIEMPO REAL DEL TELÉFONO (SOLO NÚMEROS)
const bizPhoneInput = document.getElementById('bizPhone');
if (bizPhoneInput) {
    bizPhoneInput.addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, '').slice(0, 10);
    });
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

        const telefonoValidado = document.getElementById('bizPhone').value;
        if (telefonoValidado && telefonoValidado.length !== 10) {
            await customAlert("El número de teléfono del negocio debe tener exactamente 10 dígitos.", "#ef4444");
            return; // Detiene el guardado si no cumple
        }

        const datos = {
            nombre_negocio: document.getElementById('bizName').value || "",
            telefono_negocio: telefonoValidado || "",
            categoria: document.getElementById('bizCategory').value || "Servicios",
            latitud: selectedLat,
            longitud: selectedLng,
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
                await customAlert("✅ Información del negocio actualizada correctamente.", "#22c55e");
                toggleEditMode(false); // Volvemos a bloquear los datos tras guardar
            } else {
                await customAlert("❌ Error al guardar: " + (respuestaServer.error || "Revisa la consola"), "#ef4444");
                console.error("Error desde Node:", respuestaServer);
            }
        } catch (err) { 
            console.error("Fallo de red:", err);
            await customAlert("Error de conexión. ¿Está encendido el servidor Node.js?", "#ef4444"); 
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
    if(estado === 'eliminada') {
        const confirmar = await customConfirm("¿Seguro que deseas eliminar esta cita? (Se eliminará para siempre dentro de 3 días)", "Sí, eliminar", "#ef4444");
        if (!confirmar) return;
    }
    try {
        await fetch(`${API_URL}/citas/${id}/estado`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({estado}) });
        cargarCitasAdmin();
    } catch(e) { await customAlert("Error de conexión", "#ef4444"); }
}

async function accionLoteCitas(estado) {
    const ids = Array.from(document.querySelectorAll('.cita-check:checked')).map(cb => cb.value);
    if(ids.length === 0) {
        await customAlert("Selecciona al menos una cita de la lista.", "#ef4444");
        return;
    }
    
    const confirmar = await customConfirm(`¿Aplicar acción a las ${ids.length} citas seleccionadas?`, "Aplicar", "#3b82f6");
    if(!confirmar) return;

    try {
        await fetch(`${API_URL}/citas/batch-estado`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ids, estado}) });
        cargarCitasAdmin();
    } catch(e) { await customAlert("Error de conexión", "#ef4444"); }
}

// 5. GESTIÓN DE PERFIL Y CUENTA
async function abrirPerfil() {
    const id = sessionStorage.getItem('userId');
    if (!id) return;
    try {
        const res = await fetch(`${API_URL}/usuario/${id}`);
        const data = await res.json();
        
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

// 5.5 MODAL DE CONFIRMACIÓN PERSONALIZADO
function customConfirm(mensaje, textoConfirmar = "Sí, continuar", colorConfirmar = "#ef4444") {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:10000; backdrop-filter:blur(4px);";
        
        const modal = document.createElement('div');
        modal.style.cssText = "background:white; padding:25px; border-radius:12px; max-width:400px; width:90%; text-align:center; box-shadow:0 10px 25px rgba(0,0,0,0.2); animation:slideDown 0.3s ease-out;";
        
        const icon = document.createElement('div');
        icon.innerHTML = "⚠️";
        icon.style.cssText = "font-size:40px; margin-bottom:10px;";
        
        const texto = document.createElement('p');
        texto.innerText = mensaje;
        texto.style.cssText = "margin-bottom:20px; color:#1e293b; font-size:1.05rem; line-height:1.5;";
        
        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = "display:flex; justify-content:center; gap:10px;";
        
        const btnCancel = document.createElement('button');
        btnCancel.innerText = "Cancelar";
        btnCancel.style.cssText = "padding:10px 15px; border:none; border-radius:8px; background:#e2e8f0; color:#475569; font-weight:bold; cursor:pointer; flex:1;";
        btnCancel.onclick = () => { document.body.removeChild(overlay); resolve(false); };
        
        const btnConfirm = document.createElement('button');
        btnConfirm.innerText = textoConfirmar;
        btnConfirm.style.cssText = `padding:10px 15px; border:none; border-radius:8px; background:${colorConfirmar}; color:white; font-weight:bold; cursor:pointer; flex:1;`;
        btnConfirm.onclick = () => { document.body.removeChild(overlay); resolve(true); };
        
        btnContainer.appendChild(btnCancel);
        btnContainer.appendChild(btnConfirm);
        modal.appendChild(icon);
        modal.appendChild(texto);
        modal.appendChild(btnContainer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    });
}

async function eliminarCuenta() {
    const confirmar1 = await customConfirm("¿Estás seguro de que deseas eliminar tu cuenta? Esta acción no se puede deshacer.", "Eliminar cuenta", "#ef4444");
    if (!confirmar1) return;
    
    const confirmar2 = await customConfirm("ADVERTENCIA FINAL: Si eliminas tu cuenta, se borrará TODO tu negocio y las citas agendadas de forma permanente. ¿Deseas continuar?", "Sí, borrar todo", "#ef4444");
    if (!confirmar2) return;
    
    const id = sessionStorage.getItem('userId');
    try {
        const res = await fetch(`${API_URL}/usuario/${id}`, { method: 'DELETE' });
        if (res.ok) {
            await customAlert("Cuenta eliminada exitosamente. Lamentamos verte partir.", "#22c55e");
            sessionStorage.clear();
            window.location.href = 'index.html';
        } else { await customAlert("Error al eliminar la cuenta.", "#ef4444"); }
    } catch (err) { await customAlert("Error de conexión al intentar eliminar la cuenta.", "#ef4444"); }
}

// 6. ALERTA PERSONALIZADA
function customAlert(mensaje, colorBoton = "#2563eb") {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:10000; backdrop-filter:blur(4px);";
        
        const modal = document.createElement('div');
        modal.style.cssText = "background:white; padding:25px; border-radius:12px; max-width:400px; width:90%; text-align:center; box-shadow:0 10px 25px rgba(0,0,0,0.2); animation:slideDown 0.3s ease-out;";
        
        const icon = document.createElement('div');
        icon.innerHTML = "ℹ️";
        icon.style.cssText = "font-size:40px; margin-bottom:10px;";
        
        const texto = document.createElement('p');
        texto.innerText = mensaje;
        texto.style.cssText = "margin-bottom:20px; color:#1e293b; font-size:1.05rem; line-height:1.5;";
        
        const btnConfirm = document.createElement('button');
        btnConfirm.innerText = "Aceptar";
        btnConfirm.style.cssText = `padding:10px 15px; border:none; border-radius:8px; background:${colorBoton}; color:white; font-weight:bold; cursor:pointer; width:100%;`;
        btnConfirm.onclick = () => { document.body.removeChild(overlay); resolve(); };
        
        modal.appendChild(icon);
        modal.appendChild(texto);
        modal.appendChild(btnConfirm);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    });
}

// 6. INICIO ÚNICO AL CARGAR EL DOM
document.addEventListener('DOMContentLoaded', () => {
    mostrarNombreUsuario();
    cargarDatosNegocio();
    cargarCitasAdmin();
    
    // Bloqueo inicial rápido antes de que responda la BD
    toggleEditMode(false);

    // Asignar el evento al botón de Modificar / Guardar
    const btnToggleEdit = document.getElementById('btnToggleEdit');
    if (btnToggleEdit) {
        btnToggleEdit.addEventListener('click', (e) => {
            if (!isEditingMode) { e.preventDefault(); toggleEditMode(true); }
        });
    }
});