import { NextRequest, NextResponse } from 'next/server';
import { saveComprobante, getComprobantes, testConnection } from '@/lib/database';
import { ReportData } from '@/lib/text-processor';

/**
 * GET /api/comprobantes/diag - Diagnostic endpoint
 */
export async function PING() {
  try {
    const isConnected = await testConnection();
    return NextResponse.json({
      success: true,
      connected: isConnected,
      message: isConnected ? 'Conexión exitosa' : 'No se pudo conectar'
    });
  } catch (error) {
    console.error('Error en diagnóstico:', error);
    return NextResponse.json({
      success: false,
      connected: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * POST /api/comprobantes - Save a new comprobante
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.titulo || !body.emisor || !body.receptor || !body.totales) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Test database connection first
    console.log('[API POST] Probando conexión a BD...');
    const isConnected = await testConnection();
    console.log('[API POST] Resultado conexión:', isConnected);
    
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Error de conexión a la base de datos. Verifica que MySQL esté corriendo.' },
        { status: 500 }
      );
    }

    // Save the comprobante
    console.log('[API POST] Guardando comprobante...');
    const savedComprobante = await saveComprobante(body);
    console.log('[API POST] Comprobante guardado:', savedComprobante.id);

    return NextResponse.json({
      success: true,
      data: savedComprobante,
      message: 'Comprobante guardado exitosamente'
    });

  } catch (error) {
    console.error('Error in POST /api/comprobantes:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/comprobantes - Get all comprobantes with pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    console.log('[API GET] page:', page, 'limit:', limit);
    console.log('[API GET] Probando conexión a BD...');
    
    // Test database connection first
    const isConnected = await testConnection();
    console.log('[API GET] Resultado conexión:', isConnected);
    
    if (!isConnected) {
      console.log('[API GET] No se pudo conectar a la BD');
      return NextResponse.json(
        { error: 'Error de conexión a la base de datos. Verifica que MySQL esté corriendo.' },
        { status: 500 }
      );
    }

    // Get comprobantes
    console.log('[API GET] Obteniendo comprobantes...');
    const result = await getComprobantes(page, limit);
    console.log('[API GET] Encontrados:', result.comprobantes.length, 'de', result.total);

    return NextResponse.json({
      success: true,
      data: result.comprobantes,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    });

  } catch (error) {
    console.error('Error in GET /api/comprobantes:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
