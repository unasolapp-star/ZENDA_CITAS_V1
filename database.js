const mysql = require('mysql2'); // Importamos la librería de MySQL
require('dotenv').config(); // Cargamos las variables de entorno

// 1. CONFIGURACIÓN DE CONEXIÓN A LA BASE DE DATOS
// Usamos createPool en lugar de createConnection para manejar múltiples peticiones simultáneas de forma eficiente.
const db = mysql.createPool({
    host: process.env.MYSQLHOST || 'localhost',     // Host de la base de datos (Ej: Railway o Local)
    user: process.env.MYSQLUSER || 'root',          // Usuario de la base de datos
    password: process.env.MYSQLPASSWORD || '1234',  // Contraseña de la base de datos
    database: process.env.MYSQLDATABASE || 'Citas', // Nombre de la base de datos
    port: process.env.MYSQLPORT || 3306,            // Puerto por defecto de MySQL
    waitForConnections: true,                       // Esperar en cola si no hay conexiones disponibles
    connectionLimit: 10,                            // Máximo de 10 conexiones al mismo tiempo
    queueLimit: 0                                   // Sin límite de peticiones en cola (0 = ilimitado)
});

// Verificamos si la conexión inicial es exitosa al arrancar el módulo
db.getConnection((err, connection) => {
    if (err) console.error('❌ Error conectando a MySQL:', err); // Si hay error, lo mostramos
    else console.log('✅ Zenda conectado a MySQL'); // Mensaje de éxito
    if (connection) connection.release(); // Siempre debemos liberar la conexión para no saturar el Pool
});

module.exports = db; // Exportamos el pool para poder importarlo en nuestros archivos de rutas