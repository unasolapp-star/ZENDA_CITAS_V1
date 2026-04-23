CREATE DATABASE IF NOT EXISTS `citas` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE `citas`;

-- Primero eliminamos las tablas en orden inverso para evitar conflictos con las llaves foráneas
DROP TABLE IF EXISTS `citas`;
DROP TABLE IF EXISTS `negocios_dias`;
DROP TABLE IF EXISTS `negocios`;
DROP TABLE IF EXISTS `direcciones`;
DROP TABLE IF EXISTS `usuarios`;

-- 1. Tabla de Usuarios
CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) DEFAULT NULL,
  `email` varchar(150) NOT NULL,
  `password` varchar(255) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `rol` enum('cliente','negocio') NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. Tabla de Direcciones (Normalización 3FN)
CREATE TABLE `direcciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `calle` varchar(100) DEFAULT NULL,
  `colonia` varchar(100) DEFAULT NULL,
  `referencia` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. Tabla de Negocios
CREATE TABLE `negocios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `dueno_id` int DEFAULT NULL,
  `direccion_id` int DEFAULT NULL,
  `nombre_negocio` varchar(100) DEFAULT NULL,
  `categoria` varchar(50) DEFAULT NULL,
  `telefono_negocio` varchar(20) DEFAULT NULL,
  `logo_url` text,
  `hora_apertura` time DEFAULT '09:00:00',
  `hora_cierre` time DEFAULT '18:00:00',
  `intervalo_minutos` int DEFAULT 60,
  PRIMARY KEY (`id`),
  KEY `dueno_id` (`dueno_id`),
  KEY `direccion_id` (`direccion_id`),
  CONSTRAINT `negocios_ibfk_1` FOREIGN KEY (`dueno_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `negocios_ibfk_2` FOREIGN KEY (`direccion_id`) REFERENCES `direcciones` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3.1 Tabla de Días Hábiles (Normalización 1FN)
CREATE TABLE `negocios_dias` (
  `id` int NOT NULL AUTO_INCREMENT,
  `negocio_id` int NOT NULL,
  `dia_semana` int NOT NULL COMMENT '1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado, 7=Domingo',
  PRIMARY KEY (`id`),
  KEY `negocio_id` (`negocio_id`),
  CONSTRAINT `negocios_dias_ibfk_1` FOREIGN KEY (`negocio_id`) REFERENCES `negocios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 4. Tabla de Citas
CREATE TABLE `citas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cliente_id` int DEFAULT NULL,
  `negocio_id` int DEFAULT NULL,
  `fecha` date NOT NULL,
  `hora` time NOT NULL,
  `estado` varchar(20) DEFAULT 'confirmada',
  PRIMARY KEY (`id`),
  KEY `cliente_id` (`cliente_id`),
  KEY `negocio_id` (`negocio_id`),
  CONSTRAINT `citas_ibfk_1` FOREIGN KEY (`cliente_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `citas_ibfk_2` FOREIGN KEY (`negocio_id`) REFERENCES `negocios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------
-- INSERCIÓN DE DATOS DE PRUEBA
-- --------------------------------------------------------

INSERT INTO `usuarios` (`id`, `nombre`, `email`, `password`, `telefono`, `rol`) VALUES 
(1, 'Noe de jesus cagal Ambrozio', 'shuashfuh@gmail.com', '$2b$10$Jsgus2PopJhL5TtzSeGygeo4co703H4zSQVdfcd4bnBY8bsK1DvtG', '12345678901', 'negocio'),
(2, 'aLAN jONUHE fERNANDEZ aZAMAR', 'DJQAUIJD@gmail.com', '$2b$10$FiYD8z5DxeBqIB/qkmunxOEsh0H3D.YyWf32ArRrA0qEOSWHaydu6', '123456789012', 'cliente');

INSERT INTO `direcciones` (`id`, `calle`, `colonia`, `referencia`) VALUES 
(1, 'Jose giadans #14', 'Magda Morelo de carvajal', 'asas');

INSERT INTO `negocios` (`id`, `dueno_id`, `direccion_id`, `nombre_negocio`, `categoria`, `telefono_negocio`, `logo_url`, `hora_apertura`, `hora_cierre`, `intervalo_minutos`) VALUES 
(1, 1, 1, 'haka', 'Dentista', '24910296161', '', '10:00:00', '18:00:00', 30);

INSERT INTO `citas` (`id`, `cliente_id`, `negocio_id`, `fecha`, `hora`, `estado`) VALUES 
(11, 2, 1, '2026-02-25', '16:00:00', 'confirmada'),
(12, 2, 1, '2026-02-11', '09:00:00', 'confirmada'),
(13, 2, 1, '2026-02-25', '09:00:00', 'confirmada'),
(15, 2, 1, '2026-02-26', '16:30:00', 'confirmada'),
(17, 2, 1, '2131-03-04', '10:00:00', 'confirmada'),
(18, 2, 1, '2026-03-12', '13:00:00', 'confirmada');