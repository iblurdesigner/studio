'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import Tesseract from 'tesseract.js';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { generateReportFromText } from '@/ai/flows/generate-report-from-text';
import { Header } from '@/components/header';

type AppState =
  | 'idle'
  | 'preview'
  | 'ocr'
  | 'edit'
  | 'generating'
  | 'report';

export default function Home() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [ocrResult, setOcrResult] = useState<string>('');
  const [editedText, setEditedText] = useState<string>('');
  const [report, setReport] = useState<string>('');
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
      const result = await generateReportFromText({ extractedText: editedText });
      setReport(result.report);
      setAppState('report');
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error al generar el informe',
        description: 'La IA no pudo procesar la solicitud. Inténtalo de nuevo.',
      });
      setAppState('edit');
    }
  };
  
  const handlePrint = () => {
    document.body.classList.add('printing');
    window.print();
    document.body.classList.remove('printing');
  };

  const handleDownload = () => {
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'TextoScan-AI-Informe.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRestart = () => {
    setImageFile(null);
    setImagePreview('');
    setOcrResult('');
    setEditedText('');
    setReport('');
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
              <p className="text-lg font-medium text-foreground">Generando informe con IA...</p>
              <p className="text-sm text-muted-foreground">Esto puede tardar unos segundos.</p>
            </CardContent>
          </Card>
        );
      case 'report':
        return (
          <div className="w-full max-w-4xl space-y-6">
            <div className="flex flex-wrap gap-4 justify-center">
              <Button size="lg" onClick={handlePrint}>
                <Printer className="mr-2 h-5 w-5" />
                Imprimir
              </Button>
              <Button size="lg" onClick={handleDownload} variant="secondary">
                <Download className="mr-2 h-5 w-5" />
                Descargar
              </Button>
              <Button size="lg" onClick={handleRestart} variant="outline">
                <RotateCcw className="mr-2 h-5 w-5" />
                Empezar de Nuevo
              </Button>
            </div>
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Informe Generado</CardTitle>
              </CardHeader>
              <CardContent>
                <div id="printable-report" className="space-y-4 text-base leading-relaxed" dangerouslySetInnerHTML={{ __html: report.replace(/\n/g, '<br />') }} />
              </CardContent>
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
