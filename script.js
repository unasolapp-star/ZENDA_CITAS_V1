const API_URL = ""; 
const passwordField = document.getElementById('passwordField');
const regPass = document.getElementById('regPass');

// 1. FUNCIÓN PARA CAMBIAR ENTRE LOGIN Y REGISTRO
function toggleForms() {
    const loginF = document.getElementById('loginForm');
    const regF = document.getElementById('registerForm');
    
    if (loginF.style.display !== "none") {
        loginF.style.display = "none";
        regF.style.display = "flex";
    } else {
        loginF.style.display = "flex";
        regF.style.display = "none";
    }
}

// 1.5 FUNCIÓN PARA CONTINUAR COMO INVITADO
function continuarComoInvitado() {
    sessionStorage.removeItem('userId'); // Nos aseguramos de que no haya un ID de cuenta
    sessionStorage.setItem('userRole', 'invitado'); // Asignamos el rol temporal
    window.location.href = 'dashboard-cliente.html';
}

// 2. SEGUIMIENTO VISUAL Y ANIMACIONES 3D
const mascots = document.querySelectorAll('.mascot-animator');
const pupils = document.querySelectorAll('.pupil');
const mouths = document.querySelectorAll('.mouth');
const mascotsWrapper = document.getElementById('mascots-wrapper');

let estaEscribiendoPassword = false;
let timeoutVoltear;
let isDizzy = false;

// A. EFECTO DE ROTACIÓN 3D AL ESCRIBIR CONTRASEÑA
[passwordField, regPass].forEach(field => {
    if (field) {
        field.addEventListener('focus', () => {
            estaEscribiendoPassword = true;
            clearTimeout(timeoutVoltear); 
            
            mascots.forEach(mascot => {
                mascot.classList.add('ojos-cerrados');
                
                if (!mascot.classList.contains('estado-enojado') && !mascot.classList.contains('estado-mareado')) {
                    const mouth = mascot.querySelector('.mouth');
                    if (mouth) mouth.className = 'mouth mouth-nervous';
                }
            });

            timeoutVoltear = setTimeout(() => {
                mascots.forEach(mascot => mascot.classList.add('girado-espalda'));
            }, 400);
        });
        
        field.addEventListener('blur', () => {
            estaEscribiendoPassword = false;
            clearTimeout(timeoutVoltear);

            mascots.forEach(mascot => {
                mascot.classList.remove('ojos-cerrados', 'girado-espalda');

                if (!mascot.classList.contains('estado-enojado') && !mascot.classList.contains('estado-mareado')) {
                    const mouth = mascot.querySelector('.mouth');
                    if (mouth) mouth.className = 'mouth mouth-happy';
                }
            });
        });
    }
});

// B. SEGUIMIENTO DE RATÓN Y SISTEMA DE MAREO
let accumulatedRotation = 0;
let lastAngle = null;

setInterval(() => { accumulatedRotation *= 0.98; }, 100);

document.addEventListener('mousemove', (e) => {
    if (estaEscribiendoPassword) return;

    // Seguimiento de Ojos
    pupils.forEach((pupil) => {
        if(isDizzy) return; 
        const rect = pupil.parentElement.getBoundingClientRect();
        const eyeCenterX = rect.left + rect.width / 2;
        const eyeCenterY = rect.top + rect.height / 2;
        const angle = Math.atan2(e.clientY - eyeCenterY, e.clientX - eyeCenterX);
        const moveX = Math.cos(angle) * 5;
        const moveY = Math.sin(angle) * 5;
        pupil.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;
    });

    // Detección de círculos para mareo
    if(mascotsWrapper) {
        const rectWrapper = mascotsWrapper.getBoundingClientRect();
        const centerX = rectWrapper.left + rectWrapper.width / 2;
        const centerY = rectWrapper.top + rectWrapper.height / 2;
        const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;

        if (lastAngle !== null && !isDizzy) {
            let delta = currentAngle - lastAngle;
            if (delta > 180) delta -= 360;
            if (delta < -180) delta += 360;
            accumulatedRotation += delta;

            if (Math.abs(accumulatedRotation) > 360) {
                triggerDizzyState();
            }
        }
        lastAngle = currentAngle;
    }
});

function triggerDizzyState() {
    isDizzy = true;
    accumulatedRotation = 0;

    mascots.forEach(mascot => {
        mascot.classList.remove('estado-enojado'); 
        mascot.classList.add('estado-mareado');
        const mouth = mascot.querySelector('.mouth');
        if(mouth) mouth.className = 'mouth mouth-dizzy'; 
    });

    setTimeout(() => {
        isDizzy = false;
        mascots.forEach(mascot => {
            mascot.classList.remove('estado-mareado');
            if (!estaEscribiendoPassword && !mascot.classList.contains('estado-enojado')) {
                const mouth = mascot.querySelector('.mouth');
                if(mouth) mouth.className = 'mouth mouth-happy';
            }
        });
    }, 4000);
}

// C. BOCAS ALEATORIAS Y SISTEMA DE ENOJO
const estadosBoca = ['mouth-happy', 'mouth-surprised', 'mouth-neutral'];
setInterval(() => {
    if (estaEscribiendoPassword || isDizzy) return;
    mouths.forEach(mouth => {
        if (mouth.closest('.mascot-animator').classList.contains('estado-enojado')) return;
        if (Math.random() > 0.4) {
            const estado = estadosBoca[Math.floor(Math.random() * estadosBoca.length)];
            mouth.className = `mouth ${estado}`;
        }
    });
}, 1500);

mascots.forEach(element => {
    let clickCount = 0;
    let clickTimer = null;
    let angryTimer = null;

    element.addEventListener('click', () => {
        if (estaEscribiendoPassword || isDizzy) return;
        clickCount++;
        element.classList.remove('shake-click');
        void element.offsetWidth; 
        element.classList.add('shake-click');
        
        setTimeout(() => element.classList.remove('shake-click'), 200);
        clearTimeout(clickTimer);
        clickTimer = setTimeout(() => { if (clickCount < 5) clickCount = 0; }, 500);

        if (clickCount >= 5) {
            element.classList.add('estado-enojado');
            const mouth = element.querySelector('.mouth');
            if(mouth) mouth.className = 'mouth mouth-angry';

            clearTimeout(angryTimer);
            angryTimer = setTimeout(() => {
                element.classList.remove('estado-enojado');
                clickCount = 0;
                if (!estaEscribiendoPassword && !isDizzy && mouth) {
                    mouth.className = 'mouth mouth-happy';
                }
            }, 3000);
        }
    });
});

// 4. MANEJO DEL LOGIN (CONEXIÓN A MYSQL LOCAL)
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = passwordField.value;

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            console.log("✅ Login exitoso, redirigiendo...", data);
            // Guardamos datos de sesión en el navegador
            sessionStorage.setItem('userId', data.userId);
            sessionStorage.setItem('userRole', data.rol);
            
            // Redirección inteligente según el rol guardado en la BD
            window.location.href = data.rol === 'negocio' ? "dashboard-negocio.html" : "dashboard-cliente.html";
        } else {
            console.error("❌ El servidor rechazó el login:", data);
            await customAlert(data.error || "Credenciales incorrectas", "#ef4444");
        }
    } catch (err) { 
        console.error("❌ Error de red o código:", err);
        await customAlert("Error de conexión con el servidor local. ¿Ejecutaste 'node server.js'?", "#ef4444"); 
    }
});

// 5. VALIDACIÓN EN TIEMPO REAL DEL TELÉFONO (SOLO NÚMEROS)
document.getElementById('regPhone').addEventListener('input', function (e) {
    // Reemplaza automáticamente cualquier cosa que no sea un número por nada (lo borra)
    this.value = this.value.replace(/\D/g, ''); 
});

// 6. MANEJO DEL REGISTRO (CON VALIDACIONES ESTRICTAS)
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const passValue = document.getElementById('regPass').value;
    const emailValue = document.getElementById('regEmail').value;
    const phoneValue = document.getElementById('regPhone').value;

    // A. Validación de Email (solo gmail, outlook, hotmail sin importar mayúsculas)
    const emailRegex = /^[^\s@]+@(gmail\.com|outlook\.com|hotmail\.com)$/i;
    if (!emailRegex.test(emailValue)) {
        await customAlert("El correo electrónico solo puede ser @gmail.com, @outlook.com o @hotmail.com", "#ef4444");
        return;
    }

    // B. Validación de Teléfono (exactamente 10 dígitos)
    if (phoneValue.length !== 10) {
        await customAlert("El número de teléfono debe tener exactamente 10 dígitos.", "#ef4444");
        return;
    }

    // C. Validación de Contraseña
    if (passValue.length < 9) {
        await customAlert("La contraseña debe tener al menos 9 caracteres por seguridad.", "#ef4444");
        return;
    }
    if (!/[A-Z]/.test(passValue)) {
        await customAlert("La contraseña debe contener al menos una letra mayúscula.", "#ef4444");
        return;
    }
    if (!/\d/.test(passValue)) {
        await customAlert("La contraseña debe contener al menos un número (0-9).", "#ef4444");
        return;
    }
    if (!/[_\-\/&$]/.test(passValue)) {
        await customAlert("La contraseña debe contener al menos un carácter especial válido como: _ - / & $", "#ef4444");
        return;
    }

    // Guardamos los datos temporalmente en una variable global
    window.datosRegistroTemporal = {
        nombre: document.getElementById('regName').value,
        email: emailValue,
        telefono: phoneValue,
        password: passValue,
        rol: document.getElementById('regRole').value
    };

    // CAMBIO VISUAL: Mostrar al usuario que está cargando
    const btnSubmit = e.target.querySelector('button[type="submit"]');
    const textoOriginal = btnSubmit.innerText;
    btnSubmit.innerText = "⏳ Enviando código (espere un momento)...";
    btnSubmit.disabled = true;
    btnSubmit.style.opacity = "0.7";

    try {
        // PRIMERO SOLICITAMOS EL CÓDIGO
        const res = await fetch(`${API_URL}/enviar-codigo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailValue })
        });
        
        if (res.ok) {
            // Mostramos la ventana emergente para que escriba el código
            document.getElementById('verificationModal').style.display = 'block';
            document.getElementById('verificationCode').value = '';
            iniciarTemporizador();
        } else {
            const errorData = await res.json();
            await customAlert(errorData.error || "Error al enviar el código de verificación.", "#ef4444");
        }
    } catch (err) { 
        await customAlert("Error al solicitar el código: ¿Está encendido el servidor Node.js?", "#ef4444"); 
    } finally {
        // Restaurar el botón a la normalidad pase lo que pase
        btnSubmit.innerText = textoOriginal;
        btnSubmit.disabled = false;
        btnSubmit.style.opacity = "1";
    }
});

// 6.1 LÓGICA DEL TEMPORIZADOR Y REENVÍO DE CÓDIGO
window.countdownInterval = null;

function iniciarTemporizador() {
    if (window.countdownInterval) clearInterval(window.countdownInterval);
    let timeLeft = 3 * 60; // 3 minutos
    const timerDisplay = document.getElementById('timerDisplay');
    
    window.countdownInterval = setInterval(() => {
        timeLeft--;
        const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        const s = (timeLeft % 60).toString().padStart(2, '0');
        timerDisplay.innerText = `Expira en: ${m}:${s}`;
        
        if (timeLeft <= 0) {
            clearInterval(window.countdownInterval);
            timerDisplay.innerText = "Código expirado";
            timerDisplay.style.color = "#ef4444";
        } else {
            timerDisplay.style.color = "#64748b";
        }
    }, 1000);
}

document.getElementById('resendCodeBtn').addEventListener('click', async () => {
    const emailValue = window.datosRegistroTemporal?.email;
    if (!emailValue) return;

    const btnResend = document.getElementById('resendCodeBtn');
    const originalText = btnResend.innerText;
    btnResend.innerText = "Enviando...";
    btnResend.style.pointerEvents = "none";

    try {
        const res = await fetch(`${API_URL}/enviar-codigo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailValue })
        });
        
        if (res.ok) {
            await customAlert("✅ Se ha enviado un nuevo código a tu correo.", "#22c55e");
            iniciarTemporizador(); // Reinicia la cuenta a los 5 minutos de nuevo
            document.getElementById('verificationCode').value = '';
        } else {
            const errorData = await res.json();
            await customAlert(errorData.error || "Error al reenviar el código.", "#ef4444");
        }
    } catch (err) {
        await customAlert("Error de conexión al reenviar.", "#ef4444");
    } finally {
        btnResend.innerText = originalText;
        btnResend.style.pointerEvents = "auto";
    }
});

// 6.5 MANEJO DEL BOTÓN PARA VERIFICAR EL CÓDIGO Y REGISTRAR
document.getElementById('btnVerifyCode').addEventListener('click', async () => {
    const codigo = document.getElementById('verificationCode').value;
    
    if (codigo.length !== 7) {
        await customAlert("El código debe tener exactamente 7 dígitos.", "#ef4444");
        return;
    }

    // Unimos los datos del registro que guardamos antes, con el código escrito
    const datosFinales = { ...window.datosRegistroTemporal, codigo };

    // CAMBIO VISUAL: Mostrar estado de carga en el botón del modal
    const btnVerify = document.getElementById('btnVerifyCode');
    const textoOriginal = btnVerify.innerText;
    btnVerify.innerText = "⏳ Verificando...";
    btnVerify.disabled = true;
    btnVerify.style.opacity = "0.7";

    try {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosFinales)
        });
        
        if (res.ok) {
            if (window.countdownInterval) clearInterval(window.countdownInterval); // Limpia si fue éxito
            document.getElementById('verificationModal').style.display = 'none';
            await customAlert("¡Cuenta verificada y creada con éxito! Ahora puedes iniciar sesión.", "#22c55e");
            document.getElementById('registerForm').reset(); // Limpia el formulario base
            toggleForms(); // Regresa al login
        } else {
            const errorData = await res.json();
            await customAlert(errorData.error || "Código incorrecto o expirado.", "#ef4444");
        }
    } catch (err) { 
        await customAlert("Error de conexión al registrar cuenta.", "#ef4444"); 
    } finally {
        btnVerify.innerText = textoOriginal;
        btnVerify.disabled = false;
        btnVerify.style.opacity = "1";
    }
});

// 7. FUNCIÓN PARA MOSTRAR / OCULTAR CONTRASEÑA
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (input && input.type === "password") {
        input.type = "text"; // Muestra la contraseña
    } else if (input) {
        input.type = "password"; // La vuelve a ocultar
    }
}

// 8. ALERTA PERSONALIZADA
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