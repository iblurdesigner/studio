/**
 * @fileOverview Simple text processor to extract structured data from OCR text
 * This replaces the Google AI functionality with a rule-based approach
 */

export interface ReportData {
  titulo: string;
  numeroSecuencia: string;
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
}

/**
 * Extracts structured data from OCR text using pattern matching
 */
export function generateReportFromText(extractedText: string): ReportData {
  const text = extractedText.toLowerCase();
  
  // Get current date
  const today = new Date();
  const currentDate = today.toISOString().split('T')[0];
  const currentMonth = today.toLocaleString('es-ES', { month: 'long' });
  const currentYear = today.getFullYear();
  
  // Extract sequence number (look for patterns like "Nº", "No.", "Numero", etc.)
  const sequenceNumber = extractSequenceNumber(extractedText) || generateSequenceNumber();
  
  // Extract document/comprobante number
  const documentoComprobante = extractDocumentNumber(extractedText) || sequenceNumber;
  
  // Extract amounts (look for currency patterns)
  const amounts = extractAmounts(extractedText);
  const valor = amounts.valor || 350.0;
  const descuento = amounts.descuento || 0.0;
  const pago = amounts.pago || valor;
  
  // Extract phone numbers
  const phoneNumbers = extractPhoneNumbers(extractedText);
  
  // Extract identification numbers
  const identificationNumbers = extractIdentificationNumbers(extractedText);
  
  return {
    titulo: 'Comprobante de pago',
    numeroSecuencia: sequenceNumber,
    emisor: {
      nombre: 'OLGER RODRIGO FLORES FLORES',
      ruc: '1703684785001',
      direccion: 'Real Audiencia',
      telefono: '0983502111',
    },
    receptor: {
      nombre: 'AMADA HORTENCIA CISNEROS BURBANO',
      telefono: phoneNumbers.receptor || '099 480 6251',
      direccion: 'Calle Real Audiencia N-63-141 y Los Cedros',
      identificacion: identificationNumbers.receptor || '1707158364',
      fechaCobro: currentDate,
    },
    items: [
      {
        unidad: 'Otro ingreso',
        detalle: `Arriendo de casa, mes de ${currentMonth} ${currentYear}`,
        valor: valor,
        descuento: descuento,
        pago: pago,
      }
    ],
    pie: {
      formaPago: 'Forma de pago en dólares, transferencia.',
      documentoComprobante: documentoComprobante,
      informacionRelacionada: 'Banco Internacional Cta. Ahorros: 608032998.',
    },
    totales: {
      subtotal: valor,
      descuentos: descuento,
      total: pago,
    },
  };
}

/**
 * Extract sequence number from text
 */
function extractSequenceNumber(text: string): string | null {
  const patterns = [
    /(?:n[ºo°]|numero|no\.?)\s*:?\s*(\d+)/i,
    /(?:secuencia|seq)\s*:?\s*(\d+)/i,
    /(?:ref|referencia)\s*:?\s*(\d+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Extract document number from text
 */
function extractDocumentNumber(text: string): string | null {
  const patterns = [
    // Patrón específico para "Comprobante: 26996291"
    /comprobante\s*:?\s*(\d+)/i,
    // Patrones más generales
    /(?:comprobante|documento|recibo)\s*(?:n[ºo°]|numero|no\.?)\s*:?\s*(\d+)/i,
    /(?:doc|comp)\s*:?\s*(\d+)/i,
    // Patrón para números de comprobante bancario (8 dígitos típicos)
    /(?:comprobante|voucher|recibo)\s*:?\s*(\d{8,})/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Extract amounts from text
 */
function extractAmounts(text: string): { valor?: number; descuento?: number; pago?: number } {
  const amounts: { valor?: number; descuento?: number; pago?: number } = {};
  
  // Look for currency patterns ($, USD, etc.)
  const currencyPatterns = [
    /\$(\d+(?:\.\d{2})?)/g,
    /(\d+(?:\.\d{2})?)\s*(?:usd|dolares?|dollars?)/gi,
    /(?:valor|monto|total|pago)\s*:?\s*\$?(\d+(?:\.\d{2})?)/gi,
  ];
  
  const foundAmounts: number[] = [];
  
  for (const pattern of currencyPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const amount = parseFloat(match[1]);
      if (amount > 0) {
        foundAmounts.push(amount);
      }
    }
  }
  
  // Sort amounts and assign them
  foundAmounts.sort((a, b) => b - a); // Descending order
  
  if (foundAmounts.length > 0) {
    amounts.valor = foundAmounts[0];
    amounts.pago = foundAmounts[0];
  }
  
  if (foundAmounts.length > 1) {
    amounts.descuento = foundAmounts[0] - foundAmounts[1];
  }
  
  return amounts;
}

/**
 * Extract phone numbers from text
 */
function extractPhoneNumbers(text: string): { receptor?: string } {
  const phonePatterns = [
    /(?:tel|telefono|phone|cel|celular)\s*:?\s*(\d{3}[\s\-]?\d{3}[\s\-]?\d{4})/gi,
    /(\d{3}[\s\-]?\d{3}[\s\-]?\d{4})/g,
  ];
  
  for (const pattern of phonePatterns) {
    const match = text.match(pattern);
    if (match) {
      return { receptor: match[1] };
    }
  }
  
  return {};
}

/**
 * Extract identification numbers from text
 */
function extractIdentificationNumbers(text: string): { receptor?: string } {
  const idPatterns = [
    /(?:ci|cedula|identificacion|id)\s*:?\s*(\d{10})/gi,
    /(?:ruc)\s*:?\s*(\d{13})/gi,
    /(\d{10,13})/g,
  ];
  
  for (const pattern of idPatterns) {
    const match = text.match(pattern);
    if (match) {
      return { receptor: match[1] };
    }
  }
  
  return {};
}

/**
 * Generate a sequential number for database storage
 * 
 * IMPORTANTE: En producción, esta función debe:
 * 1. Conectar a la base de datos SQL
 * 2. Ejecutar: SELECT MAX(numero_secuencia) FROM comprobantes WHERE DATE(fecha_creacion) = CURDATE()
 * 3. Si no hay registros del día, empezar con 1
 * 4. Si hay registros, usar el último número + 1
 * 5. Insertar el nuevo registro con el número generado
 * 
 * Ejemplo de implementación con SQL:
 * ```sql
 * -- Crear tabla si no existe
 * CREATE TABLE IF NOT EXISTS comprobantes (
 *   id INT AUTO_INCREMENT PRIMARY KEY,
 *   numero_secuencia VARCHAR(20) UNIQUE NOT NULL,
 *   fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *   -- otros campos...
 * );
 * 
 * -- Obtener siguiente número secuencial
 * SELECT COALESCE(MAX(CAST(SUBSTRING(numero_secuencia, 9) AS UNSIGNED)), 0) + 1 
 * FROM comprobantes 
 * WHERE DATE(fecha_creacion) = CURDATE();
 * ```
 */
function generateSequenceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  // Formato: YYYYMMDD + contador de 3 dígitos (001, 002, 003...)
  // Esto garantiza números únicos y secuenciales por día
  const datePrefix = `${year}${month}${day}`;
  
  // SIMULACIÓN: En producción, este contador vendría de la base de datos
  // Por ahora usamos un número aleatorio, pero debe ser secuencial
  const simulatedCounter = Math.floor(Math.random() * 999) + 1;
  
  return `${datePrefix}${String(simulatedCounter).padStart(3, '0')}`;
}
