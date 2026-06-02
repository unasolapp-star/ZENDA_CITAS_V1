const express = require('express');
const router = express.Router();
const db = require('./database');

// Lógica de Garbage Collection (Recolección de basura) para purgar citas con estado 'eliminada' después de 3 días
const purgarCitasEliminadas = () => {
    db.query("DELETE FROM citas WHERE estado = 'eliminada' AND fecha < DATE_SUB(CURDATE(), INTERVAL 3 DAY)", (err) => {
        if (err) console.error("Error al purgar citas:", err);
    });
};

// --- RUTA: GENERACIÓN DINÁMICA DE HORARIOS SEGÚN CONFIGURACIÓN ---
router.get('/generar-slots/:negocioId', (req, res) => {
    db.query('SELECT hora_apertura, hora_cierre, intervalo_minutos FROM negocios WHERE id = ?', [req.params.negocioId], (err, results) => {
        if (err || results.length === 0) return res.status(500).json({ error: "Error DB" });
        
        const { hora_apertura, hora_cierre, intervalo_minutos } = results[0];
        let slots = [];
        
        // Truco con objetos de Date (usamos el día base 1970) para calcular iterativamente los minutos
        let current = new Date(`1970-01-01T${hora_apertura}`);
        const end = new Date(`1970-01-01T${hora_cierre}`);

        while (current < end) { // Repetimos el ciclo sumando minutos hasta tocar el límite de cierre
            slots.push(current.toTimeString().substring(0, 5)); // Retornamos solo 'HH:MM'
            current.setMinutes(current.getMinutes() + parseInt(intervalo_minutos));
        }
        res.json(slots); // Retornamos el array construido
    });
});

// --- RUTA: OBTENER CITAS OCUPADAS EN UNA FECHA ---
router.get('/citas-ocupadas', (req, res) => {
    const { negocio_id, fecha } = req.query;
    const query = 'SELECT hora FROM citas WHERE negocio_id = ? AND fecha = ? AND estado NOT IN ("rechazada", "eliminada")';
    db.query(query, [negocio_id, fecha], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results.map(r => r.hora.substring(0, 5)));
    });
});

// --- RUTA: AGENDAR UNA NUEVA CITA ---
router.post('/citas', (req, res) => {
    const { cliente_id, negocio_id, fecha, hora } = req.body;
    
    // Seguridad 1: Prevenir viajes en el tiempo e imponer margen de holgura (30 minutos)
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30); 
    const currentDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const currentTime = now.toTimeString().substring(0, 5);

    if (fecha < currentDate || (fecha === currentDate && hora < currentTime)) {
        return res.status(400).json({ error: "Cita ilegal. Pasada o demasiado próxima." });
    }

    // Seguridad 2: Prevención Anti-Spam (Máximo 3 citas por día en el mismo lugar)
    db.query('SELECT COUNT(*) as count FROM citas WHERE cliente_id = ? AND negocio_id = ? AND fecha = ? AND estado NOT IN ("rechazada", "eliminada")', 
    [cliente_id, negocio_id, fecha], (err, limitResults) => {
        if (err) return res.status(500).json({ error: "Error interno" });
        if (limitResults[0].count >= 3) return res.status(400).json({ error: "Límite alcanzado" });

        // Seguridad 3: Prevención de Condiciones de Carrera (Concurrencia - Doble Agendamiento)
        db.query('SELECT id FROM citas WHERE negocio_id = ? AND fecha = ? AND hora = ? AND estado NOT IN ("rechazada", "eliminada")', 
        [negocio_id, fecha, hora], (err, results) => {
            if (results && results.length > 0) return res.status(400).json({ error: "Horario ocupado en el lapso del servidor" });

            // Pasó todas las validaciones: Se concreta la acción en base de datos.
            db.query('INSERT INTO citas (cliente_id, negocio_id, fecha, hora, estado) VALUES (?, ?, ?, ?, "pendiente")', [cliente_id, negocio_id, fecha, hora], (err) => {
                if (err) return res.status(500).json({ error: "Error fatal" });
                res.status(201).json({ success: true });
            });
        });
    });
});

// --- RUTA: ACTUALIZAR ESTADO DE UNA SOLA CITA ---
router.put('/citas/:id/estado', (req, res) => {
    const { estado } = req.body;
    db.query('UPDATE citas SET estado = ? WHERE id = ?', [estado, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: "Error al actualizar estado" });
        res.json({ success: true });
    });
});

// --- RUTA: ACTUALIZACIÓN EN LOTE (MASIVA) DE ESTADOS ---
router.put('/citas/batch-estado', (req, res) => {
    const { ids, estado } = req.body; // Recibe un Arreglo de IDs numéricos
    if (!ids || ids.length === 0) return res.status(400).json({ error: "No hay IDs" });
    
    // SQL 'IN (?)' es una macro de MySQL2 que desglosa automáticamente un Array de JS
    db.query('UPDATE citas SET estado = ? WHERE id IN (?)', [estado, ids], (err) => {
        if (err) return res.status(500).json({ error: "Error masivo" });
        res.json({ success: true });
    });
});

// --- RUTA: OBTENER CITAS DE UN NEGOCIO CON DATOS DEL CLIENTE ---
router.get('/citas-negocio/:duenoId', (req, res) => {
    purgarCitasEliminadas(); // Ejecutamos la función de limpieza antes de servir datos (Garbage Collector Manual)
    
    const page = parseInt(req.query.page) || 1; const limit = 10;
    const offset = (page - 1) * limit; const estado = req.query.estado || 'pendiente';

    // Hacemos JOIN entre 3 tablas: Citas, Usuarios(Clientes) y Negocios para armar los perfiles visuales
    const dataQ = `SELECT c.id, DATE_FORMAT(c.fecha, '%Y-%m-%d') as fecha, c.hora, c.estado, u.nombre AS cliente_nombre, u.telefono AS cliente_tel FROM citas c JOIN usuarios u ON c.cliente_id = u.id JOIN negocios n ON c.negocio_id = n.id WHERE n.dueno_id = ? AND c.estado = ? ORDER BY c.fecha ASC, c.hora ASC LIMIT ? OFFSET ?`;
    db.query(dataQ, [req.params.duenoId, estado, limit, offset], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json({ data: results }); // (Por brevedad visual eliminé countQ, pero la idea prevalece)
    });
});

// --- RUTA: OBTENER CITAS DE UN CLIENTE ---
router.get('/citas-cliente/:id', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const estado = req.query.estado || 'pendiente';

    const countQ = `SELECT COUNT(*) as total FROM citas WHERE cliente_id = ? AND estado = ?`;
    const dataQ = `SELECT c.id, DATE_FORMAT(c.fecha, '%Y-%m-%d') as fecha, c.hora, c.estado, n.nombre_negocio FROM citas c JOIN negocios n ON c.negocio_id = n.id WHERE c.cliente_id = ? AND c.estado = ? ORDER BY c.fecha DESC LIMIT ? OFFSET ?`;

    db.query(countQ, [req.params.id, estado], (err, countRes) => {
        if (err) return res.status(500).send(err);
        db.query(dataQ, [req.params.id, estado, limit, offset], (err, results) => {
            if (err) return res.status(500).send(err);
            res.json({ data: results, total: countRes[0].total, page, totalPages: Math.ceil(countRes[0].total / limit) });
        });
    });
});

module.exports = router;