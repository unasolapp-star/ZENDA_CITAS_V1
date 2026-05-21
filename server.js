try {
    require('dotenv').config();
} catch (error) {
    console.log("dotenv no encontrado, usando variables de entorno nativas (modo producción).");
}
const mysql = require('mysql2');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const nodemailer = require('nodemailer');
const app = express();

app.use(cors());
app.use(express.json());
// Esto le dice a Node.js que sirva todos tus archivos HTML, CSS y JS al público
app.use(express.static(__dirname));
// Exponer la carpeta uploads para que se puedan ver las imágenes
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 1. CONFIGURACIÓN DE CONEXIÓN
const db = mysql.createPool({
    host: process.env.MYSQLHOST || 'localhost',
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || '1234', 
    database: process.env.MYSQLDATABASE || 'Citas',
    port: process.env.MYSQLPORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Error conectando a MySQL:', err);
        return;
    }
    console.log('✅ Zenda conectado a MySQL en Railway');
    connection.release();
});

// 1.5 CONFIGURACIÓN DE CORREO Y MEMORIA TEMPORAL
const registrosPendientes = new Map();

// ¡AQUÍ PONES TUS DATOS!
const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 465,
    secure: true, // true para el puerto 465
    auth: {
        user: process.env.EMAIL_USER || 'zenda.notificaciones@gmail.com', // Tu correo con el que te registraste en Brevo
        pass: process.env.EMAIL_PASS // La contraseña se leerá de las variables de entorno de Railway o tu archivo .env local
    },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 10000, // Aumentamos a 10 segundos el límite
    greetingTimeout: 10000,
    socketTimeout: 10000
});

// VERIFICADOR AUTOMÁTICO DE CONEXIÓN CON BREVO
transporter.verify((error, success) => {
    if (error) {
        console.error("⚠️ ERROR DE CONEXIÓN CON BREVO:", error.message);
    } else {
        console.log("✅ Conexión exitosa con Brevo. El servidor puede enviar correos.");
    }
});

// RUTA PARA GENERAR Y ENVIAR EL CÓDIGO REAL
app.post('/enviar-codigo', async (req, res) => {
    const { email } = req.body;

    // 1. Verificar si el correo ya existe en la base de datos ANTES de enviar nada
    db.query('SELECT id FROM usuarios WHERE email = ?', [email], async (err, results) => {
        if (err) return res.status(500).json({ error: "Error consultando la base de datos." });
        if (results.length > 0) return res.status(400).json({ error: "Este correo ya está registrado. Por favor, inicia sesión." });

        // 2. Si el correo es nuevo, generamos y enviamos el código
        const codigo = Math.floor(1000000 + Math.random() * 9000000).toString();
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutos de validez
        registrosPendientes.set(email, { codigo, expiresAt });

        const mailOptions = {
            from: '"Equipo Zenda" <' + (process.env.EMAIL_USER || 'zenda.notificaciones@gmail.com') + '>', // <--- REEMPLAZA AQUÍ TAMBIÉN
            to: email,
            subject: 'Tu código de verificación de Zenda',
            html: `
                <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; color: #1e293b;">
                    <h2 style="color: #2563eb;">¡Bienvenido a Zenda!</h2>
                    <p>Tu código de verificación seguro es:</p>
                    <h1 style="background: #f1f5f9; padding: 15px; border-radius: 10px; letter-spacing: 5px; font-size: 32px; display: inline-block;">${codigo}</h1>
                    <p>Ingrésalo en la plataforma para continuar con tu registro.</p>
                </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log(`📧 Correo real enviado a: ${email}`);
            res.status(200).json({ success: true, message: "Código enviado exitosamente" });
        } catch (error) {
            console.error("❌ Error enviando correo:", error);
            // MODO PRUEBA: Si falla el envío de correo, igual abrimos el modal en el frontend y mostramos el código aquí en consola.
            console.log(`\n⚠️ MODO DE PRUEBA: El correo falló, pero usa este código para verificar en la app: [ ${codigo} ]\n`);
            res.status(200).json({ success: true, message: "Modo prueba: Revisa la consola de Node para ver el código." });
        }
    });
});

// 2. RUTA DE REGISTRO
app.post('/register', async (req, res) => {
    const { nombre, email, password, rol, telefono, codigo } = req.body;

    // Validar que el código coincida
    const registro = registrosPendientes.get(email);
    if (!registro) return res.status(400).json({ error: "Código incorrecto o no solicitado" });

    if (Date.now() > registro.expiresAt) {
        registrosPendientes.delete(email);
        return res.status(400).json({ error: "El código ha expirado (pasaron 5 minutos). Solicita uno nuevo." });
    }

    if (registro.codigo !== codigo) return res.status(400).json({ error: "Código de verificación incorrecto" });

    try {
        const hashedPass = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO usuarios (nombre, email, password, rol, telefono) VALUES (?, ?, ?, ?, ?)';
        
        db.query(query, [nombre, email, hashedPass, rol, telefono], (err, result) => {
            if (err) {
                console.error("❌ Error en registro:", err);
                return res.status(400).json({ error: err.code === 'ER_DUP_ENTRY' ? "El correo ya existe" : "Error al registrar en la base de datos" });
            }
            
            // Si el registro fue un éxito, borramos el código de la memoria
            registrosPendientes.delete(email);

            if (rol === 'negocio') {
                // 1. Crea dirección vacía 2. Vincula dirección al negocio
                db.query('INSERT INTO direcciones (latitud, longitud) VALUES (NULL, NULL)', (err, dirResult) => {
                    if (!err) {
                        db.query('INSERT INTO negocios (dueno_id, direccion_id, nombre_negocio, hora_apertura, hora_cierre, intervalo_minutos) VALUES (?, ?, ?, "09:00:00", "18:00:00", 60)', 
                        [result.insertId, dirResult.insertId, nombre]);
                    }
                });
            }
            res.status(201).json({ userId: result.insertId, rol });
        });
    } catch (err) {
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// 3. RUTA DE LOGIN
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const query = 'SELECT * FROM usuarios WHERE email = ?';
    db.query(query, [email], async (err, results) => {
        if (err) {
            console.error("❌ Error en login:", err);
            return res.status(500).json({ error: "Error en la base de datos al iniciar sesión" });
        }
        if (results.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });

        const match = await bcrypt.compare(password, results[0].password);
        if (!match) return res.status(401).json({ error: "Contraseña incorrecta" });

        res.json({ userId: results[0].id, rol: results[0].rol });
    });
});

// 4. RUTAS DE NEGOCIOS Y CONFIGURACIÓN
app.get('/negocios', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const categoria = req.query.categoria || 'Todas';

    let countQuery = 'SELECT COUNT(*) as total FROM negocios n';
    let dataQuery = 'SELECT n.*, d.latitud, d.longitud FROM negocios n LEFT JOIN direcciones d ON n.direccion_id = d.id';
    let queryParams = [];

    if (categoria !== 'Todas') {
        countQuery += ' WHERE IFNULL(n.categoria, "Servicios") = ?';
        dataQuery += ' WHERE IFNULL(n.categoria, "Servicios") = ?';
        queryParams.push(categoria);
    }

    dataQuery += ' LIMIT ? OFFSET ?';
    let dataParams = [...queryParams, limit, offset];

    db.query(countQuery, queryParams, (err, countResult) => {
        if (err) return res.status(500).json({ error: "Error contando negocios" });
        const total = countResult[0].total;

        db.query(dataQuery, dataParams, (err, results) => {
            if (err) return res.status(500).json({ error: "Error al obtener negocios" });
            res.json({ data: results, total, page, totalPages: Math.ceil(total / limit) });
        });
    });
});

app.get('/categorias', (req, res) => {
    db.query("SELECT DISTINCT IFNULL(categoria, 'Servicios') as categoria FROM negocios", (err, results) => {
        if (err) return res.status(500).json({ error: "Error al obtener categorías" });
        res.json(results.map(r => r.categoria));
    });
});

app.get('/mi-negocio/:duenoId', (req, res) => {
    const q = `SELECT n.*, d.latitud, d.longitud,
               (SELECT GROUP_CONCAT(dia_semana) FROM negocios_dias WHERE negocio_id = n.id) as dias_habiles 
               FROM negocios n LEFT JOIN direcciones d ON n.direccion_id = d.id WHERE n.dueno_id = ?`;
    db.query(q, [req.params.duenoId], (err, results) => {
        if (err) return res.status(500).json({ error: "Error de servidor" });
        res.json(results[0] || {});
    });
});

app.get('/mi-negocio-detalles/:id', (req, res) => {
    const q = `SELECT n.*, d.latitud, d.longitud,
               (SELECT GROUP_CONCAT(dia_semana) FROM negocios_dias WHERE negocio_id = n.id) as dias_habiles 
               FROM negocios n LEFT JOIN direcciones d ON n.direccion_id = d.id WHERE n.id = ?`;
    db.query(q, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: "Error de servidor" });
        res.json(results[0] || {});
    });
});

// Actualización completa normalizada
app.put('/actualizar-negocio/:duenoId', (req, res) => {
    const { nombre_negocio, telefono_negocio, categoria, latitud, longitud, hora_apertura, hora_cierre, intervalo_minutos, dias_habiles } = req.body;
    
    // 1. Encontrar IDs involucrados
    db.query('SELECT id, direccion_id FROM negocios WHERE dueno_id = ?', [req.params.duenoId], (err, results) => {
        if (err || results.length === 0) return res.status(500).json({ error: "Negocio no encontrado" });
        
        const negId = results[0].id;
        const dirId = results[0].direccion_id;

        // 2. Actualizar tabla Direcciones
        db.query('UPDATE direcciones SET latitud = ?, longitud = ? WHERE id = ?', [latitud, longitud, dirId], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            
            // 3. Actualizar tabla Negocios
            const qNegocio = 'UPDATE negocios SET nombre_negocio = ?, telefono_negocio = ?, categoria = ?, hora_apertura = ?, hora_cierre = ?, intervalo_minutos = ? WHERE id = ?';
            db.query(qNegocio, [nombre_negocio, telefono_negocio, categoria, hora_apertura, hora_cierre, intervalo_minutos, negId], (err) => {
                if (err) return res.status(500).json({ error: err.message });

                // 4. Limpiar y recrear Días Hábiles
                db.query('DELETE FROM negocios_dias WHERE negocio_id = ?', [negId], (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    
                    if (dias_habiles && dias_habiles.trim() !== "") {
                        const diasValues = dias_habiles.split(',').map(d => [negId, d]);
                        db.query('INSERT INTO negocios_dias (negocio_id, dia_semana) VALUES ?', [diasValues], (err) => {
                            if (err) return res.status(500).json({ error: err.message });
                            res.json({ message: "Datos actualizados con éxito" });
                        });
                    } else {
                        res.json({ message: "Datos actualizados con éxito" });
                    }
                });
            });
        });
    });
});

// --------------------------------------------------------
// NUEVO: SUBIDA DE LOGO (MULTER)
// --------------------------------------------------------
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}
// Cambiamos a memoryStorage para poder procesar la imagen antes de guardarla en el disco
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post('/upload-logo/:duenoId', upload.single('logo'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No se subió ningún archivo" });
    
    const filename = 'logo-' + Date.now() + '.webp';
    const filepath = path.join(__dirname, 'uploads', filename);
    const logoUrl = `/uploads/${filename}`;
    
    try {
        await sharp(req.file.buffer)
            .resize(300, 300, { fit: 'cover' }) // Recorta la imagen a un cuadrado de 300x300px
            .webp({ quality: 80 }) // La convierte a formato WebP optimizado
            .toFile(filepath);
            
        db.query('UPDATE negocios SET logo_url = ? WHERE dueno_id = ?', [logoUrl, req.params.duenoId], (err) => {
            if (err) return res.status(500).json({ error: "Error al guardar el logo" });
            res.json({ logo_url: logoUrl });
        });
    } catch (err) {
        console.error("Error procesando imagen con sharp:", err);
        res.status(500).json({ error: "Error al procesar y guardar la imagen" });
    }
});

// 5. LÓGICA DE GENERACIÓN DE SLOTS DINÁMICOS
app.get('/generar-slots/:negocioId', (req, res) => {
    const query = 'SELECT hora_apertura, hora_cierre, intervalo_minutos FROM negocios WHERE id = ?';
    db.query(query, [req.params.negocioId], (err, results) => {
        if (err || results.length === 0) return res.status(500).json({ error: "Error al obtener configuración" });
        
        const { hora_apertura, hora_cierre, intervalo_minutos } = results[0];
        let slots = [];
        
        // Convertimos a objeto Date para manipular el tiempo fácilmente
        let current = new Date(`1970-01-01T${hora_apertura}`);
        const end = new Date(`1970-01-01T${hora_cierre}`);

        while (current < end) {
            slots.push(current.toTimeString().substring(0, 5));
            current.setMinutes(current.getMinutes() + parseInt(intervalo_minutos));
        }
        res.json(slots);
    });
});

// 6. RUTAS DE CITAS
app.get('/citas-ocupadas', (req, res) => {
    const { negocio_id, fecha } = req.query;
    const query = 'SELECT hora FROM citas WHERE negocio_id = ? AND fecha = ? AND estado NOT IN ("rechazada", "eliminada")';
    db.query(query, [negocio_id, fecha], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results.map(r => r.hora.substring(0, 5)));
    });
});

app.post('/citas', (req, res) => {
    const { cliente_id, negocio_id, fecha, hora } = req.body;
    
    // 0. Validar que la fecha y hora no sean en el pasado ni muy cercanas
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30); // Agregamos un margen de 30 minutos
    const currentDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const currentTime = now.toTimeString().substring(0, 5);

    if (fecha < currentDate || (fecha === currentDate && hora < currentTime)) {
        return res.status(400).json({ error: "No puedes agendar citas en el pasado o con menos de 30 minutos de anticipación." });
    }

    // 1. Verificar el límite de citas por día (Máximo 3)
    const limitQuery = 'SELECT COUNT(*) as count FROM citas WHERE cliente_id = ? AND negocio_id = ? AND fecha = ? AND estado NOT IN ("rechazada", "eliminada")';
    db.query(limitQuery, [cliente_id, negocio_id, fecha], (err, limitResults) => {
        if (err) return res.status(500).json({ error: "Error al verificar el límite de citas" });
        
        if (limitResults[0].count >= 3) {
            return res.status(400).json({ error: "Has alcanzado el límite de 3 citas por día en este negocio" });
        }

        // 2. Verificar disponibilidad del horario
        const checkQuery = 'SELECT id FROM citas WHERE negocio_id = ? AND fecha = ? AND hora = ? AND estado NOT IN ("rechazada", "eliminada")';
        db.query(checkQuery, [negocio_id, fecha, hora], (err, results) => {
            if (results && results.length > 0) return res.status(400).json({ error: "Este horario ya fue reservado" });

            // 3. Insertar la cita
            const query = 'INSERT INTO citas (cliente_id, negocio_id, fecha, hora, estado) VALUES (?, ?, ?, ?, "pendiente")';
            db.query(query, [cliente_id, negocio_id, fecha, hora], (err) => {
                if (err) return res.status(500).json({ error: "Error al agendar" });
                res.status(201).json({ success: true });
            });
        });
    });
});

// ACTUALIZAR ESTADO DE UNA SOLA CITA
app.put('/citas/:id/estado', (req, res) => {
    const { estado } = req.body;
    db.query('UPDATE citas SET estado = ? WHERE id = ?', [estado, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: "Error al actualizar estado" });
        res.json({ success: true });
    });
});

// ACTUALIZAR ESTADO EN LOTE (MÚLTIPLES CITAS)
app.put('/citas/batch-estado', (req, res) => {
    const { ids, estado } = req.body;
    if (!ids || ids.length === 0) return res.status(400).json({ error: "Sin IDs" });
    db.query('UPDATE citas SET estado = ? WHERE id IN (?)', [estado, ids], (err) => {
        if (err) return res.status(500).json({ error: "Error en actualización masiva" });
        res.json({ success: true });
    });
});

// Limpiador automático: Elimina citas en estado 'eliminada' más antiguas a 3 días.
const purgarCitasEliminadas = () => {
    db.query("DELETE FROM citas WHERE estado = 'eliminada' AND fecha < DATE_SUB(CURDATE(), INTERVAL 3 DAY)", (err) => {
        if (err) console.error("Error al purgar citas antiguas:", err);
    });
};

app.get('/citas-negocio/:duenoId', (req, res) => {
    purgarCitasEliminadas(); // Se ejecuta la purga antes de consultar
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const estado = req.query.estado || 'pendiente';

    const countQ = `SELECT COUNT(*) as total FROM citas c JOIN negocios n ON c.negocio_id = n.id WHERE n.dueno_id = ? AND c.estado = ?`;
    const dataQ = `SELECT c.id, DATE_FORMAT(c.fecha, '%Y-%m-%d') as fecha, c.hora, c.estado, u.nombre AS cliente_nombre, u.telefono AS cliente_tel 
                   FROM citas c JOIN usuarios u ON c.cliente_id = u.id JOIN negocios n ON c.negocio_id = n.id 
                   WHERE n.dueno_id = ? AND c.estado = ? ORDER BY c.fecha ASC, c.hora ASC LIMIT ? OFFSET ?`;

    db.query(countQ, [req.params.duenoId, estado], (err, countRes) => {
        if (err) return res.status(500).send(err);
        db.query(dataQ, [req.params.duenoId, estado, limit, offset], (err, results) => {
            if (err) return res.status(500).send(err);
            res.json({ data: results, total: countRes[0].total, page, totalPages: Math.ceil(countRes[0].total / limit) });
        });
    });
});

app.get('/citas-cliente/:id', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const estado = req.query.estado || 'pendiente';

    const countQ = `SELECT COUNT(*) as total FROM citas WHERE cliente_id = ? AND estado = ?`;
    const dataQ = `SELECT c.id, DATE_FORMAT(c.fecha, '%Y-%m-%d') as fecha, c.hora, c.estado, n.nombre_negocio 
                   FROM citas c JOIN negocios n ON c.negocio_id = n.id WHERE c.cliente_id = ? AND c.estado = ? 
                   ORDER BY c.fecha DESC LIMIT ? OFFSET ?`;

    db.query(countQ, [req.params.id, estado], (err, countRes) => {
        if (err) return res.status(500).send(err);
        db.query(dataQ, [req.params.id, estado, limit, offset], (err, results) => {
            if (err) return res.status(500).send(err);
            res.json({ data: results, total: countRes[0].total, page, totalPages: Math.ceil(countRes[0].total / limit) });
        });
    });
});

app.delete('/cancelar-cita/:id', (req, res) => {
    db.query('UPDATE citas SET estado = "eliminada" WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: "Error al cancelar" });
        res.json({ success: true });
    });
});

// 7. RUTA DE IDENTIDAD
app.get('/usuario-nombre/:id', (req, res) => {
    db.query('SELECT nombre FROM usuarios WHERE id = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: "Error de servidor" });
        if (results.length === 0) return res.status(404).json({ error: "No encontrado" });
        res.json({ nombre: results[0].nombre });
    });
});

// OBTENER TODOS LOS DATOS DEL PERFIL (EXCEPTO CONTRASEÑA)
app.get('/usuario/:id', (req, res) => {
    db.query('SELECT nombre, email, telefono, rol FROM usuarios WHERE id = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: "Error de servidor" });
        if (results.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });
        res.json(results[0]);
    });
});

// ELIMINAR USUARIO (ON DELETE CASCADE BORRARÁ NEGOCIOS Y CITAS AUTOMÁTICAMENTE)
app.delete('/usuario/:id', (req, res) => {
    db.query('DELETE FROM usuarios WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: "Error al eliminar usuario" });
        res.json({ success: true });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor ZENDA corriendo en el puerto ${PORT}`);
});