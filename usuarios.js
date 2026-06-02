const express = require('express');
const router = express.Router();
const db = require('./database');

// Extraer datos públicos de Perfil Modal
router.get('/usuario/:id', (req, res) => {
    // Se pide de manera explícita evitar extraer la contraseña (password) de la BD por seguridad.
    db.query('SELECT nombre, email, telefono, rol FROM usuarios WHERE id = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: "Error DB" });
        if (results.length === 0) return res.status(404).json({ error: "No encontrado" });
        res.json(results[0]);
    });
});

// --- RUTA: ELIMINACIÓN DE CUENTA DEFINITIVA ---
router.delete('/usuario/:id', (req, res) => {
    // Gracias al "ON DELETE CASCADE" que definimos en el script de MySQL Database.sql,
    // al borrar el usuario aquí, MySQL de forma reactiva y automática borrará los
    // negocios de este dueño y TODAS sus citas asociadas. (Cero código extra).
    db.query('DELETE FROM usuarios WHERE id = ?', [req.params.id], (err) => {
        if (err) {
            console.error("Error borrando:", err);
            return res.status(500).json({ error: "Fallo servidor" });
        }
        res.json({ success: true });
    });
});

module.exports = router;