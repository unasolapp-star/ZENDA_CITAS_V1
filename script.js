const API_URL = "";  // Define la URL base de la API, vacía para apuntar al mismo dominio donde está alojada la página
const passwordField = document.getElementById('passwordField'); // Selecciona en el DOM el input del login y lo guarda global
const regPass = document.getElementById('regPass'); // Selecciona en el DOM el input del registro y lo guarda global

// 1. MANEJADOR LÓGICO PARA CAMBIAR ENTRE PESTAÑAS (LOGIN Y REGISTRO) VISUALMENTE
function toggleForms() { // Actúa como un switch alternador (Toggle)
    const loginF = document.getElementById('loginForm'); // Instancia temporal del formulario azul
    const regF = document.getElementById('registerForm'); // Instancia temporal del formulario rojo/nuevo
    
    if (loginF.style.display !== "none") { // Si el componente del login sí está activo/visible en pantalla
        loginF.style.display = "none"; // Lo destruye de la vista temporalmente
        regF.style.display = "flex"; // Reactiva la renderización (usando flexbox) para el bloque del registro
    } else { // Sin embargo, si al pulsar el botón el login YA ESTABA oculto (Es decir, estábamos en registro)
        loginF.style.display = "flex"; // Retorna la visibilidad al panel de inicio de sesión
        regF.style.display = "none"; // Elimina de la visibilidad la estructura de creación de cuenta
    } // Termina el bloque condicional del conmutador
} // Fin

// 1.5 CONTROLADOR PARA ACCESO DIRECTO COMO EXPLORADOR MUDO (INVITADO)
function continuarComoInvitado() { // Genera token falso inyectado localmente
    sessionStorage.removeItem('userId'); // Limpia de tajo cualquier identidad de alguien registrado previamente
    sessionStorage.setItem('userRole', 'invitado'); // Firma virtualmente un rol pasivo 'invitado' en RAM
    window.location.href = 'dashboard-cliente.html'; // Inyección forzada de hipervínculo hacia la web de clientes
} // Fin

// 2. INGENIERÍA INVERSA AL DOM PARA CONTROL DE ANIMACIONES 3D CSS GLOBALES
const mascots = document.querySelectorAll('.mascot-animator'); // Acumulador de todos los personajes 3D (Círculo, Cuadrado)
const pupils = document.querySelectorAll('.pupil'); // Acumulador específico de las retinas para manipular traslaciones matemáticas de mirada
const mouths = document.querySelectorAll('.mouth'); // Manipuladores faciales aislados
const mascotsWrapper = document.getElementById('mascots-wrapper'); // Contenedor límite que aloja los Canvas visuales

let estaEscribiendoPassword = false; // Bloqueador booleano de estados paralelos (Evita que intenten seguir tu mouse si ya están tapándose los ojos)
let timeoutVoltear; // Reserva espacio en RAM para almacenar un ID de la API setTimeout
let isDizzy = false; // Bloqueador booleano que se activa matemáticamente si das muchas vueltas violentas al mouse

// A. DETECTOR DE TECLADO Y VOLTEO (EFECTO CÁMARA 3D YIELD)
[passwordField, regPass].forEach(field => { // Bucle veloz sobre los dos nodos del campo Password detectados en línea 2 y 3
    if (field) { // Doble validación de seguridad por si en un futuro borran uno en HTML
        field.addEventListener('focus', () => { // Disparador (Trigger) cuando haces clic y el cursor parpadea dentro de un campo
            estaEscribiendoPassword = true; // Notifica y levanta bandera roja a otras partes del código
            clearTimeout(timeoutVoltear); // Detiene animaciones atoradas y reset de colisiones
            
            mascots.forEach(mascot => { // Itera uno a uno los monitos visuales
                mascot.classList.add('ojos-cerrados'); // Añade regla extra CSS que dibuja una línea sobre el ojo
                
                if (!mascot.classList.contains('estado-enojado') && !mascot.classList.contains('estado-mareado')) { // Filtra solo a los que estén pacíficos
                    const mouth = mascot.querySelector('.mouth'); // Extrae la boca exclusiva de ese monito
                    if (mouth) mouth.className = 'mouth mouth-nervous'; // Sobreescribe la clase de felicidad por una mueca estirada ("O")
                } // Cierra if pacíficos
            }); // Cierra forEach

            timeoutVoltear = setTimeout(() => { // Agrega latencia artificial milimétrica a propósito (Para esperar a que cierren los ojos primero)
                mascots.forEach(mascot => mascot.classList.add('girado-espalda')); // Añade Rotación de Y:180 grados mediante una clase CSS
            }, 400); // 400 Milisegundos de espera
        }); // Fin detector 'focus'
        
        field.addEventListener('blur', () => { // Disparador cuando quitas el clic del campo para hacer otra cosa
            estaEscribiendoPassword = false; // Apaga estado restrictivo
            clearTimeout(timeoutVoltear); // Rompe el giro por si justo lo hizo

            mascots.forEach(mascot => { // Itera mascotas de nuevo
                mascot.classList.remove('ojos-cerrados', 'girado-espalda'); // Limpieza doble (Retira ceguera y reinicia el Rotación-Y a 0 Grados de frente)

                if (!mascot.classList.contains('estado-enojado') && !mascot.classList.contains('estado-mareado')) { // Vuelve a filtrar si eran "sanos" (A veces podrías quitar el click y resulta que justo el mono te seguía enojado)
                    const mouth = mascot.querySelector('.mouth'); // Ubica sus bocas
                    if (mouth) mouth.className = 'mouth mouth-happy'; // Regresa la mueca curva tipo Sonrisa
                } // Fin sub-lógica
            }); // Fin bucle
        }); // Fin detector 'blur'
    } // Fin comprobante Field
}); // Fin ejecución Array macro

// B. CÁLCULO TRIGONOMÉTRICO DE PUNTEROS Y COLISIONES TÉRMICAS PARA EFECTO "MAREADO" (Dizzy)
let accumulatedRotation = 0; // Guardador contable en variable (Suma los grados que vas dibujando sobre el plano web)
let lastAngle = null; // Instancia null por si no hay ratón o estás en táctil, o almacena tu último salto de cursor

setInterval(() => { accumulatedRotation *= 0.98; }, 100); // Decaimiento constante friccional (Baja lentamente a cero cada fracción de segundo como si fuera fricción al girar para que no se saturen variables)

document.addEventListener('mousemove', (e) => { // Rastreador y espía constante en cada píxel que cruzas con el ratón
    if (estaEscribiendoPassword) return; // Si la contraseña es tipeada corta la animación entera (prioridad)

    // Cálculos matemáticos vectoriales para pupila inteligente (Trackpad Eye)
    pupils.forEach((pupil) => { // Rastrea a nivel sub-célula de HTML (class .pupil)
        if(isDizzy) return; // Rompe si están mareados (Tienen espirales rotando ya, no necesitan el ratón)
        const rect = pupil.parentElement.getBoundingClientRect(); // Extrae la posición geométrica estricta y absoluta del globo ocular con respecto al monitor global X e Y (Evitando distorsión de un scroll)
        const eyeCenterX = rect.left + rect.width / 2; // Encuentra la coordenada X estricta calculando su offset sumando su grosor / 2
        const eyeCenterY = rect.top + rect.height / 2; // Encuentra la coordenada Y estricta
        const angle = Math.atan2(e.clientY - eyeCenterY, e.clientX - eyeCenterX); // Función inversa del ArcoTangente matemático para hallar los radianes desde el centro del globo al puntero actual (e.clientY)
        const moveX = Math.cos(angle) * 5; // Función Coseno(Rad) para hallar el cateto adyacente horizontal y lo amplifica 5 pixeles forzados hacia afuera
        const moveY = Math.sin(angle) * 5; // Función Seno(Rad) para hallar el cateto opuesto (altura vertical) de la pupila
        pupil.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`; // Finalmente le dice al CSS: Trasládate (tu centro absoluto, mas tu movimiento X e Y calculados con la matemática anterior)
    }); // Termina el mapeo por cada ojo encontrado

    // Algoritmo Anti-Espiral (Mareo por girar violentamente en redondo al contenedor)
    if(mascotsWrapper) { // Revalida existencia
        const rectWrapper = mascotsWrapper.getBoundingClientRect(); // Encuentra el plano entero de los dos animales juntos
        const centerX = rectWrapper.left + rectWrapper.width / 2; // Centro masivo general X
        const centerY = rectWrapper.top + rectWrapper.height / 2; // Centro masivo general Y
        const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI; // Obtiene el arcoTangente general y lo multiplica por Radios/Pi para sacar equivalencias numéricas en 360 grados

        if (lastAngle !== null && !isDizzy) { // Revisa si ya tiene comparador histórico y si no están mareados
            let delta = currentAngle - lastAngle; // Saca diferencia entre tu mouse anterior vs nuevo de este milisegundo (Delta = velocidad)
            if (delta > 180) delta -= 360; // Parche para saltos bruscos positivos
            if (delta < -180) delta += 360; // Parche para saltos bruscos negativos
            accumulatedRotation += delta; // Guarda el delta en tu alcancía contable declarada en la línea superior (let accumulatedRotation)

            if (Math.abs(accumulatedRotation) > 360) { // Rompedor: Si al transformar a valores absolutos (+ o -), resulta ser que tu alcancía guarda más de 360 grados de movimiento continuo acumulado...
                triggerDizzyState(); // ... Dispara el mareo! Significa que lograste girar todo el perímetro.
            } // Cierra rompedor de mareo
        } // Cierra If algorítmico
        lastAngle = currentAngle; // Recarga de manera reactiva tu valor actual a último antes de reiniciarse el bucle del ratón
    } // Cierra if wrapper principal
}); // Apagón de escucha general Ratón Web

function triggerDizzyState() { // Función controladora de clase Mareo
    isDizzy = true; // Activa estatus global de bloqueo de ratón/ojos
    accumulatedRotation = 0; // Vacia completamente los datos delta y contador a cero para que si regresan del mareo puedan intentarlo de nuevo (Reseteo)

    mascots.forEach(mascot => { // Itera mascotas visuales
        mascot.classList.remove('estado-enojado'); // Retira estado de coraje (por si acaso las combinabas a darle clics y dar vueltas, se borra)
        mascot.classList.add('estado-mareado'); // Fuerza su clase inyectada de CSS ('estado-mareado' es la que mete los ojos espiral CSS3)
        const mouth = mascot.querySelector('.mouth'); // Selecciona la boca
        if(mouth) mouth.className = 'mouth mouth-dizzy'; // Pone la expresión espiral en la boca "~" ondulada
    }); // Fin foreach

    setTimeout(() => { // Controlador latente auto-destruible (Cura la resaca a los 4 seg)
        isDizzy = false; // Elimina el bloqueo visual para las demás variables
        mascots.forEach(mascot => { // Limpiador iterativo
            mascot.classList.remove('estado-mareado'); // Remueve visual del remolino espiral
            if (!estaEscribiendoPassword && !mascot.classList.contains('estado-enojado')) { // Previsor colisional: Qué pasa si a los 4 seg justo te metiste a la contraseña? Verifica...
                const mouth = mascot.querySelector('.mouth'); // Llama la boca
                if(mouth) mouth.className = 'mouth mouth-happy'; // La retorna a la cara estándar normal :)
            } // Cierra previsor de choques 
        }); // Cierra el limpiador
    }, 4000); // Delay rígido hardcodeado en 4.0 Segundos
} // Función end

// C. RUTINA ARTIFICIAL PARA APARIENCIA "VIVA" Y SISTEMA DE CLICK "ENOJO" ANTI-ABUSO (Spam)
const estadosBoca = ['mouth-happy', 'mouth-surprised', 'mouth-neutral']; // Variable constante con array fijo de 3 variantes faciales
setInterval(() => { // Cronómetro interno del navegador infinito
    if (estaEscribiendoPassword || isDizzy) return; // Si alguna rutina grande está bloqueando, rompe este setInterval y espera a la que sigue 
    mouths.forEach(mouth => { // Recorre la constante de bocas aisladas
        if (mouth.closest('.mascot-animator').classList.contains('estado-enojado')) return; // Pregunta a su 'Div' padre más grande si de casualidad está enojado para bloquear la mueca
        if (Math.random() > 0.4) { // Operación algorítmica: Genera número entre 0 y 1. Si es mayor a 0.4 (es decir, en el 60% de los casos o 6 de cada 10 veces...)
            const estado = estadosBoca[Math.floor(Math.random() * estadosBoca.length)]; // Selecciona uno de los 3 estados usando Math random escalado
            mouth.className = `mouth ${estado}`; // Parcha la clase
        } // Cierra randomificador
    }); // Cierra foreach
}, 1500); // 1.5 Segundos repetidos para siempre

mascots.forEach(element => { // Asignador general macro iterativo sobre cada contenedor total visual 3D
    let clickCount = 0; // Variables sub-locales encapsuladas por contenedor de cada mascota por separado (Es decir, Cuadrado tiene su propio número y Circulo el suyo, sin chocar!)
    let clickTimer = null; // Espacio Ram Limpiador
    let angryTimer = null; // Espacio Ram Latencia Retorno

    element.addEventListener('click', () => { // Escuchador de clic físico de ratón sobre el componente contenedor global de este bicho iterado
        if (estaEscribiendoPassword || isDizzy) return; // Paro si está volteado de culo
        clickCount++; // Aumenta en 1 su contador único interno
        element.classList.remove('shake-click'); // Truco Hack DOM: Retira violentamente la animación de rebote si estaba (Por si spamean)
        void element.offsetWidth;  // Hack de Fuerza DOM: Invocar 'offsetWidth' obliga al navegador a recalcular su motor interno CSS visual (reflow), garantizando que se quite la clase de verdad.
        element.classList.add('shake-click'); // Retorna a darle animación de impacto
        
        setTimeout(() => element.classList.remove('shake-click'), 200); // Y en 200ms se borra sola
        clearTimeout(clickTimer); // Limpia si en ese ínter picaste de nuevo, para extender tu contador
        clickTimer = setTimeout(() => { if (clickCount < 5) clickCount = 0; }, 500); // Si durante medio segundo no tocaste al monito y no llegaste a sus límites (5) te perdona tu spam y lo baja a Cero nuevamente.

        if (clickCount >= 5) { // Castigador: Si sí llegaste o te pasaste de 5 clics seguidos antes del medio seg...
            element.classList.add('estado-enojado'); // Mete clase 'rojo' o cejas abajo
            const mouth = element.querySelector('.mouth'); // Extrae su boca
            if(mouth) mouth.className = 'mouth mouth-angry'; // La invierte "( )" 

            clearTimeout(angryTimer); // Limpiador preventivo
            angryTimer = setTimeout(() => { // Lo condena a durar con esa clase...
                element.classList.remove('estado-enojado'); // ... Hasta que pasen 3 seg, y luego ya se la quita
                clickCount = 0; // Además de que perdona su cuenta de clics mal habida y se pone en paz
                if (!estaEscribiendoPassword && !isDizzy && mouth) { // Checkeo de choques (¿Qué tal que a los 3 seg justo ya te metiste al Input? Por seguridad evalúa)
                    mouth.className = 'mouth mouth-happy'; // Si hay paz lo retorna
                } // Cierra if
            }, 3000); // Sanción 3.0 Segundos 
        } // Cierra bloque castigo clickcount
    }); // Cierra detector EventListener ratón principal
}); // Cierra ciclo Array para las Mascotas

// 4. ENVOLTURA FRONTEND A BACKEND (Llamadas asíncronas para inicio de sesión en Node MySQL)
document.getElementById('loginForm').addEventListener('submit', async (e) => { // Bloque general del formulario azul 
    e.preventDefault(); // Trunca reinicio web
    const email = document.getElementById('email').value; // Agarra de forma estática su campo
    const password = passwordField.value; // Atrapa contraseña

    try { // Empieza proceso peligroso Network HTTP
        const res = await fetch(`${API_URL}/login`, { // Promesa contra Endpoint Auth Local
            method: 'POST', // Envío oculto body (Seguridad)
            headers: { 'Content-Type': 'application/json' }, // Declara empaquetado para que Express lea bien
            body: JSON.stringify({ email, password }) // Construye un objeto dinámico con sintaxis ECMA6 implícita "email: email"
        }); // Cierra Promesa Fetch
        
        const data = await res.json(); // Fuerza serializado
        
        if (res.ok) { // Validador 200 HTTP Node
            console.log("✅ Login exitoso, redirigiendo...", data); // Pinta en la Consola del navegador local Dev
            // Inyección de seguridad efímera. (SessionStorage significa que al cerrar la X de Google Chrome se va a borrar por seguridad tu registro para que si usaste cibercafé no entren a tu negocio)
            sessionStorage.setItem('userId', data.userId); // Almacenador
            sessionStorage.setItem('userRole', data.rol); // Almacenador jerarquía ('cliente' o 'negocio')
            
            // Operador Ternario '?' que funge como condicional if veloz: Si es igual a Negocio, salta a la web "dashboard-negocio", de lo contrario ":" salta forzoso a "dashboard-cliente" web.
            window.location.href = data.rol === 'negocio' ? "dashboard-negocio.html" : "dashboard-cliente.html"; // Cambio manual
        } else { // Si hubo código de error 404 o 401 en Node (Password mala, u Oculto)
            console.error("❌ El servidor rechazó el login:", data); // Aviso rojo
            await customAlert(data.error || "Credenciales incorrectas", "#ef4444"); // Visual rojo custom utils
        } // End lógico
    } catch (err) { // Network Failure Server Caido
        console.error("❌ Error de red o código:", err); // Network failure node error
        await customAlert("Error de conexión con el servidor. Verifica tu conexión a internet o intenta más tarde.", "#ef4444");  // Mensaje
    } // Catch end
}); // Listen End

// 5. CORTAFUEGO A NIVEL NAVEGADOR PARA IMPEDIR ESCRITURA MALA
document.getElementById('regPhone').addEventListener('input', function (e) { // Escucha letra tras letra tipeada (en vivo)
    // Usa un Expresión Regular '\D' equivalente a 'Cualquier cosa que no sea un dígito \d', y el flag global '/g' y lo intercambia por '' string vacío forzosamente en milésimas de segundo
    this.value = this.value.replace(/\D/g, '');  // Asigna parche
}); // Cierra evento

// 6. MOTOR GENERAL DE FORMULARIO DE RECOPILACIÓN PARA ENROLAR NUEVOS CLIENTES/NEGOCIOS
document.getElementById('registerForm').addEventListener('submit', async (e) => { // Controlador bloque form registro
    e.preventDefault(); // Traba
    const passValue = document.getElementById('regPass').value; // Recupera valor manual (El passwordField global de arriba era para el de login)
    const emailValue = document.getElementById('regEmail').value; // Extrae Email
    const phoneValue = document.getElementById('regPhone').value; // Extrae Telefono (Ya forzado)

    // A. Analizador léxico estricto para impedir correos malintencionados o de dominios raros de spam temporal para no gastar correos de la API de Brevo
    const emailRegex = /^[^\s@]+@(gmail\.com|outlook\.com|hotmail\.com)$/i; // Sintaxis regex dura con i = incase sensitive
    if (!emailRegex.test(emailValue)) { // Validador 
        await customAlert("El correo electrónico solo puede ser @gmail.com, @outlook.com o @hotmail.com", "#ef4444"); // Visual error 
        return; // Break
    } // Cierra regex valid

    // B. Re-Chequeo Lógico post form
    if (phoneValue.length !== 10) { // Largo celular Mx
        await customAlert("El número de teléfono debe tener exactamente 10 dígitos.", "#ef4444"); // Visual error
        return; // Break
    } // Cierra length tel

    // C. Verificadores atómicos aislados regex para contraseña inquebrantable
    if (passValue.length < 9) { // Nivel 1 Tamaño (Fuerza bruta lenta)
        await customAlert("La contraseña debe tener al menos 9 caracteres por seguridad.", "#ef4444"); // Mensaje 1
        return; // Break 1
    } // Fin niv 1
    if (!/[A-Z]/.test(passValue)) { // Nivel 2 Caza en el rango ASCII letras Mayus A-Z.
        await customAlert("La contraseña debe contener al menos una letra mayúscula.", "#ef4444"); // Mensaje 2
        return; // Break 2
    } // Fin niv 2
    if (!/\d/.test(passValue)) { // Nivel 3 Caza en el rango numérico (Regex \d que es digital)
        await customAlert("La contraseña debe contener al menos un número (0-9).", "#ef4444"); // Men 3
        return; // Break 3
    } // Fin niv 3
    if (!/[_\-\/&$]/.test(passValue)) { // Nivel 4 Restringido: Selecciona uno solo de los caracteres en el bracket, con \ de escape para el guion real
        await customAlert("La contraseña debe contener al menos un carácter especial válido como: _ - / & $", "#ef4444"); // Men 4
        return; // Break 4
    } // Cierre Niveles Superiores. Todo OK si llegas aquí.

    // Construcción de Payload Global. (Se usa window... para que no se pierdan si cerramos el popup sin querer o si minimizamos y para que la memoria del navegador pueda mandar luego al código brevo)
    window.datosRegistroTemporal = { // Genera el objeto dinámico
        nombre: document.getElementById('regName').value, // Acopla de form estatico
        email: emailValue, // Acopla validado
        telefono: phoneValue, // Acopla
        password: passValue, // Acopla
        rol: document.getElementById('regRole').value // Extrae Dropdown tipo Select de HTML Option
    }; // Finaliza Builder Global

    // Diseño de UX Visual "Botón Trabajando" para prevenir que presionen y spameen a la API
    const btnSubmit = e.target.querySelector('button[type="submit"]'); // Ubica al autor del evento que gatilló esto (e) y a su botón Submit
    const textoOriginal = btnSubmit.innerText; // Resguarda su texto en RAM para no perderlo
    btnSubmit.innerText = "⏳ Enviando código (espere un momento)..."; // Parche visual de engaño
    btnSubmit.disabled = true; // Parche bloqueador interactivo (Traba hardware ratón)
    btnSubmit.style.opacity = "0.7"; // Atenuación grisácea para denotar 'Busy'

    try { // Empieza proceso API Node
        // Operación atómica de pre-requisito 1
        const res = await fetch(`${API_URL}/enviar-codigo`, { // Endpoint API
            method: 'POST', // Oculto
            headers: { 'Content-Type': 'application/json' }, // Formato Expres
            body: JSON.stringify({ email: emailValue }) // Manda ÚNICAMENTE email, ya que allá lo requiere para enviar brevo o dar error de "Oye, ya existías carnal"
        }); // Cierra Request
        
        if (res.ok) { // Si servidor Express contestó Status 200...
            // Renderiza Capa Modal superior
            document.getElementById('verificationModal').style.display = 'block'; // Quita el "none" que viene pre-establecido en el HTML y abre de golpe el bloque gigante flotante
            document.getElementById('verificationCode').value = ''; // Vacía el input por si el user en un fallido intento lo dejó lleno
            iniciarTemporizador(); // Invoca motor numérico
        } else { // Si servidor Express rechazó
            const errorData = await res.json(); // Desencripta para obtener razón
            await customAlert(errorData.error || "Error al enviar el código de verificación.", "#ef4444"); // Renderiza razón ("El correo ya existe" por ejemplo)
        } // Cierra evaluador Express Result
    } catch (err) { // Disparador fallido Network
        await customAlert("Error al solicitar el código: No se pudo conectar con el servidor.", "#ef4444"); // Visual Alerta red
    } finally { // Disparador Obligatorio (Pase lo que pase sin importar try o error catch)
        // Regresor UX para restaurar botones rotos
        btnSubmit.innerText = textoOriginal; // Regresa texto "Crear cuenta"
        btnSubmit.disabled = false; // Quita candado
        btnSubmit.style.opacity = "1"; // Sube brillo visual a la par normal
    } // Termina bloque Finally limpiador de errores
}); // Termina super listener masivo

// 6.1 MAQUINARIA NUMÉRICA (Interval Timer API)
window.countdownInterval = null; // Creador global en memoria temporal 'window' para que no choque si se ejecutan muchas veces seguidas la app

function iniciarTemporizador() { // Función armadora reloj
    if (window.countdownInterval) clearInterval(window.countdownInterval); // Limpiador pre-requisito (si traía basurilla una variable global, la tira para evitar doble conteo acelerado x2 vel)
    let timeLeft = 3 * 60; // Operación simple pre-establecida en 180 Segundos exactos
    const timerDisplay = document.getElementById('timerDisplay'); // Enlaza elemento visual UI
    
    window.countdownInterval = setInterval(() => { // Reasigna la memoria global a un motor setInterval infinito (se repite cada X ms pasados al final)
        timeLeft--; // Sustracción de contador maestro en una unidad
        const m = Math.floor(timeLeft / 60).toString().padStart(2, '0'); // Constructor Matemático de Minutos (Redondeo hacia abajo del flotante absoluto) y formatea rellenando con "0" la izq para mantener longitud constante "03" en lugar de "3".
        const s = (timeLeft % 60).toString().padStart(2, '0'); // Constructor Segundos restantes Modulo Divisor % para que no sobrepase 59
        timerDisplay.innerText = `Expira en: ${m}:${s}`; // Ensamble de string interpolado inyectado a vista de pantalla
        
        if (timeLeft <= 0) { // Validador tope (Si llega a ceros y rompe o si alguien lo edita a menos negativos)
            clearInterval(window.countdownInterval); // Auto destrucción del motor global interval
            timerDisplay.innerText = "Código expirado"; // Anotación y parcha texto en pantalla
            timerDisplay.style.color = "#ef4444"; // Lo repinta de rojo
        } else { // Si sí había tiempo de conteo en transcurso
            timerDisplay.style.color = "#64748b"; // Mantiene un gris sutil como lo dicta el estilo base
        } // Cierra condicional reloj
    }, 1000); // Declarador obligatorio del set interval para el bucle del motor a 1000 milisegundos (1 seg exacto) de tasa de recarga 
} // Termina sub-función ensambladora

// Bucle Alternativo para recuperar correos borrados
document.getElementById('resendCodeBtn').addEventListener('click', async () => { // Escuchador enlace 'Reenviar código'
    const emailValue = window.datosRegistroTemporal?.email; // Recuperación astuta ('?.') por si se crasheó window u objeto era vacío
    if (!emailValue) return; // Disparador falso detiene operación

    const btnResend = document.getElementById('resendCodeBtn'); // Captura anclador UI visual
    const originalText = btnResend.innerText; // Captura info pre-modificada
    btnResend.innerText = "Enviando..."; // Sustituye texto UI engañoso
    btnResend.style.pointerEvents = "none"; // En un elemento A Href / etiqueta Span o link de CSS, apagar clicks de hardware es así, bloqueando con "None".

    try { // Empieza Red
        const res = await fetch(`${API_URL}/enviar-codigo`, { // Api endpoint
            method: 'POST', // Operación
            headers: { 'Content-Type': 'application/json' }, // Formato
            body: JSON.stringify({ email: emailValue }) // Se reenvía email resguardado Globalmente
        }); // Cierra await Promesa
        
        if (res.ok) { // Checkeo de OK 200 HTTP
            await customAlert("✅ Se ha enviado un nuevo código a tu correo.", "#22c55e"); // Visual Confirmador verde
            iniciarTemporizador(); // Arranca en automático a matar a la variable global temporal, y resetea su contador de nuevo para darle vida.
            document.getElementById('verificationCode').value = ''; // Borra el fallido si hubiera
        } else { // Check Fallo Lógico 400
            const errorData = await res.json(); // Desencripta Info
            await customAlert(errorData.error || "Error al reenviar el código.", "#ef4444"); // Visualizador Falla Node
        } // Cierra If Ok
    } catch (err) { // Cierra Try
        await customAlert("Error de conexión al reenviar.", "#ef4444"); // Visual Red Abortado
    } finally { // Obligador macro
        btnResend.innerText = originalText; // Reactiva visual UX Reenviar Enlace
        btnResend.style.pointerEvents = "auto"; // Le devuelve el puntero natural al hardware para poder volver a tocar el link a de CSS.
    } // Termina flujo Always Reenviar
}); // Cierra ciclo Reenviar Enlace Ratón Listen

// 6.5 DISPARADOR DE RESOLUCIÓN FINAL (Validar e inyectar cliente global DB real)
document.getElementById('btnVerifyCode').addEventListener('click', async () => { // Llama escuchador en el botón Azul del "Modal Grande Flotante"
    const codigo = document.getElementById('verificationCode').value; // Extrae contenido tipeado final del usuario desde la UI
    
    if (codigo.length !== 7) { // Check length exacto para Node y Brevo
        await customAlert("El código debe tener exactamente 7 dígitos.", "#ef4444"); // Visual error Warning si falta una letra
        return; // Break Defensivo
    } // Cierra If

    // Compresión final masiva ECMA Script (Usa SPREAD Operator)
    const datosFinales = { ...window.datosRegistroTemporal, codigo }; // Combina Objeto Viejo Global Window (...) y le concatena sin romper la nueva variable "Código"

    // Constructor UX Visual "Botón Trabajando" parte 2 Modal
    const btnVerify = document.getElementById('btnVerifyCode'); // Ref local
    const textoOriginal = btnVerify.innerText; // Guarda Respaldo string
    btnVerify.innerText = "⏳ Verificando..."; // Parcha Visual string
    btnVerify.disabled = true; // Inutiliza control
    btnVerify.style.opacity = "0.7"; // Modifica Brillo Disminuyendo Atractivo UI

    try { // Inicializador Tráfico de Red Node Auth Final Register EndPoint
        const res = await fetch(`${API_URL}/register`, { // Red Endpoint Absoluto Authjs
            method: 'POST', // Envío oculto Auth
            headers: { 'Content-Type': 'application/json' }, // Declara empaquetado para Payload 
            body: JSON.stringify(datosFinales) // Encripta el SPREAD en cadena para la Red
        }); // Cierra await Promesa
        
        if (res.ok) { // Check Lógico Post DB (Validación exitosa código y registro db correct)
            if (window.countdownInterval) clearInterval(window.countdownInterval); // Mata motor Reloj (Si el user terminó exitoso no necesitas que su PC siga contando sin parar los MS)
            document.getElementById('verificationModal').style.display = 'none'; // Auto oculta brutalmente con display nulo al modal flotante grande tras éxito
            await customAlert("¡Cuenta verificada y creada con éxito! Ahora puedes iniciar sesión.", "#22c55e"); // Visual Custom Éxito Formateado en Verde OK
            document.getElementById('registerForm').reset(); // API nativa HTML que vacía absolutamente todos los inputs del HTML pre llenados sin hacerlos 1 a 1 de código
            toggleForms(); // Invocador del Interruptor Creado arriba para pasarte al panel "Azul de Login", listos para arrancar!
        } else { // Si Node dice (400 Código equivocado / Caducó pasaron 5 mins / Falla)
            const errorData = await res.json(); // Parsea Expres JS
            await customAlert(errorData.error || "Código incorrecto o expirado.", "#ef4444"); // Imprime falla o Redundancia FallBack Falla Ficticia (Custom Visual Error)
        } // Cierra Validador Res.Ok
    } catch (err) { // Cierra Try Macro EndPoint y ataja Fallos Server Caído Fatal Crash
        await customAlert("Error de conexión al registrar cuenta.", "#ef4444"); // Visual Mensaje Network Error Abort Error Code Custom
    } finally { // Restablecedor global por falla o por éxito (Final Siempre ejecuta código para parchar UI estancado)
        btnVerify.innerText = textoOriginal; // Repintar
        btnVerify.disabled = false; // Quitar Ceradura
        btnVerify.style.opacity = "1"; // Devolver contraste de CSS
    } // Cierra Finally Reparador End
}); // Cierra ciclo Bucle asincrónico Botón Azul Modal Principal

// 7. CONTROLADOR DOM OJO UX (Mostrar Contraseñas Visibles en Texto Plano)
function togglePassword(inputId) { // Constructor pasivo referencial de ID
    const input = document.getElementById(inputId); // Referencia parametrizada (Pudiendo ser el de Registro Rojo, o el de Logín Azul de la Pantalla HTML)
    if (input && input.type === "password") { // Pregunta a HTML si ese elemento oculto tipo bolitas
        input.type = "text"; // Lo transforma cambiando su atributo CSS HTML para hacerlo Letras legibles
    } else if (input) { // Si de hecho sí era legible y el usuario picó de nuevo...
        input.type = "password"; // Lo cambia a ocultador de caracteres en puntos predeterminado de HTML
    } // Final check Switch visual
} // Final de Código Base JS