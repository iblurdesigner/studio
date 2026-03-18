import { NextResponse } from 'next/server';
import { testConnection, getComprobantes } from '@/lib/database';

/**
 * GET /api/diag - Diagnostic endpoint to check database connection
 */
export async function GET() {
  console.log('[API /api/diag] Iniciando diagnóstico...');
  
  try {
    // Test connection
    console.log('[API /api/diag] Probando conexión...');
    const isConnected = await testConnection();
    console.log('[API /api/diag] ¿Conectado?:', isConnected);
    
    if (!isConnected) {
      return NextResponse.json({
        success: false,
        connected: false,
        error: 'No se pudo conectar a la base de datos',
        suggestions: [
          'Verifica que MySQL esté corriendo',
          'Verifica las credenciales en .env',
          'Verifica que la base de datos exista'
        ],
        config: {
          host: process.env.DB_HOST || 'localhost',
          database: process.env.DB_NAME || 'textscan_comprob_db',
          port: process.env.DB_PORT || '3306'
        }
      }, { status: 500 });
    }

    // Try to get a count
    console.log('[API /api/diag] Conexión exitosa, verificando tabla...');
    const result = await getComprobantes(1, 1);
    
    return NextResponse.json({
      success: true,
      connected: true,
      message: 'Conexión exitosa a la base de datos',
      database: {
        name: process.env.DB_NAME || 'textscan_comprob_db',
        totalComprobantes: result.total
      }
    });

  } catch (error) {
    console.error('[API /api/diag] Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Parse common MySQL errors
    let suggestion = 'Revisa los logs del servidor';
    if (errorMessage.includes('Access denied')) {
      suggestion = 'Credenciales incorrectas. Verifica DB_USER y DB_PASSWORD en .env';
    } else if (errorMessage.includes('ECONNREFUSED')) {
      suggestion = 'MySQL no está corriendo o el puerto es incorrecto';
    } else if (errorMessage.includes('Unknown database')) {
      suggestion = 'La base de datos no existe. Ejecuta el script SQL de creación';
    } else if (errorMessage.includes('get_next_sequence_number')) {
      suggestion = 'El stored procedure no existe. Ejecuta el script SQL de creación';
    }
    
    return NextResponse.json({
      success: false,
      connected: false,
      error: errorMessage,
      suggestion: suggestion
    }, { status: 500 });
  }
}
