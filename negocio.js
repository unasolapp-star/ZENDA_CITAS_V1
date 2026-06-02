const API_URL = ""; // Ruta base de la API, vacío significa que se comunica al mismo dominio donde está desplegada (Ej. Railway)
const duenoId = sessionStorage.getItem('userId'); // Rescata de la RAM temporal del navegador el ID del usuario en sesión

// Variables globales para la manipulación del mapa
let map, marker; // Referencias persistentes para instanciar la librería de Leaflet
let selectedLat = 18.46222; // Latitud geoespacial por defecto (Apunta a Santiago Tuxtla)
let selectedLng = -95.30138; // Longitud geoespacial por defecto (Apunta a Santiago Tuxtla)

// 1. MOSTRAR NOMBRE EN LA BARRA DE NAVEGACIÓN (HEADER)
async function mostrarNombreUsuario() { // Petición asíncrona para saludar al dueño del negocio
    const display = document.getElementById('userNameDisplay'); // Busca el texto marcador en el DOM
    if (!duenoId || !display) return; // Si no hay usuario logueado o elemento en el HTML, interrumpe

    try { // Empieza bloque para atrapar caídas de red
        const res = await fetch(`${API_URL}/usuario-nombre/${duenoId}`); // Llama a la base de datos solicitando el nombre
        const data = await res.json(); // Serializa la promesa a un Objeto
        if (data.nombre) { // Si el servidor respondió con un nombre real
            display.innerText = `👤 ${data.nombre}`; // Se imprime concatenado a un icono
            display.style.cursor = 'pointer'; // Refuerzo UX de que el nombre es clicable
            display.title = 'Ver mi perfil'; // Añade la tooltip que flota al mantener presionado
            display.onclick = abrirPerfil; // Si le dan clic, dispara la función de ver los datos propios
        }
    } catch (err) { // Si Node.js está caído
        display.innerText = "Error"; // Indica falla sin crashear el navegador
    }
}

// INYECTOR AUTOMÁTICO DE LOS DÍAS HÁBILES DENTRO DEL FORMULARIO DE EDICIÓN
function inicializarDiasHabiles(diasGuardados = "") { // Despliega la botonera de la semana
    const configForm = document.getElementById('businessConfig'); // Selecciona la tarjeta principal de configuración
    if (!configForm) return; // Salida rápida
    
    // Evita duplicar el código HTML si el usuario da múltiples veces al botón
    if (!document.getElementById('dias-container')) { // Valida existencia
        const wrapper = document.createElement('div'); // Contenedor vacío
        wrapper.style.marginBottom = "15px"; // Espaciador
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
        `; // Maqueta HTML cruda inyectada para representar 7 días por su número correspondiente
        const submitBtn = configForm.querySelector('button[type="submit"]'); // Ubica al botón final "Guardar Cambios"
        submitBtn ? configForm.insertBefore(wrapper, submitBtn) : configForm.appendChild(wrapper); // Se encaja justo antes del botón

        // Motor para prender y apagar los días como si fueran interruptores
        document.querySelectorAll('.btn-dia').forEach(btn => { // Registra evento sobre la colección de 7
            btn.addEventListener('click', () => { // Intercepción de evento al clickear
                btn.classList.toggle('activo'); // Pone y quita el identificador de activo internamente
                btn.style.backgroundColor = btn.classList.contains('activo') ? 'green' : 'red'; // Modifica CSS para pintar de verde o regresar a rojo
            });
        });
    }

    // Fase 2: Configurar los botones recién inyectados según lo que diga MySQL
    const diasArr = diasGuardados ? diasGuardados.split(',') : []; // Transforma cadena plana "1,3,5" en Array JS
    document.querySelectorAll('.btn-dia').forEach(btn => { // Reitera los botones ya construidos
        if (diasArr.includes(btn.dataset.dia)) { // Evalúa de uno en uno si viene en la matriz
            btn.classList.add('activo'); // Lo prende
            btn.style.backgroundColor = 'green'; // Le asigna color visual
        } else { // Si no
            btn.classList.remove('activo'); // Lo desactiva
            btn.style.backgroundColor = 'red'; // Pasa a cerrado
        }
    });
}

// INYECTOR AUTOMÁTICO DE HERRAMIENTA SUBIDA DE LOGO
function inicializarLogo(logo_url) { // Configura un pseudo-formulario de imágenes vía Multer
    const configForm = document.getElementById('businessConfig'); // Referencia general
    if (!configForm) return; // Control de falla

    if (!document.getElementById('logo-container')) { // Crea solo si aún no existe en árbol DOM
        const wrapper = document.createElement('div'); // Contenedor vacío
        wrapper.style.marginBottom = "20px"; // Margen
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
        `; // Plantilla que oculta un 'input type="file"' tradicional e implementa un botón azul que fingirá presionarlo
        
        // Operación atómica de encaje de inicio
        configForm.insertBefore(wrapper, configForm.firstChild); // Lo clava hasta el tope de la carta

        document.getElementById('btnUploadLogo').addEventListener('click', () => document.getElementById('logoInput').click()); // Hack para que al tocar botón azul se abra buscador de archivos

        document.getElementById('logoInput').addEventListener('change', async (e) => { // Gatillo al cambiar el archivo (Al elegir una foto)
            const file = e.target.files[0]; // Intercepta el buffer binario del archivo
            if (!file) return; // Si no seleccionó nada corta
            
            const formData = new FormData(); // Ensamblador Multipart (Especial para subidas a express/multer)
            formData.append('logo', file); // Embala con key 'logo'
            document.getElementById('logoStatus').innerText = "Subiendo..."; // Cambio visual estado 1
            
            try { // Petición asíncrona hacia multer/sharp
                const res = await fetch(`${API_URL}/upload-logo/${duenoId}`, { method: 'POST', body: formData }); // Envío masivo
                const data = await res.json(); // Desencripta JSON
                if (res.ok) { // Éxito
                    document.getElementById('logoPreview').src = API_URL + data.logo_url; // Pega URL retonada sobre previsualizador en miniatura
                    document.getElementById('logoStatus').innerText = "✅ Logo actualizado!"; // Estado 2
                    document.getElementById('logoStatus').style.color = "green"; // Color texto
                } else { // Falla de Multer/Sharp
                    document.getElementById('logoStatus').innerText = "❌ Error al subir"; // Estatus Error
                    document.getElementById('logoStatus').style.color = "red"; // Tinte
                }
            } catch (err) { // Network abort
                document.getElementById('logoStatus').innerText = "Error de conexión"; // Network abort
            }
        });
    } else { // Actualización parcial si no se generó el código
        document.getElementById('logoPreview').src = logo_url ? (API_URL + logo_url) : 'https://via.placeholder.com/150'; // Refresco simple
    }
}

// ARRANCADOR DE MOTOR DE LEAFLET
function inicializarMapa() { // Creador del canvas
    if (map) return; // Si la variable ya contiene data no se sobreescribe
    map = L.map('mapa-negocio').setView([selectedLat, selectedLng], 15); // Instanciación nativa: L.map(id).setView([y, x], zoom)
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { // Consumo de azulejos visuales OpenSource
        attribution: '© OpenStreetMap' // Créditos obligatorios
    }).addTo(map); // Concatena render

    marker = L.marker([selectedLat, selectedLng], { draggable: true }).addTo(map); // Declara el Pin Azul que se puede arrastrar
    marker.on('dragend', function (e) { // Gatillo al soltar el ratón tras mover el Pin
        const position = marker.getLatLng(); // Calcula métricas en vivo
        selectedLat = position.lat; // Parcha global lat
        selectedLng = position.lng; // Parcha global lon
    });
}

// INTERRUPTOR DE SEGURIDAD (MODO LECTURA VS MODO EDICIÓN)
let isEditingMode = false; // Estado global para prevenir cambios por error
function toggleEditMode(state) { // Inhabilitador de formulario
    isEditingMode = state !== undefined ? state : !isEditingMode; // Recibimiento forzado o comportamiento 'Toggle' (Alternador)
    
    const configForm = document.getElementById('businessConfig'); // Ámbito delimitado
    if (!configForm) return; // Checkeo rápido

    // Desactiva o reactiva inputs usando DOM iterativo
    configForm.querySelectorAll('input, select, textarea').forEach(el => el.disabled = !isEditingMode); // Traba física del navegador
    
    // Pone en gris los sub-componentes (Logo y Días)
    configForm.querySelectorAll('.btn-dia, #btnUploadLogo').forEach(btn => { // Caza selectores por tag o ID
        btn.disabled = !isEditingMode; // Deshabilita
        btn.style.opacity = isEditingMode ? "1" : "0.6"; // Efecto visual semi-transparente
        btn.style.cursor = isEditingMode ? "pointer" : "not-allowed"; // Señaléctica visual "bloqueado" en ratón
    });

    // Asegura el componente ajeno (Mapa de Leaflet)
    if (marker) marker.draggingisEditingMode ? 'enable' : 'disable'; // Le prohíbe calcular el 'dragend' bloqueando el pin

    // Cambia la naturaleza y apariencia del botón grande inferior
    const btnToggle = document.getElementById('btnToggleEdit'); // Agarra referencia
    if (btnToggle) { // Condicional
        btnToggle.type = isEditingMode ? "submit" : "button"; // Solo lanza petición HTTP (submit) cuando esté encendido, sino será un falso botón que dispara esta misma función.
        btnToggle.innerHTML = isEditingMode ? "💾 Guardar Cambios" : "⚙️ Modificar datos del negocio"; // Texto alterable
        btnToggle.style.backgroundColor = isEditingMode ? "#2563eb" : "#475569"; // Color Azul brillante vs Gris Neutro
    }
}

// 2. CONSUMO DE BASE DE DATOS INICIAL (SE SETEA EL ENTORNO)
async function cargarDatosNegocio() { // Carga todo el bloque de MySQL a la pantalla del administrador
    if (!duenoId) return; // Rompe si no estamos autorizados
    try { // Bloque vigilante
        const res = await fetch(`${API_URL}/mi-negocio/${duenoId}`); // Recopila de ruta custom
        const data = await res.json(); // Transformador
        
        if (data && data.nombre_negocio) { // Condicional si no devolvió nulos MySQL
            // Auto-Fill Textos Planos
            document.getElementById('bizName').value = data.nombre_negocio; // Sobreescribe input Nombre
            document.getElementById('bizPhone').value = data.telefono_negocio || ''; // Sobreescribe input Telefono
            document.getElementById('bizCategory').value = data.categoria || 'Barbería'; // Elige dropdown Categoría
            
            // Horarios: Recorta (slice) el crudo SQL a tamaño visible HTML5 (type="time")
            if (data.hora_apertura) document.getElementById('bizOpen').value = data.hora_apertura.slice(0, 5); // Ej. 09:00:00 -> 09:00
            if (data.hora_cierre) document.getElementById('bizClose').value = data.hora_cierre.slice(0, 5); // Cierre
            if (data.intervalo_minutos) document.getElementById('bizInterval').value = data.intervalo_minutos; // Límite bloque de tiempo
            
            // Funciones inyectoras en cadena
            inicializarDiasHabiles(data.dias_habiles); // Pinta semana
            inicializarLogo(data.logo_url); // Muestra miniatura
            
            // Configuración del API Cartográfico
            if (data.latitud && data.longitud) { // Solo si tiene registro de dirección local
                selectedLat = parseFloat(data.latitud); // Caza flotante
                selectedLng = parseFloat(data.longitud); // Caza flotante
            }
            inicializarMapa(); // Lanza script Leaflet
            if (marker) { // Si instanció de manera exitosa
                marker.setLatLng([selectedLat, selectedLng]); // Mueve el pin duro a este punto
                map.setView([selectedLat, selectedLng], 15); // Aterriza la cámara (SetView) encima del pin con Zoom en 15.
            }
            
            // Candado Preventivo
            toggleEditMode(false); // Dispara el candado en modo Inhabilitado hasta que pulsen el botón explícitamente
        }
    } catch (err) { // Network
        console.error("Error al precargar datos:", err); // Error en navegador
    }
}

// 2.5 CORTAFUEGO RESTRICCIÓN DE TECLADO (Expresiones Regulares)
const bizPhoneInput = document.getElementById('bizPhone'); // Referencia del teléfono
if (bizPhoneInput) { // Si existe el elemento
    bizPhoneInput.addEventListener('input', function () { // Durante el 'tipeo' del teclado
        this.value = this.value.replace(/\D/g, '').slice(0, 10); // Borra cualquier cosa que no sea número \D de inmediato y corta hasta el carácter 10
    });
}

// 3. EMPAQUETADOR DE ENVÍO DE DATOS
const configForm = document.getElementById('businessConfig'); // Ubica form
if (configForm) { // Validamos 
    configForm.addEventListener('submit', async (e) => { // Al presionar botón Azul (Estando activada la edición)
        e.preventDefault(); // Desactiva recarga de la web natural al hacer 'submit'
        
        // Obtiene información binaria o en crudo del HTML
        let rawOpen = document.getElementById('bizOpen').value || "09:00"; // Agarra hora inicial o forzar '09'
        let rawClose = document.getElementById('bizClose').value || "18:00"; // Agarra hora final
        
        // Lógica Matemática de acople MySQL (Forza a estándar de 5 letras 'HH:MM' e inyecta segundos fantasma ':00')
        let finalOpen = rawOpen.slice(0, 5) + ":00"; // Convierte "09:00" a "09:00:00" validando MySQL Time
        let finalClose = rawClose.slice(0, 5) + ":00"; // Final

        // Mapeo Condicional: Extraer arreglo complejo del DOM y volverlo string plano
        const diasSeleccionados = Array.from(document.querySelectorAll('.btn-dia.activo')) // Extrae botones verdes activos a array iterable
                                       .map(btn => btn.dataset.dia) // Toma su índice de memoria numérico
                                       .join(','); // Genera salida parecida a "1,3,4,5" lista para DB

        const telefonoValidado = document.getElementById('bizPhone').value; // Recupera teléfono
        if (telefonoValidado && telefonoValidado.length !== 10) { // Si hay texto pero es de diferente medida a celular MX
            await customAlert("El número de teléfono del negocio debe tener exactamente 10 dígitos.", "#ef4444"); // Rechaza en pantalla
            return; // Sale y trunca
        }

        // JSON Builder (Estructura Objeto a Enviar)
        const datos = { // Cuerpo del payload HTTP 
            nombre_negocio: document.getElementById('bizName').value || "", // Nombre string
            telefono_negocio: telefonoValidado || "", // Telefono entero/string
            categoria: document.getElementById('bizCategory').value || "Servicios", // Selector categoría
            latitud: selectedLat, // Flotante lat
            longitud: selectedLng, // Flotante lon
            hora_apertura: finalOpen, // Parseado arriba
            hora_cierre: finalClose, // Parseado arriba
            intervalo_minutos: parseInt(document.getElementById('bizInterval').value) || 60, // Numérico forzado de minutos
            dias_habiles: diasSeleccionados // String plano
        }; // Termina Obj

        console.log("Intentando guardar:", datos);  // Depurador Front

        try { // Trata de conectar
            const res = await fetch(`${API_URL}/actualizar-negocio/${duenoId}`, { // Endpoint PUT
                method: 'PUT', // Estándar para actualización completa
                headers: { 'Content-Type': 'application/json' }, // Declara JSON payload
                body: JSON.stringify(datos) // Envía serializado el Builder de arriba
            }); // Res

            const respuestaServer = await res.json(); // Desencripta la info

            if (res.ok) { // Éxito Operativo 200 HTTP
                await customAlert("✅ Información del negocio actualizada correctamente.", "#22c55e"); // Alerta confirmación
                toggleEditMode(false); // Refresca en reversa y bloquea toda la tarjeta automáticamente para asegurar
            } else { // Falla Operativa Base de datos
                await customAlert("❌ Error al guardar: " + (respuestaServer.error || "Revisa la consola"), "#ef4444"); // Visualiza problema
                console.error("Error desde Node:", respuestaServer); // Console Dev
            }
        } catch (err) { // Network abort
            console.error("Fallo de red:", err); // Network abort log
            await customAlert("Error de conexión. ¿Está encendido el servidor Node.js?", "#ef4444"); // Network abort Visual
        }
    });
}

// 4. MOTOR PARA MANEJO DE TABLAS Y REPORTES DE CITAS (Gráfico visual para Dueño)
let paginaCitasAdmin = 1; // Manejador index paginación
let estadoCitasAdmin = 'pendiente'; // Estatus por defecto

async function cargarCitasAdmin() { // Función renderizadora
    if (!duenoId) return; // Rompe flujo sin permisos
    const contenedor = document.getElementById('adminAppointmentsList'); // Agarra panel en blanco

    try { // Llama al servidor
        const res = await fetch(`${API_URL}/citas-negocio/${duenoId}?page=${paginaCitasAdmin}&limit=10&estado=${estadoCitasAdmin}`); // Filtrador mediante Query Vars ? &
        const result = await res.json(); // Serializador a objeto
        
        // Constructor de FlexBox dinámico de 5 botones interactivos para manejar los estatus.
        let html = ` 
            <div style="display:flex; gap:10px; margin-bottom:15px; overflow-x:auto;"> 
                ${['pendiente', 'confirmada', 'rechazada', 'hecha', 'eliminada'].map(est => ` 
                    <button onclick="cambiarFiltroAdmin('${est}')" style="padding:8px 12px; border:none; border-radius:5px; cursor:pointer; background:${estadoCitasAdmin === est ? '#2563eb' : '#e2e8f0'}; color:${estadoCitasAdmin === est ? 'white' : 'black'}; font-weight:bold; text-transform:capitalize;"> 
                        ${est}s 
                    </button> 
                `).join('')} 
            </div> 
        `; // Cierra plantilla de botones superior

        if (!result.data || result.data.length === 0) { // Falla de retorno DB vacía
            html += `<p style="color:#64748b;">No hay citas en este apartado.</p>`; // Inserta alerta y nada más
        } else { // Si sí trajo información
            // Arma el cabecero thead superior visual de la tabla e inserta barra de selección total
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
                    <tbody>`; // Prepara terreno para el 'map' del cuerpo (tbody)

            result.data.forEach(c => { // Itera línea tras línea de la Base de datos
                let botones = ''; // Variable de acumulación de botones visuales
                if(estadoCitasAdmin === 'pendiente') { // Render condicional de botones basado en pestaña elegida
                    botones = `<button onclick="cambiarEstadoCita(${c.id}, 'confirmada')" style="background:#22c55e; color:white; border:none; padding:5px 8px; border-radius:3px; cursor:pointer; margin-right:5px;">✅</button> 
                               <button onclick="cambiarEstadoCita(${c.id}, 'rechazada')" style="background:#f97316; color:white; border:none; padding:5px 8px; border-radius:3px; cursor:pointer; margin-right:5px;">❌</button>`; // Botones de Aceptar o Rechazar Cita
                } else if(estadoCitasAdmin === 'confirmada') { // Pestaña 2
                    botones = `<button onclick="cambiarEstadoCita(${c.id}, 'hecha')" style="background:#3b82f6; color:white; border:none; padding:5px 8px; border-radius:3px; cursor:pointer; margin-right:5px;">🏁 Hecha</button>`; // Botón extra que marca terminada la sesión
                } 
                
                if (estadoCitasAdmin !== 'eliminada') { // Todas las pestañas menos la papelera
                    botones += `<button onclick="cambiarEstadoCita(${c.id}, 'eliminada')" style="background:#ef4444; color:white; border:none; padding:5px 8px; border-radius:3px; cursor:pointer;">🗑️</button>`; // Inyección del ícono papelera general
                } // Cierre condicional visual

                // Ensamble interno final por cada línea usando la inyección anterior
                html += `<tr style="border-bottom: 1px solid #eee;"> 
                            <td style="padding: 10px;"><input type="checkbox" class="cita-check" value="${c.id}"></td> 
                            <td style="padding: 10px;">${c.fecha} - ${c.hora}</td> 
                            <td style="padding: 10px;">${c.cliente_nombre}</td> 
                            <td style="padding: 10px;"><a href="tel:${c.cliente_tel}" style="color: #2563eb;">${c.cliente_tel || 'S/N'}</a></td> 
                            <td style="padding: 10px;">${botones || 'Sin acciones'}</td> 
                         </tr>`; 
            }); // Fin ciclo línea x línea
            html += `</tbody></table>`; // Cierre tabla total
            
            // Creador visual de botones para paginación inferior general
            if (result.totalPages > 1) { // Lógica
                html += `<div style="margin-top:15px; display:flex; justify-content:center; gap:10px; align-items:center;"> 
                    ${result.page > 1 ? `<button onclick="cambiarPaginaAdmin(${result.page - 1})" style="padding:5px 10px;">Anterior</button>` : ''} 
                    <span style="font-weight:bold;">Página ${result.page} de ${result.totalPages}</span> 
                    ${result.page < result.totalPages ? `<button onclick="cambiarPaginaAdmin(${result.page + 1})" style="padding:5px 10px;">Siguiente</button>` : ''} 
                </div>`; // Lógica
            } // Cierre
        } // Cierre total if existían resultados 
        contenedor.innerHTML = html; // Reemplazo destructor absoluto contra el HTML original

    } catch (err) { // Network
        console.error("Error al cargar citas:", err); // Network log
        if (contenedor) contenedor.innerHTML = "<p>Error al cargar la lista de citas.</p>"; // Visual log abortado
    } // Try catch End
} // Function End

// Utilidades diminutas y atajos para recarga de pantalla rápida
function cambiarFiltroAdmin(estado) { estadoCitasAdmin = estado; paginaCitasAdmin = 1; cargarCitasAdmin(); } // Refresca variable filtro
function cambiarPaginaAdmin(pag) { paginaCitasAdmin = pag; cargarCitasAdmin(); } // Refresca variable paginador
function seleccionarTodasCitas() { document.querySelectorAll('.cita-check').forEach(cb => cb.checked = true); } // Activa casillas CheckBox nativamente JS

// Creador asíncrono para mutar campos 1 a 1 de forma individual
async function cambiarEstadoCita(id, estado) { // Disparador HTTP PUT
    if(estado === 'eliminada') { // Filtro para preguntar en el modal solo ante caídas graves como eliminación
        const confirmar = await customConfirm("¿Seguro que deseas eliminar esta cita? (Se eliminará para siempre dentro de 3 días)", "Sí, eliminar", "#ef4444"); // Abre Custom Modal Utility
        if (!confirmar) return; // Rompe si dice no
    } // Cierre
    try { // Envío
        await fetch(`${API_URL}/citas/${id}/estado`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({estado}) }); // URL paramétrica dinámica
        cargarCitasAdmin(); // Auto-Refresco transparente sin parpadeo de pantalla tras enviar
    } catch(e) { await customAlert("Error de conexión", "#ef4444"); } // Network Log
} // Fin disparador 1 a 1

// Controlador macro para mutar listas masivas de IDs de un solo golpe
async function accionLoteCitas(estado) { // Disparador Batch
    const ids = Array.from(document.querySelectorAll('.cita-check:checked')).map(cb => cb.value); // Crea array complejo usando nodos DOM interactuados
    if(ids.length === 0) { // Rechazo si el array es vacío
        await customAlert("Selecciona al menos una cita de la lista.", "#ef4444"); // Aviso nulo
        return; // Retorno de fallo
    } // Cierre
    
    const confirmar = await customConfirm(`¿Aplicar acción a las ${ids.length} citas seleccionadas?`, "Aplicar", "#3b82f6"); // Alerta preventiva
    if(!confirmar) return; // Ruptura

    try { // Envío macro
        await fetch(`${API_URL}/citas/batch-estado`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ids, estado}) }); // Pega array a endpoint masivo
        cargarCitasAdmin(); // Auto-Refresco transparente de pantalla
    } catch(e) { await customAlert("Error de conexión", "#ef4444"); } // Falla
} // Cierra

// 5. CREADOR MODAL E INYECTOR DE PERFIL PROPIO (ID DE SESIÓN)
async function abrirPerfil() { // Func. UI / Data
    const id = sessionStorage.getItem('userId'); // Rescata id de ram
    if (!id) return; // Escape si no
    try { // Bloque
        const res = await fetch(`${API_URL}/usuario/${id}`); // Solicita metadata base al server 
        const data = await res.json(); // Serializador objeto
        
        let modal = document.getElementById('perfilModal'); // Búsqueda de elemento
        if (!modal) { // Inyector de instancia al vuelo para no poluir el DOM desde inicio si el user jamás abre su perfil
            modal = document.createElement('div'); // Crea Div
            modal.id = 'perfilModal'; // Le asigna ID
            modal.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999;"; // Estilos modal sombra
            document.body.appendChild(modal); // Fija elemento
        } // Cierra if
        
        // Ensamble interno de los datos (InnerHtml Template Literals)
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
        `; // Intercepción visual de variables SQL
        modal.style.display = 'flex'; // Revierte el flex por si había sido display:none
    } catch (err) { await customAlert("Error al cargar la información del perfil.", "#ef4444"); } // Errores de red
} // Fin

// DISPARADOR DESTRUCTIVO FATAL (Eliminación on delete cascade de todo el sistema para este negocio)
async function eliminarCuenta() { // Método DELETE general
    const confirmar1 = await customConfirm("¿Estás seguro de que deseas eliminar tu cuenta? Esta acción no se puede deshacer.", "Eliminar cuenta", "#ef4444"); // Pre-Filtro Modal 1
    if (!confirmar1) return; // Si declina se escapa
    
    const confirmar2 = await customConfirm("ADVERTENCIA FINAL: Si eliminas tu cuenta, se borrará TODO tu negocio y las citas agendadas de forma permanente. ¿Deseas continuar?", "Sí, borrar todo", "#ef4444"); // Filtro de Capa 2
    if (!confirmar2) return; // Si declina se rompe
    
    const id = sessionStorage.getItem('userId'); // Intercepta el identificador global
    try { // Procedimiento
        const res = await fetch(`${API_URL}/usuario/${id}`, { method: 'DELETE' }); // Enlace a Node (Método destructor DELETE)
        if (res.ok) { // Checkeo de OK 200 HTTP
            await customAlert("Cuenta eliminada exitosamente. Lamentamos verte partir.", "#22c55e"); // Despedida Visual
            sessionStorage.clear(); // Limpia huellas de memoria RAM sobre el usuario y credenciales
            window.location.href = 'index.html'; // Lo expulsa directamente a la ruta raíz (Login público)
        } else { await customAlert("Error al eliminar la cuenta.", "#ef4444"); } // Fallo Lógico SQL
    } catch (err) { await customAlert("Error de conexión al intentar eliminar la cuenta.", "#ef4444"); } // Fallo servidor
} // Cierre

// 6. DETONADOR CÍCLICO AL CARGAR LA PÁGINA AL INICIO (Document Object Model Ready)
document.addEventListener('DOMContentLoaded', () => { // Lanza la carga del JS solo hasta que todo el HTML visual ya terminó de pintarse
    mostrarNombreUsuario(); // Llamado 1 a Funciones Constructoras
    cargarDatosNegocio(); // Llamado 2 (Motor Principal de auto-rellenado)
    cargarCitasAdmin(); // Llamado 3 (Constructor de tablas UI)
    
    // Bloqueo inicial preventivo antes de que responda la BD
    toggleEditMode(false); // Echa el cerrojo del formulario instantes antes de que la DB mande la data, para que se lea en "Read-Only"

    // Acopla motor encendedor del Botón "Modificar datos" inferior
    const btnToggleEdit = document.getElementById('btnToggleEdit'); // Lo busca en código
    if (btnToggleEdit) { // Revisa
        btnToggleEdit.addEventListener('click', (e) => { // A la espera de ser cliqueado
            if (!isEditingMode) { e.preventDefault(); toggleEditMode(true); } // Si no estaba editando, rompe el flujo y destraba los campos visualmente al instante
        }); // Cierra ciclo
    } // Cierra Check
}); // Cierra evento DOM