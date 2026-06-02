const express = require('express'); // Importamos Express
const router = express.Router(); // Instanciamos un enrutador de Express
const bcrypt = require('bcryptjs'); // Librería para encriptar contraseñas
const db = require('./database'); // Importamos nuestra conexión a base de datos aislada

// Memoria temporal en RAM para guardar los códigos de registro.
// Nota: Para escalar a producción multi-servidor se recomienda usar Redis.
const registrosPendientes = new Map();

// VERIFICADOR AUTOMÁTICO DE CONEXIÓN CON BREVO (API de correos)
fetch('https://api.brevo.com/v3/account', {
    method: 'GET', // Petición de lectura para comprobar estado
    headers: { 'api-key': process.env.EMAIL_PASS || '' } // Pasamos la llave de API
}).then(async (res) => {
    if (res.ok) console.log("✅ Conexión exitosa con API de Brevo. El servidor puede enviar correos.");
    else console.error("⚠️ ERROR DE CONEXIÓN CON BREVO API: Clave inválida o faltante.");
}).catch(err => console.error("⚠️ ERROR DE RED CON BREVO API:", err.message));

// --- RUTA 1: GENERAR Y ENVIAR EL CÓDIGO DE VERIFICACIÓN ---
router.post('/enviar-codigo', async (req, res) => {
    const { email } = req.body; // Extraemos el email del cuerpo de la petición

    // Consultamos la BD para evitar enviar códigos a correos ya registrados
    db.query('SELECT id FROM usuarios WHERE email = ?', [email], async (err, results) => {
        if (err) return res.status(500).json({ error: "Error consultando la base de datos." });
        if (results.length > 0) return res.status(400).json({ error: "Este correo ya está registrado." });

        // Generamos un código numérico aleatorio de 7 dígitos matemáticamente
        const codigo = Math.floor(1000000 + Math.random() * 9000000).toString();
        const expiresAt = Date.now() + 5 * 60 * 1000; // Definimos expiración a 5 minutos exactos
        registrosPendientes.set(email, { codigo, expiresAt }); // Guardamos en la memoria temporal

        // Creamos la plantilla HTML visual del correo
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                <h2 style="color: #2563eb;">¡Bienvenido a Zenda!</h2>
                <p>Tu código de verificación seguro es:</p>
                <h1 style="background: #f1f5f9; padding: 15px; border-radius: 10px;">${codigo}</h1>
            </div>
        `;

        try {
            // Realizamos la petición POST hacia el servidor SMTP de Brevo
            const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: { 'accept': 'application/json', 'api-key': process.env.EMAIL_PASS || '', 'content-type': 'application/json' },
                body: JSON.stringify({
                    sender: { name: "Equipo Zenda", email: process.env.EMAIL_USER || 'zenda@gmail.com' },
                    to: [{ email: email }],
                    subject: 'Tu código de verificación de Zenda',
                    htmlContent: htmlContent
                })
            });
            if (!response.ok) throw new Error("Brevo API rechazó la solicitud");
            res.status(200).json({ success: true, message: "Código enviado exitosamente" });
        } catch (error) {
            // Fallback de desarrollo: Imprime en consola si falla la red
            console.log(`\n⚠️ MODO DE PRUEBA: Usa este código para verificar en la app: [ ${codigo} ]\n`);
            res.status(200).json({ success: true, message: "Modo prueba: Revisa la consola." });
        }
    });
});

// --- RUTA 2: VERIFICAR CÓDIGO Y REGISTRAR USUARIO ---
router.post('/register', async (req, res) => {
    const { nombre, email, password, rol, telefono, codigo } = req.body; // Extraemos variables
    const registro = registrosPendientes.get(email); // Buscamos si existe un registro pendiente

    if (!registro) return res.status(400).json({ error: "Código incorrecto o no solicitado" });
    if (Date.now() > registro.expiresAt) { // Verificamos la regla de los 5 minutos de tiempo
        registrosPendientes.delete(email); // Limpiamos caché expirada
        return res.status(400).json({ error: "El código ha expirado." });
    }
    if (registro.codigo !== codigo) return res.status(400).json({ error: "Código incorrecto" });

    try {
        const hashedPass = await bcrypt.hash(password, 10); // Encriptamos con 10 rondas de 'salt' (estándar seguro)
        db.query('INSERT INTO usuarios (nombre, email, password, rol, telefono) VALUES (?, ?, ?, ?, ?)', 
        [nombre, email, hashedPass, rol, telefono], (err, result) => {
            if (err) return res.status(400).json({ error: "Error al registrar en la base de datos" });
            registrosPendientes.delete(email); // Eliminamos el código porque ya se usó con éxito

            // Si el rol es negocio, necesitamos inicializar tablas satélite vacías
            if (rol === 'negocio') {
                db.query('INSERT INTO direcciones (latitud, longitud) VALUES (NULL, NULL)', (err, dirResult) => {
                    if (!err) db.query('INSERT INTO negocios (dueno_id, direccion_id, nombre_negocio, hora_apertura, hora_cierre, intervalo_minutos) VALUES (?, ?, ?, "09:00:00", "18:00:00", 60)', [result.insertId, dirResult.insertId, nombre]);
                });
            }
            res.status(201).json({ userId: result.insertId, rol }); // Respondemos éxito
        });
    } catch (err) { res.status(500).json({ error: "Error interno del servidor" }); }
});

module.exports = router; // Exportamos las rutas para usarlas en server.js