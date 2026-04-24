const mysql = require('mysql2');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const app = express();

app.use(cors());
app.use(express.json());
// Esto le dice a Node.js que sirva todos tus archivos HTML, CSS y JS al público
app.use(express.static(__dirname));
// Exponer la carpeta uploads para que se puedan ver las imágenes
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 1. CONFIGURACIÓN DE CONEXIÓN
const db = mysql.createConnection({
    host: process.env.MYSQLHOST || 'localhost',
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || '1234', 
    database: process.env.MYSQLDATABASE || 'Citas',
    port: process.env.MYSQLPORT || 3306
});

db.connect(err => {
    if (err) {
        console.error('❌ Error conectando a MySQL:', err);
        return;
    }
    console.log('✅ Zenda conectado a MySQL Local (BD: Citas)');
});

// 2. RUTA DE REGISTRO
app.post('/register', async (req, res) => {
    const { nombre, email, password, rol, telefono } = req.body;
    try {
        const hashedPass = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO usuarios (nombre, email, password, rol, telefono) VALUES (?, ?, ?, ?, ?)';
        
        db.query(query, [nombre, email, hashedPass, rol, telefono], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(400).json({ error: "El correo ya existe" });
            }
            
            if (rol === 'negocio') {
                // 1. Crea dirección vacía 2. Vincula dirección al negocio
                db.query('INSERT INTO direcciones (calle, colonia, referencia) VALUES ("", "", "")', (err, dirResult) => {
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
        if (err) return res.status(500).json({ error: "Error en la base de datos" });
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
    let dataQuery = 'SELECT n.*, d.calle, d.colonia, d.referencia FROM negocios n LEFT JOIN direcciones d ON n.direccion_id = d.id';
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
    const q = `SELECT n.*, d.calle, d.colonia, d.referencia, 
               (SELECT GROUP_CONCAT(dia_semana) FROM negocios_dias WHERE negocio_id = n.id) as dias_habiles 
               FROM negocios n LEFT JOIN direcciones d ON n.direccion_id = d.id WHERE n.dueno_id = ?`;
    db.query(q, [req.params.duenoId], (err, results) => {
        if (err) return res.status(500).json({ error: "Error de servidor" });
        res.json(results[0] || {});
    });
});

app.get('/mi-negocio-detalles/:id', (req, res) => {
    const q = `SELECT n.*, d.calle, d.colonia, d.referencia, 
               (SELECT GROUP_CONCAT(dia_semana) FROM negocios_dias WHERE negocio_id = n.id) as dias_habiles 
               FROM negocios n LEFT JOIN direcciones d ON n.direccion_id = d.id WHERE n.id = ?`;
    db.query(q, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: "Error de servidor" });
        res.json(results[0] || {});
    });
});

// Actualización completa normalizada
app.put('/actualizar-negocio/:duenoId', (req, res) => {
    const { nombre_negocio, telefono_negocio, categoria, calle, colonia, referencia, hora_apertura, hora_cierre, intervalo_minutos, dias_habiles } = req.body;
    
    // 1. Encontrar IDs involucrados
    db.query('SELECT id, direccion_id FROM negocios WHERE dueno_id = ?', [req.params.duenoId], (err, results) => {
        if (err || results.length === 0) return res.status(500).json({ error: "Negocio no encontrado" });
        
        const negId = results[0].id;
        const dirId = results[0].direccion_id;

        // 2. Actualizar tabla Direcciones
        db.query('UPDATE direcciones SET calle = ?, colonia = ?, referencia = ? WHERE id = ?', [calle, colonia, referencia, dirId], (err) => {
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor ZENDA corriendo en http://localhost:${PORT}`);
});