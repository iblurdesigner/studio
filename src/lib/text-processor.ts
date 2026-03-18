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
      direccion: 'San Juan',
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
 * PRIORITY: Banco Pichincha (>Transferencia exitosa!) > Monto: > Total: > otros genéricos
 */
export function extractAmounts(text: string): { valor?: number; descuento?: number; pago?: number } {
  const amounts: { valor?: number; descuento?: number; pago?: number } = {};
  
  // PATTERN 0: Banco Pichincha specific pattern
  // Looks for "Transferencia exitosa!" followed by $VALUE
  // Format in OCR: "¡Transferencia exitosa!\n$ 350.00"
  const pichinchaPattern = /transferencia\s+exitosa[!\.]*\s*\$?\s*(\d+(?:[.,]\d{2})?)/i;
  const pichinchaMatch = text.match(pichinchaPattern);
  
  console.log('[extractAmounts] OCR Text snippet:', text.substring(0, 300));
  console.log('[extractAmounts] Pichincha pattern match:', pichinchaMatch);
  
  if (pichinchaMatch) {
    const monto = parseLocaleNumber(pichinchaMatch[1]);
    console.log('[extractAmounts] Extracted Pichincha monto:', monto);
    if (monto > 0) {
      amounts.valor = monto;
      amounts.pago = monto;
      console.log('[extractAmounts] SUCCESS - using Pichincha pattern');
      return amounts;
    }
  }
  
  // PATTERN 1: "Monto:" pattern
  const montoPatterns = [
    /\bmonto\s*:\s*\$?\s*(\d+(?:[.,]\d{2})?)/i,       // monto: $350.00
    /\bmonto\s*:\s*(\d+(?:[.,]\d{2})?)/i,              // monto: 350.00
    /monto[a-z]*\s*:\s*\$?\s*(\d+(?:[.,]\d{2})?)/i,   // allows minor OCR char variations
  ];
  
  let montoMatch = null;
  for (const pattern of montoPatterns) {
    montoMatch = text.match(pattern);
    if (montoMatch) break;
  }
  
  console.log('[extractAmounts] Monto pattern match:', montoMatch);
  
  if (montoMatch) {
    const monto = parseLocaleNumber(montoMatch[1]);
    console.log('[extractAmounts] Extracted monto:', monto);
    if (monto > 0) {
      amounts.valor = monto;
      amounts.pago = monto;
      console.log('[extractAmounts] SUCCESS - using Monto pattern');
      return amounts;
    }
  }
  
  console.log('[extractAmounts] No monto found, trying Total pattern...');
  
  // PATTERN 2: "Total:" pattern
  const totalPattern = /(?:total|valor)\s*:?\s*\$?\s*(\d+(?:[.,]\d{2})?)/i;
  const totalMatch = text.match(totalPattern);
  if (totalMatch) {
    const total = parseLocaleNumber(totalMatch[1]);
    if (total > 0) {
      amounts.valor = total;
      amounts.pago = total;
      return amounts;
    }
  }
  
  // PATTERN 3: Generic currency patterns with space support (fallback)
  console.log('[extractAmounts] No Total found, using generic $-pattern (with space support)');
  
  // Look for currency patterns ($, USD, etc.) - now with space support
  const currencyPatterns = [
    /\$\s?(\d+(?:[.,]\d{2})?)/g,  // $350.00 or $ 350.00 (with optional space)
    /(\d+(?:[.,]\d{2})?)\s*(?:usd|dolares?|dollars?)/gi,
  ];
  
  const foundAmounts: number[] = [];
  
  for (const pattern of currencyPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const amount = parseLocaleNumber(match[1]);
      if (amount > 0) {
        foundAmounts.push(amount);
      }
    }
  }
  
  console.log('[extractAmounts] All $-amounts found:', foundAmounts);
  
  // Sort amounts and assign them - descending order
  foundAmounts.sort((a, b) => b - a);
  console.log('[extractAmounts] After sorting (desc):', foundAmounts);
  
  if (foundAmounts.length > 0) {
    console.log('[extractAmounts] WARNING: Using largest amount (fallback):', foundAmounts[0]);
    amounts.valor = foundAmounts[0];
    amounts.pago = foundAmounts[0];
  }
  
  if (foundAmounts.length > 1) {
    amounts.descuento = foundAmounts[0] - foundAmounts[1];
  }
  
  return amounts;
}

/**
 * Parse number with locale support (handles both 1,234.56 and 1.234,56 formats)
 */
function parseLocaleNumber(str: string): number {
  // Remove spaces and common separators
  let cleaned = str.trim();
  
  // Handle both formats: "1,234.56" and "1.234,56"
  // Count commas and dots to determine the format
  const commaCount = (cleaned.match(/,/g) || []).length;
  const dotCount = (cleaned.match(/\./g) || []).length;
  
  if (commaCount === 1 && dotCount === 0) {
    // Format: 1,234 (Spanish thousands separator) or 1,23 (European decimal)
    if (/,\d{2}$/.test(cleaned)) {
      // European decimal: 1234,56 → 1234.56
      cleaned = cleaned.replace(',', '.');
    } else {
      // Spanish thousands: 1,234 → 1234
      cleaned = cleaned.replace(',', '');
    }
  } else if (dotCount === 1 && commaCount === 0) {
    // Format: 1234.56 (US style) - already correct
  } else if (dotCount === 1 && commaCount === 1) {
    // Both present - determine which is decimal
    const lastSeparator = Math.max(cleaned.lastIndexOf('.'), cleaned.lastIndexOf(','));
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      // European: 1.234,56
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // US: 1,234.56
      cleaned = cleaned.replace(/,/g, '');
    }
  }
  
  return parseFloat(cleaned) || 0;
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
