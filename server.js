try {
    require('dotenv').config(); // Cargamos variables secretas de Railway / Entorno
} catch (error) {
    console.log("dotenv no encontrado, usando variables de entorno nativas (modo producción).");
}
const express = require('express');
const cors = require('cors');
const path = require('path');

// --- IMPORTACIÓN DE RUTAS MODULARES ---
// Se divide la lógica en archivos separados para eliminar el "Código Espagueti"
const authRoutes = require('./src/routes/auth');
const negocioRoutes = require('./src/routes/negocios');
const citaRoutes = require('./src/routes/citas');
const usuarioRoutes = require('./src/routes/usuarios');

const app = express();

// --- MIDDLEWARES GLOBALES ---
app.use(cors()); // Permitir peticiones cruzadas desde el frontend
app.use(express.json()); // Habilitar la lectura de JSON en el cuerpo de las peticiones
app.use(express.static(__dirname)); // Servir archivos HTML/CSS/JS públicos
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Servir imágenes estáticas

// --- REGISTRO DE RUTAS ---
// Integramos las rutas en la raíz para mantener compatibilidad total con el Frontend
app.use('/', authRoutes);
app.use('/', negocioRoutes);
app.use('/', citaRoutes);
app.use('/', usuarioRoutes);

// --- INICIO DEL SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor ZENDA corriendo en el puerto ${PORT}`);
});