'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  Search, 
  Calendar, 
  User, 
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Eye,
  Download,
  Loader2,
  RefreshCw,
  Receipt
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/header';

interface ComprobanteItem {
  unidad: string;
  detalle: string;
  valor: number;
  descuento: number;
  pago: number;
}

interface ComprobanteData {
  titulo: string;
  emisor: { nombre: string; ruc: string };
  receptor: { nombre: string; telefono: string; identificacion: string };
  items: ComprobanteItem[];
  totales: { subtotal: number; descuentos: number; total: number };
  receptorFechaCobro?: string;
}

interface SavedComprobante {
  id: number;
  numeroSecuencia: string;
  comprobanteData: ComprobanteData;
  fechaCreacion: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function ComprobantesPage() {
  const [comprobantes, setComprobantes] = useState<SavedComprobante[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const fetchComprobantes = async (page: number = 1) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/comprobantes?page=${page}&limit=${pagination.limit}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar comprobantes');
      }
      
      setComprobantes(data.data);
      setPagination(prev => ({
        ...prev,
        page: data.pagination.page,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComprobantes();
  }, []);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchComprobantes(newPage);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Filter comprobantes based on search term
  const filteredComprobantes = comprobantes.filter(comp => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const data = comp.comprobanteData;
    return (
      comp.numeroSecuencia.toLowerCase().includes(search) ||
      data.emisor.nombre.toLowerCase().includes(search) ||
      data.receptor.nombre.toLowerCase().includes(search) ||
      data.receptor.identificacion.includes(search)
    );
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Receipt className="h-8 w-8 text-primary" />
            Comprobantes Guardados
          </h1>
          <p className="text-muted-foreground">
            Total: {pagination.total} comprobantes en la base de datos
          </p>
        </div>

        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por número, nombre, RUC o identificación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button 
            variant="outline" 
            onClick={() => fetchComprobantes(pagination.page)}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Cargando comprobantes...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-destructive mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <span className="font-medium">Error:</span>
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!loading && !error && filteredComprobantes.length === 0 && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No hay comprobantes</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm 
                    ? 'No se encontraron comprobantes con esa búsqueda' 
                    : 'Aún no has guardado ningún comprobante'}
                </p>
                <Link href="/">
                  <Button>
                    <FileText className="h-4 w-4 mr-2" />
                    Crear Primer Comprobante
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comprobantes Grid */}
        {!loading && !error && filteredComprobantes.length > 0 && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredComprobantes.map((comp) => (
                <Card key={comp.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Receipt className="h-5 w-5 text-primary" />
                          {comp.comprobanteData.titulo}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          #{comp.numeroSecuencia}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          {formatCurrency(comp.comprobanteData.totales.total)}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    {/* Date */}
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(comp.fechaCreacion)}</span>
                    </div>
                    
                    {/* Emisor */}
                    <div className="flex items-start gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">{comp.comprobanteData.emisor.nombre}</p>
                        <p className="text-xs text-muted-foreground">RUC: {comp.comprobanteData.emisor.ruc}</p>
                      </div>
                    </div>
                    
                    {/* Receptor */}
                    <div className="flex items-start gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">{comp.comprobanteData.receptor.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {comp.comprobanteData.receptor.identificacion}
                        </p>
                      </div>
                    </div>
                    
                    {/* Items Summary */}
                    {comp.comprobanteData.items && comp.comprobanteData.items.length > 0 && (
                      <div className="bg-muted/50 rounded-lg p-2 text-sm">
                        <p className="font-medium text-xs text-muted-foreground mb-1">Detalle:</p>
                        <p className="truncate">{comp.comprobanteData.items[0].detalle}</p>
                      </div>
                    )}
                    
                    {/* Totals */}
                    <div className="border-t pt-3 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span>{formatCurrency(comp.comprobanteData.totales.subtotal)}</span>
                      </div>
                      {comp.comprobanteData.totales.descuentos > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Descuento:</span>
                          <span>-{formatCurrency(comp.comprobanteData.totales.descuentos)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold">
                        <span>Total:</span>
                        <span className="text-primary">{formatCurrency(comp.comprobanteData.totales.total)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={pagination.page === pageNum ? "default" : "outline"}
                        onClick={() => handlePageChange(pageNum)}
                        className="w-10"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            <p className="text-center text-sm text-muted-foreground mt-4">
              Página {pagination.page} de {pagination.totalPages} • {pagination.total} total de comprobantes
            </p>
          </>
        )}
      </main>
    </div>
  );
}
