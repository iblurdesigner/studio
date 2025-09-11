'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import Tesseract from 'tesseract.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  UploadCloud,
  FileText,
  Loader2,
  Wand2,
  Printer,
  Download,
  RotateCcw,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { generateReportFromText, type ReportData } from '@/lib/text-processor';
import { generateSimplePdf } from '@/lib/pdf-generator';
import { Header } from '@/components/header';

type AppState =
  | 'idle'
  | 'preview'
  | 'ocr'
  | 'edit'
  | 'generating'
  | 'report';

// Extend jsPDF with autoTable
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

export default function Home() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [ocrResult, setOcrResult] = useState<string>('');
  const [editedText, setEditedText] = useState<string>('');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [appState, setAppState] = useState<AppState>('idle');
  const { toast } = useToast();

  const handleFileChange = (files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
        toast({
          variant: 'destructive',
          title: 'Formato de archivo inválido',
          description: 'Por favor, sube una imagen en formato JPG, PNG o JPEG.',
        });
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setAppState('preview');
    }
  };
  
  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    handleFileChange(event.dataTransfer.files);
  }, []);

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleExtractText = async () => {
    if (!imageFile) return;
    setAppState('ocr');
    setOcrProgress(0);

    try {
      const worker = await Tesseract.createWorker('spa', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });
      const { data: { text } } = await worker.recognize(imageFile);
      setOcrResult(text);
      setEditedText(text);
      setAppState('edit');
      await worker.terminate();
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error de OCR',
        description: 'No se pudo extraer el texto de la imagen.',
      });
      handleRestart();
    }
  };

  const handleGenerateReport = async () => {
    if (!editedText) return;
    setAppState('generating');

    try {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const result = generateReportFromText(editedText);
      setReportData(result);
      setAppState('report');
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error al generar el informe',
        description: 'No se pudo procesar el texto. Inténtalo de nuevo.',
      });
      setAppState('edit');
    }
  };

  const handlePrint = () => {
    // We'll generate a PDF and open it in a new tab for printing
    if (!reportData) return;
    try {
      const doc = generatePdf(reportData);
      (doc as any).autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } catch (error) {
      console.warn('PDF generation with autoTable failed, using simple version:', error);
      const doc = generateSimplePdf(reportData);
      (doc as any).autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    }
  };
  
  const generatePdf = (data: ReportData): jsPDF => {
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

    // Table
    y += 15;
    try {
      autoTable(doc, {
        startY: y,
        head: [['Unidad', 'Detalle', 'Valor', 'Descuento', 'Pago']],
        body: data.items.map(item => [
          item.unidad,
          item.detalle,
          `$${item.valor.toFixed(2)}`,
          `$${item.descuento.toFixed(2)}`,
          `$${item.pago.toFixed(2)}`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [66, 133, 244] },
      });
      
      // Try to get the final Y position, fallback to estimated position
      if ((doc as any).autoTable && (doc as any).autoTable.previous) {
        y = (doc as any).autoTable.previous.finalY + 15;
      } else {
        // Fallback: estimate position based on number of items
        y += (data.items.length + 1) * 8 + 20; // Approximate table height
      }
    } catch (error) {
      console.warn('autoTable failed, using fallback layout:', error);
      // Fallback: create a simple table manually
      y += 20;
    }
    
    // Footer
    const rightColX = 140;
    
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

  const handleDownloadPdf = () => {
    if (!reportData) return;
    try {
      const doc = generatePdf(reportData);
      doc.save('TextoScan-AI-Comprobante.pdf');
    } catch (error) {
      console.warn('PDF generation with autoTable failed, using simple version:', error);
      const doc = generateSimplePdf(reportData);
      doc.save('TextoScan-AI-Comprobante.pdf');
    }
  };

  const handleReportDataChange = (section: string, field: string, value: string, index?: number) => {
    if (!reportData) return;

    setReportData(prevData => {
      if (!prevData) return null;
      // Deep copy to avoid direct state mutation
      const newData = JSON.parse(JSON.stringify(prevData));
      
      if (section === 'items' && index !== undefined) {
        newData[section][index][field] = value;
      } else if (section === 'totales' || section === 'emisor' || section === 'receptor' || section === 'pie') {
        newData[section][field] = value;
      } else {
        newData[field] = value;
      }
      return newData;
    });
  };

  const handleRestart = () => {
    setImageFile(null);
    setImagePreview('');
    setOcrResult('');
    setEditedText('');
    setReportData(null);
    setOcrProgress(0);
    setAppState('idle');
  };

  const renderContent = () => {
    switch (appState) {
      case 'idle':
        return (
          <Card 
            className="w-full max-w-2xl transition-all duration-300 hover:shadow-2xl" 
            onDrop={onDrop} 
            onDragOver={onDragOver}
          >
            <CardHeader>
              <CardTitle className="text-center text-2xl">Sube una imagen</CardTitle>
            </CardHeader>
            <CardContent>
              <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer border-border hover:border-primary bg-secondary/50 hover:bg-secondary">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <UploadCloud className="w-10 h-10 mb-4 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold text-primary">Haz clic para subir</span> o arrastra y suelta</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG, JPEG</p>
                </div>
                <input id="file-upload" type="file" className="hidden" accept="image/jpeg,image/png,image/jpg" onChange={(e) => handleFileChange(e.target.files)} />
              </label>
            </CardContent>
          </Card>
        );
      case 'preview':
        return (
          <Card className="w-full max-w-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Previsualización</CardTitle>
              <Button variant="ghost" size="icon" onClick={handleRestart}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6">
              <div className="w-full h-64 relative rounded-lg overflow-hidden border">
                <Image src={imagePreview} alt="Previsualización" fill style={{objectFit: 'contain'}} />
              </div>
              <Button size="lg" onClick={handleExtractText} className="w-full">
                <FileText className="mr-2 h-5 w-5" />
                Extraer Texto
              </Button>
            </CardContent>
          </Card>
        );
      case 'ocr':
        return (
          <Card className="w-full max-w-2xl p-8 text-center">
            <CardContent className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-lg font-medium text-foreground">Extrayendo texto...</p>
              <Progress value={ocrProgress} className="w-full" />
              <p className="text-sm text-muted-foreground">{ocrProgress}% completado</p>
            </CardContent>
          </Card>
        );
      case 'edit':
        return (
          <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Imagen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full h-96 relative rounded-lg overflow-hidden border">
                  <Image src={imagePreview} alt="Previsualización" fill style={{objectFit: 'contain'}} />
                </div>
              </CardContent>
            </Card>
            <Card className="w-full flex flex-col">
              <CardHeader>
                <CardTitle>Texto Extraído (Editable)</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col flex-grow gap-4">
                <Textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="w-full flex-grow text-base"
                  placeholder="El texto extraído aparecerá aquí..."
                  rows={15}
                />
                <Button size="lg" onClick={handleGenerateReport} disabled={!editedText.trim()}>
                  <Wand2 className="mr-2 h-5 w-5" />
                  Generar Informe
                </Button>
              </CardContent>
            </Card>
          </div>
        );
      case 'generating':
        return (
          <Card className="w-full max-w-2xl p-8 text-center">
            <CardContent className="flex flex-col items-center gap-4">
              <Wand2 className="w-12 h-12 animate-pulse text-primary" />
              <p className="text-lg font-medium text-foreground">Generando informe...</p>
              <p className="text-sm text-muted-foreground">Procesando el texto extraído.</p>
            </CardContent>
          </Card>
        );
      case 'report':
        if (!reportData) return null;
        return (
          <div className="w-full max-w-4xl space-y-6">
            <div className="flex flex-wrap gap-4 justify-center">
              <Button size="lg" onClick={handlePrint}>
                <Printer className="mr-2 h-5 w-5" />
                Imprimir
              </Button>
              <Button size="lg" onClick={handleDownloadPdf} variant="secondary">
                <Download className="mr-2 h-5 w-5" />
                Descargar PDF
              </Button>
              <Button size="lg" onClick={handleRestart} variant="outline">
                <RotateCcw className="mr-2 h-5 w-5" />
                Empezar de Nuevo
              </Button>
            </div>
            <Card className="w-full p-6">
              <div id="printable-report" className="space-y-6">
                {/* Header */}
                <div className="text-center space-y-1">
                  <Input 
                    value={reportData.titulo} 
                    onChange={(e) => handleReportDataChange('titulo', '', e.target.value)}
                    className="text-2xl font-bold text-center border-none focus-visible:ring-0 shadow-none p-0 h-auto"
                  />
                  <Input 
                    value={`Nº: ${reportData.numeroSecuencia}`}
                    onChange={(e) => handleReportDataChange('numeroSecuencia', '', e.target.value.replace('Nº: ', ''))}
                    className="text-lg text-center border-none focus-visible:ring-0 shadow-none p-0 h-auto"
                  />
                </div>

                {/* Emitter & Receiver */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <h3 className="font-semibold">Emisor</h3>
                    <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                      <Label>Nombre:</Label> <Input value={reportData.emisor.nombre} onChange={(e) => handleReportDataChange('emisor', 'nombre', e.target.value)} />
                      <Label>RUC:</Label> <Input value={reportData.emisor.ruc} onChange={(e) => handleReportDataChange('emisor', 'ruc', e.target.value)} />
                      <Label>Dirección:</Label> <Input value={reportData.emisor.direccion} onChange={(e) => handleReportDataChange('emisor', 'direccion', e.target.value)} />
                      <Label>Teléfono:</Label> <Input value={reportData.emisor.telefono} onChange={(e) => handleReportDataChange('emisor', 'telefono', e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold">Receptor</h3>
                     <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                      <Label>Recibí de:</Label> <Input value={reportData.receptor.nombre} onChange={(e) => handleReportDataChange('receptor', 'nombre', e.target.value)} />
                      <Label>Teléfono:</Label> <Input value={reportData.receptor.telefono} onChange={(e) => handleReportDataChange('receptor', 'telefono', e.target.value)} />
                      <Label>Dirección:</Label> <Input value={reportData.receptor.direccion} onChange={(e) => handleReportDataChange('receptor', 'direccion', e.target.value)} />
                      <Label>Identif.:</Label> <Input value={reportData.receptor.identificacion} onChange={(e) => handleReportDataChange('receptor', 'identificacion', e.target.value)} />
                      <Label>Fecha Cobro:</Label> <Input type="date" value={reportData.receptor.fechaCobro} onChange={(e) => handleReportDataChange('receptor', 'fechaCobro', e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2">Unidad</th>
                        <th className="p-2">Detalle</th>
                        <th className="p-2 text-right">Valor</th>
                        <th className="p-2 text-right">Descuento</th>
                        <th className="p-2 text-right">Pago</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.items.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2"><Input value={item.unidad} onChange={(e) => handleReportDataChange('items', 'unidad', e.target.value, index)} className="border-none"/></td>
                          <td className="p-2"><Input value={item.detalle} onChange={(e) => handleReportDataChange('items', 'detalle', e.target.value, index)} className="border-none"/></td>
                          <td className="p-2"><Input value={item.valor} onChange={(e) => handleReportDataChange('items', 'valor', e.target.value, index)} className="text-right border-none"/></td>
                          <td className="p-2"><Input value={item.descuento} onChange={(e) => handleReportDataChange('items', 'descuento', e.target.value, index)} className="text-right border-none"/></td>
                          <td className="p-2"><Input value={item.pago} onChange={(e) => handleReportDataChange('items', 'pago', e.target.value, index)} className="text-right border-none"/></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-start pt-4">
                    <div className="text-sm space-y-2">
                      <p className="font-semibold">Forma de pago:</p>
                      <Input value={reportData.pie.formaPago} onChange={(e) => handleReportDataChange('pie', 'formaPago', e.target.value)} />
                      <Input value={`Documento/Comprobante: ${reportData.pie.documentoComprobante}`} onChange={(e) => handleReportDataChange('pie', 'documentoComprobante', e.target.value.replace('Documento/Comprobante: ', ''))} />
                      <p className="font-semibold pt-2">INFORMACION RELACIONADA:</p>
                      <Input value={reportData.pie.informacionRelacionada} onChange={(e) => handleReportDataChange('pie', 'informacionRelacionada', e.target.value)} />
                    </div>
                    <div className="text-sm space-y-2 w-1/3">
                        <div className="flex justify-between"><span>SUBTOTAL:</span> <span>${reportData.totales.subtotal.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>DESCUENTOS:</span> <span>${reportData.totales.descuentos.toFixed(2)}</span></div>
                        <div className="flex justify-between font-bold text-base"><span>TOTAL:</span> <span>${reportData.totales.total.toFixed(2)}</span></div>
                    </div>
                </div>

              </div>
            </Card>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
        <div className="w-full">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}