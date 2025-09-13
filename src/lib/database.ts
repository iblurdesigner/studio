/**
 * @fileOverview Database connection and operations for TextScan Arriendo
 * This file handles all database operations for saving and retrieving comprobantes
 */

import mysql from 'mysql2/promise';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'textscan_comprob_db',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

export interface ComprobanteData {
  titulo: string;
  emisor: {
    nombre: string;
    ruc: string;
    direccion: string;
    telefono: string;
  };
  receptor: {
    nombre: string;
    telefono: string;
    direccion: string;
    identificacion: string;
    fechaCobro: string;
  };
  items: Array<{
    unidad: string;
    detalle: string;
    valor: number;
    descuento: number;
    pago: number;
  }>;
  pie: {
    formaPago: string;
    documentoComprobante: string;
    informacionRelacionada: string;
  };
  totales: {
    subtotal: number;
    descuentos: number;
    total: number;
  };
  textoOcrOriginal?: string;
  imagenPath?: string;
}

export interface SavedComprobante {
  id: number;
  numeroSecuencia: string;
  comprobanteData: ComprobanteData;
  fechaCreacion: Date;
}

/**
 * Save a comprobante to the database using the stored procedure
 */
export async function saveComprobante(
  comprobanteData: ComprobanteData
): Promise<SavedComprobante> {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'mysqlblur',
    database: process.env.DB_NAME || 'textscan_comprob_db',
    port: parseInt(process.env.DB_PORT || '3306'),
  });
  
  try {
    // Generate sequence number
    const [sequenceResult] = await connection.execute(
      'SELECT get_next_sequence_number() as numero_secuencia'
    ) as any[];
    
    const numeroSecuencia = sequenceResult[0].numero_secuencia;

    // Insert comprobante directly
    const [result] = await connection.execute(
      `INSERT INTO comprobantes (
        numero_secuencia, titulo, emisor_nombre, emisor_ruc, emisor_direccion, emisor_telefono,
        receptor_nombre, receptor_telefono, receptor_direccion, receptor_identificacion, receptor_fecha_cobro,
        forma_pago, documento_comprobante, informacion_relacionada,
        subtotal, descuentos, total, texto_ocr_original, imagen_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        numeroSecuencia,
        comprobanteData.titulo,
        comprobanteData.emisor.nombre,
        comprobanteData.emisor.ruc,
        comprobanteData.emisor.direccion,
        comprobanteData.emisor.telefono,
        comprobanteData.receptor.nombre,
        comprobanteData.receptor.telefono,
        comprobanteData.receptor.direccion,
        comprobanteData.receptor.identificacion,
        comprobanteData.receptor.fechaCobro,
        comprobanteData.pie.formaPago,
        comprobanteData.pie.documentoComprobante,
        comprobanteData.pie.informacionRelacionada,
        comprobanteData.totales.subtotal,
        comprobanteData.totales.descuentos,
        comprobanteData.totales.total,
        comprobanteData.textoOcrOriginal || '',
        comprobanteData.imagenPath || ''
      ]
    ) as any[];

    const comprobanteId = result.insertId;

    // Save the items
    if (comprobanteData.items && comprobanteData.items.length > 0) {
      for (let i = 0; i < comprobanteData.items.length; i++) {
        const item = comprobanteData.items[i];
        await connection.execute(
          `INSERT INTO comprobante_items 
           (comprobante_id, unidad, detalle, valor, descuento, pago, orden) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            comprobanteId,
            item.unidad,
            item.detalle,
            item.valor,
            item.descuento,
            item.pago,
            i + 1
          ]
        );
      }
    }

    // Get the created comprobante with its creation date
    const [comprobanteResult] = await connection.execute(
      'SELECT fecha_creacion FROM comprobantes WHERE id = ?',
      [comprobanteId]
    ) as any[];

    return {
      id: comprobanteId,
      numeroSecuencia,
      comprobanteData,
      fechaCreacion: new Date(comprobanteResult[0].fecha_creacion)
    };

  } catch (error) {
    console.error('Error saving comprobante:', error);
    throw new Error(`Error al guardar el comprobante: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  } finally {
    await connection.end();
  }
}

/**
 * Get a comprobante by ID
 */
export async function getComprobante(id: number): Promise<SavedComprobante | null> {
  const connection = await pool.getConnection();
  
  try {
    const [rows] = await connection.execute(
      'SELECT * FROM comprobantes WHERE id = ?',
      [id]
    ) as any[];

    if (rows.length === 0) {
      return null;
    }

    const comprobante = rows[0];

    // Get the items
    const [itemRows] = await connection.execute(
      'SELECT * FROM comprobante_items WHERE comprobante_id = ? ORDER BY orden',
      [id]
    ) as any[];

    const comprobanteData: ComprobanteData = {
      titulo: comprobante.titulo,
      emisor: {
        nombre: comprobante.emisor_nombre,
        ruc: comprobante.emisor_ruc,
        direccion: comprobante.emisor_direccion,
        telefono: comprobante.emisor_telefono,
      },
      receptor: {
        nombre: comprobante.receptor_nombre,
        telefono: comprobante.receptor_telefono,
        direccion: comprobante.receptor_direccion,
        identificacion: comprobante.receptor_identificacion,
        fechaCobro: comprobante.receptor_fecha_cobro,
      },
      items: itemRows.map((item: any) => ({
        unidad: item.unidad,
        detalle: item.detalle,
        valor: parseFloat(item.valor),
        descuento: parseFloat(item.descuento),
        pago: parseFloat(item.pago),
      })),
      pie: {
        formaPago: comprobante.forma_pago,
        documentoComprobante: comprobante.documento_comprobante,
        informacionRelacionada: comprobante.informacion_relacionada,
      },
      totales: {
        subtotal: parseFloat(comprobante.subtotal),
        descuentos: parseFloat(comprobante.descuentos),
        total: parseFloat(comprobante.total),
      },
      textoOcrOriginal: comprobante.texto_ocr_original,
      imagenPath: comprobante.imagen_path,
    };

    return {
      id: comprobante.id,
      numeroSecuencia: comprobante.numero_secuencia,
      comprobanteData,
      fechaCreacion: new Date(comprobante.fecha_creacion)
    };

  } catch (error) {
    console.error('Error getting comprobante:', error);
    throw new Error(`Error al obtener el comprobante: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  } finally {
    connection.release();
  }
}

/**
 * Get all comprobantes with pagination
 */
export async function getComprobantes(
  page: number = 1, 
  limit: number = 10
): Promise<{ comprobantes: SavedComprobante[], total: number }> {
  const connection = await pool.getConnection();
  
  try {
    const offset = (page - 1) * limit;

    // Get total count
    const [countResult] = await connection.execute(
      'SELECT COUNT(*) as total FROM comprobantes'
    ) as any[];
    const total = countResult[0].total;

    // Get comprobantes with pagination
    const [rows] = await connection.execute(
      `SELECT * FROM comprobantes 
       ORDER BY fecha_creacion DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset]
    ) as any[];

    const comprobantes: SavedComprobante[] = [];

    for (const comprobante of rows) {
      // Get items for each comprobante
      const [itemRows] = await connection.execute(
        'SELECT * FROM comprobante_items WHERE comprobante_id = ? ORDER BY orden',
        [comprobante.id]
      ) as any[];

      const comprobanteData: ComprobanteData = {
        titulo: comprobante.titulo,
        emisor: {
          nombre: comprobante.emisor_nombre,
          ruc: comprobante.emisor_ruc,
          direccion: comprobante.emisor_direccion,
          telefono: comprobante.emisor_telefono,
        },
        receptor: {
          nombre: comprobante.receptor_nombre,
          telefono: comprobante.receptor_telefono,
          direccion: comprobante.receptor_direccion,
          identificacion: comprobante.receptor_identificacion,
          fechaCobro: comprobante.receptor_fecha_cobro,
        },
        items: itemRows.map((item: any) => ({
          unidad: item.unidad,
          detalle: item.detalle,
          valor: parseFloat(item.valor),
          descuento: parseFloat(item.descuento),
          pago: parseFloat(item.pago),
        })),
        pie: {
          formaPago: comprobante.forma_pago,
          documentoComprobante: comprobante.documento_comprobante,
          informacionRelacionada: comprobante.informacion_relacionada,
        },
        totales: {
          subtotal: parseFloat(comprobante.subtotal),
          descuentos: parseFloat(comprobante.descuentos),
          total: parseFloat(comprobante.total),
        },
        textoOcrOriginal: comprobante.texto_ocr_original,
        imagenPath: comprobante.imagen_path,
      };

      comprobantes.push({
        id: comprobante.id,
        numeroSecuencia: comprobante.numero_secuencia,
        comprobanteData,
        fechaCreacion: new Date(comprobante.fecha_creacion)
      });
    }

    return { comprobantes, total };

  } catch (error) {
    console.error('Error getting comprobantes:', error);
    throw new Error(`Error al obtener los comprobantes: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  } finally {
    connection.release();
  }
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

/**
 * Close the database connection pool
 */
export async function closeConnection(): Promise<void> {
  await pool.end();
}
