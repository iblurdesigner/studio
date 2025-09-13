import { NextRequest, NextResponse } from 'next/server';
import { getComprobante, testConnection } from '@/lib/database';

/**
 * GET /api/comprobantes/[id] - Get a specific comprobante by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID de comprobante inválido' },
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

    // Get the comprobante
    const comprobante = await getComprobante(id);

    if (!comprobante) {
      return NextResponse.json(
        { error: 'Comprobante no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: comprobante
    });

  } catch (error) {
    console.error('Error in GET /api/comprobantes/[id]:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
