const express = require('express'); // Importamos Express
const router = express.Router(); // Módulo de enrutador
const db = require('../config/database'); // Importamos DB
const multer = require('multer'); // Librería para manipular subida de archivos Form-Data
const sharp = require('sharp'); // Librería para manipular e interceptar imágenes
const path = require('path');
const fs = require('fs');

// Crea la carpeta public de uploads si no existiese para evitar crasheos del servidor
if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');

// Asignamos memoria RAM a Multer para poder interceptar la imagen con Sharp en crudo (buffer)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// --- RUTA: OBTENER LISTA PAGINADA DE NEGOCIOS ---
router.get('/negocios', (req, res) => {
    const page = parseInt(req.query.page) || 1; // Página actual (default 1)
    const limit = parseInt(req.query.limit) || 10; // Límite por página (default 10)
    const offset = (page - 1) * limit; // Fórmula matemática para calcular desde dónde cortar la DB
    const categoria = req.query.categoria || 'Todas'; // Categoría filtrada

    // Queries dinámicas (Se concatenan dependiendo de los filtros)
    let countQuery = 'SELECT COUNT(*) as total FROM negocios n';
    let dataQuery = 'SELECT n.*, d.latitud, d.longitud FROM negocios n LEFT JOIN direcciones d ON n.direccion_id = d.id';
    let queryParams = [];

    if (categoria !== 'Todas') { // Si hay categoría, inyectamos la validación WHERE
        countQuery += ' WHERE IFNULL(n.categoria, "Servicios") = ?';
        dataQuery += ' WHERE IFNULL(n.categoria, "Servicios") = ?';
        queryParams.push(categoria);
    }

    dataQuery += ' LIMIT ? OFFSET ?'; // Agregamos la restricción de paginación al final
    let dataParams = [...queryParams, limit, offset];

    db.query(countQuery, queryParams, (err, countResult) => { // Ejecuta Query 1: Conteo
        if (err) return res.status(500).json({ error: "Error contando negocios" });
        const total = countResult[0].total; // Total de filas
        db.query(dataQuery, dataParams, (err, results) => { // Ejecuta Query 2: Extracción de datos
            if (err) return res.status(500).json({ error: "Error al obtener negocios" });
            res.json({ data: results, total, page, totalPages: Math.ceil(total / limit) }); // Responde la data empaquetada
        });
    });
});

// --- RUTA: OBTENER CATEGORÍAS ÚNICAS ---
router.get('/categorias', (req, res) => {
    // DISTINCT permite traer valores únicos para llenar el selector del frontend dinámicamente
    db.query("SELECT DISTINCT IFNULL(categoria, 'Servicios') as categoria FROM negocios", (err, results) => {
        if (err) return res.status(500).json({ error: "Error DB" });
        res.json(results.map(r => r.categoria)); // Simplificamos objeto a arreglo simple
    });
});

// --- RUTA: ACTUALIZAR EL PERFIL DEL NEGOCIO (DUEÑO) ---
router.put('/actualizar-negocio/:duenoId', (req, res) => {
    const { nombre_negocio, telefono_negocio, categoria, latitud, longitud, hora_apertura, hora_cierre, intervalo_minutos, dias_habiles } = req.body;
    
    db.query('SELECT id, direccion_id FROM negocios WHERE dueno_id = ?', [req.params.duenoId], (err, results) => {
        if (err || results.length === 0) return res.status(500).json({ error: "No encontrado" });
        const negId = results[0].id; const dirId = results[0].direccion_id;

        // Operación encadenada: 1. Actualizar Dirección 
        db.query('UPDATE direcciones SET latitud = ?, longitud = ? WHERE id = ?', [latitud, longitud, dirId], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            
            // Operación encadenada: 2. Actualizar Tabla Negocio
            const qNegocio = 'UPDATE negocios SET nombre_negocio = ?, telefono_negocio = ?, categoria = ?, hora_apertura = ?, hora_cierre = ?, intervalo_minutos = ? WHERE id = ?';
            db.query(qNegocio, [nombre_negocio, telefono_negocio, categoria, hora_apertura, hora_cierre, intervalo_minutos, negId], (err) => {
                if (err) return res.status(500).json({ error: err.message });

                // Operación encadenada: 3. Estrategia 'Drop & Insert' para los Días Hábiles
                db.query('DELETE FROM negocios_dias WHERE negocio_id = ?', [negId], (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    if (dias_habiles && dias_habiles.trim() !== "") { // Si se seleccionó algún día, se insertan en lote
                        const diasValues = dias_habiles.split(',').map(d => [negId, d]);
                        db.query('INSERT INTO negocios_dias (negocio_id, dia_semana) VALUES ?', [diasValues], (err) => {
                            if (err) return res.status(500).json({ error: err.message });
                            res.json({ message: "Datos actualizados" });
                        });
                    } else { res.json({ message: "Datos actualizados sin días asignados" }); }
                });
            });
        });
    });
});

// --- RUTA: SUBIR LOGOTIPO ---
router.post('/upload-logo/:duenoId', upload.single('logo'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No se subió ningún archivo" });
    
    // Generamos un nombre único usando Timestamp para evitar sobreescritura accidental
    const filename = 'logo-' + Date.now() + '.webp';
    const filepath = path.join(__dirname, '../../uploads', filename); // Retrocedemos dos carpetas hasta llegar a root
    const logoUrl = `/uploads/${filename}`;
    
    try {
        // Invocamos a Sharp para procesar el buffer en memoria RAM
        await sharp(req.file.buffer)
            .resize(300, 300, { fit: 'cover' }) // Forzamos formato cuadrado (300x300px)
            .webp({ quality: 80 }) // Lo convertimos al formato moderno y óptimo WebP
            .toFile(filepath); // Guardamos directamente en disco duro
            
        // Inyectamos la URL a la Base de Datos
        db.query('UPDATE negocios SET logo_url = ? WHERE dueno_id = ?', [logoUrl, req.params.duenoId], (err) => {
            if (err) return res.status(500).json({ error: "Error al DB" });
            res.json({ logo_url: logoUrl }); // Retornamos éxito al front
        });
    } catch (err) { res.status(500).json({ error: "Error procesando imagen" }); }
});

module.exports = router;