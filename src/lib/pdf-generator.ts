/**
 * @fileOverview Simple PDF generator without autoTable dependency
 */

import jsPDF from 'jspdf';
import type { ReportData } from './text-processor';

/**
 * Generate a PDF without using autoTable
 */
export function generateSimplePdf(data: ReportData): jsPDF {
  const doc = new jsPDF();
  let y = 15;

  // Title
  doc.setFontSize(18);
  doc.text(data.titulo, 105, y, { align: 'center' });
  y += 8;
  doc.text(`Nº: ${data.numeroSecuencia}`, 105, y, { align: 'center' });
  y += 15;
  
  // Issuer
  doc.setFontSize(12);
  doc.text('Emisor:', 14, y);
  doc.setFontSize(10);
  doc.text(`${data.emisor.nombre}`, 14, y += 6);
  doc.text(`RUC: ${data.emisor.ruc}`, 14, y += 6);
  doc.text(`DIR.: ${data.emisor.direccion}`, 14, y += 6);
  doc.text(`TELF: ${data.emisor.telefono}`, 14, y += 6);

  // Receiver
  y += 10;
  doc.setFontSize(12);
  doc.text('Receptor:', 14, y);
  doc.setFontSize(10);
  doc.text(`Recibí de: ${data.receptor.nombre}`, 14, y += 6);
  doc.text(`Telf.: ${data.receptor.telefono}`, 14, y += 6);
  doc.text(`Dirección: ${data.receptor.direccion}`, 14, y += 6);
  doc.text(`Identificación: ${data.receptor.identificacion}`, 14, y += 6);
  doc.text(`Fecha de cobro: ${data.receptor.fechaCobro}`, 14, y += 6);

  // Simple table without autoTable
  y += 15;
  doc.setFontSize(12);
  doc.text('DETALLE DE PAGOS', 14, y);
  y += 10;

  // Table header
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Unidad', 14, y);
  doc.text('Detalle', 50, y);
  doc.text('Valor', 120, y);
  doc.text('Descuento', 150, y);
  doc.text('Pago', 180, y);
  y += 6;

  // Table separator line
  doc.line(14, y, 200, y);
  y += 3;

  // Table rows
  doc.setFont(undefined, 'normal');
  data.items.forEach((item, index) => {
    doc.text(item.unidad, 14, y);
    doc.text(item.detalle, 50, y);
    doc.text(`$${item.valor.toFixed(2)}`, 120, y);
    doc.text(`$${item.descuento.toFixed(2)}`, 150, y);
    doc.text(`$${item.pago.toFixed(2)}`, 180, y);
    y += 6;
  });

  // Footer
  y += 15;
  doc.setFontSize(10);
  doc.text('Forma de pago:', 14, y);
  doc.text(data.pie.formaPago, 14, y += 6);
  doc.text(`Documento/Comprobante: ${data.pie.documentoComprobante}`, 14, y += 6);
  
  y += 8;
  doc.setFontSize(10).setFont(undefined, 'bold');
  doc.text('INFORMACION RELACIONADA:', 14, y);
  doc.setFont(undefined, 'normal');
  doc.text(data.pie.informacionRelacionada, 14, y += 6);
  
  // Totals section
  y += 15;
  const rightColX = 140;
  
  doc.text(`SUBTOTAL:`, rightColX, y);
  doc.text(`$${data.totales.subtotal.toFixed(2)}`, 200, y, { align: 'right' });
  y += 7;
  
  doc.text(`DESCUENTOS:`, rightColX, y);
  doc.text(`$${data.totales.descuentos.toFixed(2)}`, 200, y, { align: 'right' });
  y += 7;
  
  doc.setFont(undefined, 'bold');
  doc.text(`TOTAL:`, rightColX, y);
  doc.text(`$${data.totales.total.toFixed(2)}`, 200, y, { align: 'right' });

  return doc;
}
