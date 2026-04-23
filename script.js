const API_URL = "http://localhost:3000"; 
const pupils = document.querySelectorAll('.pupil');
const shapes = document.querySelectorAll('.shape');
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

// 2. SEGUIMIENTO VISUAL DE LOS OJOS
document.addEventListener('mousemove', (e) => {
    // No se mueven si estás escribiendo la contraseña (para el efecto de "vergüenza")
    if (document.activeElement.type === 'password') return;

    pupils.forEach(pupil => {
        const rect = pupil.getBoundingClientRect();
        const eyeX = rect.left + rect.width / 2;
        const eyeY = rect.top + rect.height / 2;
        
        // Cálculo del ángulo entre el cursor y el ojo
        const angle = Math.atan2(e.clientY - eyeY, e.clientX - eyeX);
        
        // Limitar el movimiento de la pupila dentro del ojo
        const moveX = Math.cos(angle) * 10;
        const moveY = Math.sin(angle) * 10;
        
        pupil.style.transform = `translate(${moveX}px, ${moveY}px)`;
    });
});

// 3. EFECTO DE "VERGÜENZA" (SHAME) AL ESCRIBIR CONTRASEÑA
[passwordField, regPass].forEach(field => {
    if (field) {
        field.addEventListener('focus', () => {
            shapes.forEach(s => s.classList.add('shame'));
            // Al enfocarse, las pupilas vuelven al centro y "se cierran"
            pupils.forEach(p => p.style.transform = `translate(0px, 0px) scaleY(0.1)`);
        });
        
        field.addEventListener('blur', () => {
            shapes.forEach(s => s.classList.remove('shame'));
            pupils.forEach(p => p.style.transform = `translate(0px, 0px) scaleY(1)`);
        });
    }
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
            // Guardamos datos de sesión en el navegador
            localStorage.setItem('userId', data.userId);
            localStorage.setItem('userRole', data.rol);
            
            // Redirección inteligente según el rol guardado en la BD
            window.location.href = data.rol === 'negocio' ? "dashboard-negocio.html" : "dashboard-cliente.html";
        } else {
            alert(data.error || "Credenciales incorrectas");
        }
    } catch (err) { 
        alert("Error de conexión con el servidor local. ¿Ejecutaste 'node server.js'?"); 
    }
});

// 5. MANEJO DEL REGISTRO (CON VALIDACIÓN DE LONGITUD)
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const passValue = document.getElementById('regPass').value;

    if (passValue.length < 9) {
        return alert("La contraseña debe tener al menos 9 caracteres por seguridad.");
    }

    const datos = {
        nombre: document.getElementById('regName').value,
        email: document.getElementById('regEmail').value,
        telefono: document.getElementById('regPhone').value,
        password: passValue,
        rol: document.getElementById('regRole').value
    };

    try {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
        
        if (res.ok) {
            alert("¡Cuenta creada con éxito! Ahora puedes iniciar sesión.");
            toggleForms(); // Regresa al formulario de login automáticamente
        } else {
            const errorData = await res.json();
            alert(errorData.error || "Error al registrar: El correo ya podría estar en uso.");
        }
    } catch (err) { 
        alert("Error al registrar: ¿Está encendido el servidor Node.js?"); 
    }
});