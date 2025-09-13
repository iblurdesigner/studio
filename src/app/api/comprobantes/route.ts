import { NextRequest, NextResponse } from 'next/server';
import { saveComprobante, getComprobantes, testConnection } from '@/lib/database';
import { ReportData } from '@/lib/text-processor';

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
    const isConnected = await testConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Error de conexión a la base de datos' },
        { status: 500 }
      );
    }

    // Save the comprobante
    const savedComprobante = await saveComprobante(body);

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
        details: error instanceof Error ? error.message : 'Error desconocido'
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

    // Test database connection first
    const isConnected = await testConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Error de conexión a la base de datos' },
        { status: 500 }
      );
    }

    // Get comprobantes
    const result = await getComprobantes(page, limit);

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
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
