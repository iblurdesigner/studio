-- PostgreSQL 17 dump
-- Convertido desde MySQL 8.0 dump
-- Base de datos: textscan_comprob_db

BEGIN;

DROP TABLE IF EXISTS comprobante_items CASCADE;
DROP TABLE IF EXISTS comprobantes CASCADE;
DROP VIEW IF EXISTS v_comprobantes_completos CASCADE;
DROP FUNCTION IF EXISTS get_next_sequence_number CASCADE;
DROP PROCEDURE IF EXISTS create_comprobante CASCADE;

CREATE TABLE comprobantes (
    id SERIAL PRIMARY KEY,
    numero_secuencia VARCHAR(20) NOT NULL UNIQUE,
    titulo VARCHAR(255) NOT NULL DEFAULT 'Comprobante de pago',
    fecha_creacion TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    emisor_nombre VARCHAR(255) NOT NULL,
    emisor_ruc VARCHAR(20) NOT NULL,
    emisor_direccion TEXT,
    emisor_telefono VARCHAR(30) DEFAULT NULL,
    receptor_nombre VARCHAR(255) NOT NULL,
    receptor_telefono VARCHAR(30) DEFAULT NULL,
    receptor_direccion TEXT,
    receptor_identificacion VARCHAR(20) DEFAULT NULL,
    receptor_fecha_cobro DATE DEFAULT NULL,
    forma_pago TEXT,
    documento_comprobante VARCHAR(50) DEFAULT NULL,
    informacion_relacionada TEXT,
    subtotal DECIMAL(10,2) DEFAULT 0.00,
    descuentos DECIMAL(10,2) DEFAULT 0.00,
    total DECIMAL(10,2) DEFAULT 0.00,
    texto_ocr_original TEXT,
    imagen_path TEXT
);

CREATE INDEX idx_numero_secuencia ON comprobantes(numero_secuencia);
CREATE INDEX idx_fecha_creacion ON comprobantes(fecha_creacion);
CREATE INDEX idx_emisor_ruc ON comprobantes(emisor_ruc);
CREATE INDEX idx_receptor_identificacion ON comprobantes(receptor_identificacion);

CREATE TABLE comprobante_items (
    id SERIAL PRIMARY KEY,
    comprobante_id INT NOT NULL,
    unidad VARCHAR(100) DEFAULT NULL,
    detalle TEXT,
    valor DECIMAL(10,2) DEFAULT 0.00,
    descuento DECIMAL(10,2) DEFAULT 0.00,
    pago DECIMAL(10,2) DEFAULT 0.00,
    orden INT DEFAULT 1,
    CONSTRAINT fk_comprobante_items_comprobante 
        FOREIGN KEY (comprobante_id) REFERENCES comprobantes(id) ON DELETE CASCADE
);

CREATE INDEX idx_comprobante_id ON comprobante_items(comprobante_id);

-- Trigger para actualizar fecha_actualizacion
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_timestamp
    BEFORE UPDATE ON comprobantes
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- Secuencia para get_next_sequence_number
CREATE SEQUENCE IF NOT EXISTS sequence_counter START 1;

-- Función get_next_sequence_number
CREATE OR REPLACE FUNCTION get_next_sequence_number()
RETURNS VARCHAR(20) AS $$
DECLARE
    today_prefix VARCHAR(8);
    next_counter INT;
    result VARCHAR(20);
BEGIN
    today_prefix := to_char(CURRENT_DATE, 'YYYYMMDD');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_secuencia FROM 9) AS INTEGER)), 0) + 1
    INTO next_counter
    FROM comprobantes 
    WHERE DATE(fecha_creacion) = CURRENT_DATE;
    
    result := today_prefix || LPAD(next_counter::TEXT, 3, '0');
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Procedimiento create_comprobante (función que retorna el comprobante creado)
CREATE OR REPLACE FUNCTION create_comprobante(
    p_titulo VARCHAR(255),
    p_emisor_nombre VARCHAR(255),
    p_emisor_ruc VARCHAR(20),
    p_emisor_direccion TEXT,
    p_emisor_telefono VARCHAR(30),
    p_receptor_nombre VARCHAR(255),
    p_receptor_telefono VARCHAR(30),
    p_receptor_direccion TEXT,
    p_receptor_identificacion VARCHAR(20),
    p_receptor_fecha_cobro DATE,
    p_forma_pago TEXT,
    p_documento_comprobante VARCHAR(50),
    p_informacion_relacionada TEXT,
    p_subtotal DECIMAL(10,2),
    p_descuentos DECIMAL(10,2),
    p_total DECIMAL(10,2),
    p_texto_ocr_original TEXT,
    p_imagen_path TEXT
) RETURNS TABLE(
    p_comprobante_id INT,
    p_numero_secuencia VARCHAR(20)
) AS $$
DECLARE
    v_comprobante_id INT;
    v_numero_secuencia VARCHAR(20);
BEGIN
    v_numero_secuencia := get_next_sequence_number();
    
    INSERT INTO comprobantes (
        numero_secuencia, titulo, emisor_nombre, emisor_ruc, emisor_direccion, emisor_telefono,
        receptor_nombre, receptor_telefono, receptor_direccion, receptor_identificacion, receptor_fecha_cobro,
        forma_pago, documento_comprobante, informacion_relacionada,
        subtotal, descuentos, total, texto_ocr_original, imagen_path
    ) VALUES (
        v_numero_secuencia, p_titulo, p_emisor_nombre, p_emisor_ruc, p_emisor_direccion, p_emisor_telefono,
        p_receptor_nombre, p_receptor_telefono, p_receptor_direccion, p_receptor_identificacion, p_receptor_fecha_cobro,
        p_forma_pago, p_documento_comprobante, p_informacion_relacionada,
        p_subtotal, p_descuentos, p_total, p_texto_ocr_original, p_imagen_path
    ) RETURNING id INTO v_comprobante_id;
    
    p_comprobante_id := v_comprobante_id;
    p_numero_secuencia := v_numero_secuencia;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Vista v_comprobantes_completos
CREATE OR REPLACE VIEW v_comprobantes_completos AS
SELECT 
    c.id,
    c.numero_secuencia,
    c.titulo,
    c.fecha_creacion,
    c.fecha_actualizacion,
    c.emisor_nombre,
    c.emisor_ruc,
    c.emisor_direccion,
    c.emisor_telefono,
    c.receptor_nombre,
    c.receptor_telefono,
    c.receptor_direccion,
    c.receptor_identificacion,
    c.receptor_fecha_cobro,
    c.forma_pago,
    c.documento_comprobante,
    c.informacion_relacionada,
    c.subtotal,
    c.descuentos,
    c.total,
    c.texto_ocr_original,
    c.imagen_path,
    string_agg(
        ci.unidad || '|' || ci.detalle || '|' || ci.valor || '|' || ci.descuento || '|' || ci.pago,
        '||'
        ORDER BY ci.orden ASC
    ) AS items_detalle
FROM comprobantes c
LEFT JOIN comprobante_items ci ON c.id = ci.comprobante_id
GROUP BY c.id;

-- Insertar datos
INSERT INTO comprobantes (id, numero_secuencia, titulo, fecha_creacion, fecha_actualizacion, emisor_nombre, emisor_ruc, emisor_direccion, emisor_telefono, receptor_nombre, receptor_telefono, receptor_direccion, receptor_identificacion, receptor_fecha_cobro, forma_pago, documento_comprobante, informacion_relacionada, subtotal, descuentos, total, texto_ocr_original, imagen_path) VALUES
(4, '20250910001', 'Comprobante de pago', '2025-09-11 03:59:29', '2025-09-11 03:59:29', 'OLGER RODRIGO FLORES FLORES', '1703684785001', 'Real Audiencia', '0983502111', 'AMADA HORTENCIA CISNEROS BURBANO', '099 480 6251', 'Calle Real Audiencia N-63-141 y Los Cedros', '1707158364', '2024-10-01', 'Forma de pago en dólares, transferencia.', '9924718', 'Banco Internacional Cta. Ahorros: 608032998.', 350.00, 0.00, 350.00, 'E BANCO PICHINCHA ¡Transferencia exitosa! Comprobante: 9924718. Monto $350.00 Costo de transacción $0.36 IVA s0.05 Fecha Otoct2024', 'blob:http://localhost:9002/0a181aae-85e3-4f3d-89a1-c57c7139fe15'),
(5, '20250910002', 'Comprobante de pago', '2025-09-11 04:01:15', '2025-09-11 04:01:15', 'OLGER RODRIGO FLORES FLORES', '1703684785001', 'Real Audiencia', '0983502111', 'AMADA HORTENCIA CISNEROS BURBANO', '099 480 6251', 'Calle Real Audiencia N-63-141 y Los Cedros', '1707158364', '2024-12-02', 'Forma de pago en dólares, transferencia.', '97847343', 'Banco Internacional Cta. Ahorros: 608032998.', 350.00, 0.00, 350.00, 'E BANCO PICHINCHA ¡Transferencia exitosa! Comprobante: 97847343 Monto $350.00 Costo de transacción $0.36 IVA s0.05 Fecha 02 dic2024', 'blob:http://localhost:9002/8af77226-c2cf-45b2-9e20-36474b42b7d4'),
(6, '20250910003', 'Comprobante de pago', '2025-09-11 04:02:18', '2025-09-11 04:02:18', 'OLGER RODRIGO FLORES FLORES', '1703684785001', 'Real Audiencia', '0983502111', 'AMADA HORTENCIA CISNEROS BURBANO', '099 480 6251', 'Calle Real Audiencia N-63-141 y Los Cedros', '1707158364', '2025-01-06', 'Forma de pago en dólares, transferencia.', '1000234567', 'Banco Internacional Cta. Ahorros: 608032998.', 350.00, 0.00, 350.00, 'Transferencia exitosa enero 2025', 'blob:http://localhost:9002/test-id-6'),
(7, '20250910004', 'Comprobante de pago', '2025-09-11 04:02:18', '2025-09-11 04:02:18', 'OLGER RODRIGO FLORES FLORES', '1703684785001', 'Real Audiencia', '0983502111', 'AMADA HORTENCIA CISNEROS BURBANO', '099 480 6251', 'Calle Real Audiencia N-63-141 y Los Cedros', '1707158364', '2024-09-01', 'Forma de pago en dólares, transferencia.', '1000234568', 'Banco Internacional Cta. Ahorros: 608032998.', 350.00, 0.00, 350.00, 'Transferencia exitosa septiembre 2024', 'blob:http://localhost:9002/test-id-7'),
(8, '20250910005', 'Comprobante de pago', '2025-09-11 04:02:18', '2025-09-11 04:02:18', 'OLGER RODRIGO FLORES FLORES', '1703684785001', 'Real Audiencia', '0983502111', 'AMADA HORTENCIA CISNEROS BURBANO', '099 480 6251', 'Calle Real Audiencia N-63-141 y Los Cedros', '1707158364', '2025-05-01', 'Forma de pago en dólares, transferencia.', '1000234569', 'Banco Internacional Cta. Ahorros: 608032998.', 350.00, 0.00, 350.00, 'Transferencia exitosa mayo 2025', 'blob:http://localhost:9002/test-id-8'),
(9, '20250910006', 'Comprobante de pago', '2025-09-11 04:02:18', '2025-09-11 04:02:18', 'OLGER RODRIGO FLORES FLORES', '1703684785001', 'Real Audiencia', '0983502111', 'AMADA HORTENCIA CISNEROS BURBANO', '099 480 6251', 'Calle Real Audiencia N-63-141 y Los Cedros', '1707158364', '2025-10-01', 'Forma de pago en dólares, transferencia.', '1000234570', 'Banco Internacional Cta. Ahorros: 608032998.', 350.00, 0.00, 350.00, 'Transferencia exitosa octubre 2025', 'blob:http://localhost:9002/test-id-9'),
(10, '20250910007', 'Comprobante de pago', '2025-09-11 04:02:18', '2025-09-11 04:02:18', 'OLGER RODRIGO FLORES FLORES', '1703684785001', 'Real Audiencia', '0983502111', 'AMADA HORTENCIA CISNEROS BURBANO', '099 480 6251', 'Calle Real Audiencia N-63-141 y Los Cedros', '1707158364', '2026-03-01', 'Forma de pago en dólares, transferencia.', '1000234571', 'Banco Internacional Cta. Ahorros: 608032998.', 350.00, 0.00, 350.00, 'Transferencia exitosa marzo 2026', 'blob:http://localhost:9002/test-id-10');

INSERT INTO comprobante_items (id, comprobante_id, unidad, detalle, valor, descuento, pago, orden) VALUES
(4, 4, 'Otro ingreso', 'Arriendo de casa, mes de octubre 2024', 350.00, 0.00, 350.00, 1),
(5, 5, 'Otro ingreso', 'Arriendo de casa, mes de diciembre 2024', 350.00, 0.00, 350.00, 1),
(6, 6, 'Otro ingreso', 'Arriendo de casa, mes de enero 2025', 350.00, 0.00, 350.00, 1),
(7, 7, 'Otro ingreso', 'Arriendo de casa, mes de septiembre 2025', 350.00, 0.00, 350.00, 1),
(8, 8, 'Otro ingreso', 'Arriendo de casa, mes de mayo 2025', 350.00, 0.00, 350.00, 1),
(9, 9, 'Otro ingreso', 'Arriendo de casa, mes de octubre 2025', 350.00, 0.00, 350.00, 1),
(10, 10, 'Otro ingreso', 'Arriendo de casa, mes de marzo 2026', 350.00, 0.00, 350.00, 1);

-- Reiniciar secuencia para continuar desde el último ID
SELECT setval('comprobantes_id_seq', 10, true);
SELECT setval('comprobante_items_id_seq', 10, true);

COMMIT;

-- Verificación
SELECT 'Tablas creadas exitosamente' AS status;
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
