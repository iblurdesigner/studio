/**
 * @fileOverview Database connection and operations for TextScan Arriendo
 * Adapted for PostgreSQL (Neon.tech)
 */

import { neon } from '@neondatabase/serverless';

// Create database connection using Neon
const sql = neon(process.env.DATABASE_URL || '');

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
 * Save a comprobante to the database
 */
export async function saveComprobante(
  comprobanteData: ComprobanteData
): Promise<SavedComprobante> {
  try {
    // Generate sequence number (date + random)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const datePrefix = `${year}${month}${day}`;
    const randomNum = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
    const numeroSecuencia = `${datePrefix}${randomNum}`;

    // Insert comprobante
    const result = await sql`
      INSERT INTO comprobantes (
        numero_secuencia, titulo, 
        emisor_nombre, emisor_ruc, emisor_direccion, emisor_telefono,
        receptor_nombre, receptor_telefono, receptor_direccion, receptor_identificacion, receptor_fecha_cobro,
        forma_pago, documento_comprobante, informacion_relacionada,
        subtotal, descuentos, total, texto_ocr_original, imagen_path
      ) VALUES (
        ${numeroSecuencia}, ${comprobanteData.titulo},
        ${comprobanteData.emisor.nombre}, ${comprobanteData.emisor.ruc}, 
        ${comprobanteData.emisor.direccion}, ${comprobanteData.emisor.telefono},
        ${comprobanteData.receptor.nombre}, ${comprobanteData.receptor.telefono},
        ${comprobanteData.receptor.direccion}, ${comprobanteData.receptor.identificacion},
        ${comprobanteData.receptor.fechaCobro},
        ${comprobanteData.pie.formaPago}, ${comprobanteData.pie.documentoComprobante},
        ${comprobanteData.pie.informacionRelacionada},
        ${comprobanteData.totales.subtotal}, ${comprobanteData.totales.descuentos},
        ${comprobanteData.totales.total}, ${comprobanteData.textoOcrOriginal || ''},
        ${comprobanteData.imagenPath || ''}
      )
      RETURNING id, fecha_creacion
    `;

    const insertResult = result[0];
    const comprobanteId = insertResult.id;

    // Save items
    if (comprobanteData.items && comprobanteData.items.length > 0) {
      for (let i = 0; i < comprobanteData.items.length; i++) {
        const item = comprobanteData.items[i];
        await sql`
          INSERT INTO comprobante_items 
          (comprobante_id, unidad, detalle, valor, descuento, pago, orden) 
          VALUES (
            ${comprobanteId}, ${item.unidad}, ${item.detalle},
            ${item.valor}, ${item.descuento}, ${item.pago}, ${i + 1}
          )
        `;
      }
    }

    return {
      id: comprobanteId,
      numeroSecuencia,
      comprobanteData,
      fechaCreacion: new Date(insertResult.fecha_creacion)
    };

  } catch (error) {
    console.error('Error saving comprobante:', error);
    throw new Error(`Error al guardar el comprobante: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

/**
 * Get a comprobante by ID
 */
export async function getComprobante(id: number): Promise<SavedComprobante | null> {
  try {
    const rows = await sql`SELECT * FROM comprobantes WHERE id = ${id}`;
    
    if (rows.length === 0) {
      return null;
    }

    const comprobante = rows[0];

    // Get items
    const itemRows = await sql`SELECT * FROM comprobante_items WHERE comprobante_id = ${id} ORDER BY orden`;

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
  }
}

/**
 * Get all comprobantes with pagination
 */
export async function getComprobantes(
  page: number = 1, 
  limit: number = 10
): Promise<{ comprobantes: SavedComprobante[], total: number }> {
  try {
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await sql`SELECT COUNT(*) as total FROM comprobantes`;
    const total = Number(countResult[0].total);

    // Get comprobantes with pagination
    const rows = await sql`
      SELECT * FROM comprobantes 
      ORDER BY fecha_creacion DESC 
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `;

    const comprobantes: SavedComprobante[] = [];

    for (const comprobante of rows) {
      // Get items for each comprobante
      const itemRows = await sql`SELECT * FROM comprobante_items WHERE comprobante_id = ${comprobante.id} ORDER BY orden`;

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
  }
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await sql`SELECT 1 as test`;
    return result.length > 0;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

/**
 * Close the database connection
 */
export async function closeConnection(): Promise<void> {
  // Neon handles connection pooling automatically, no need to close
}
