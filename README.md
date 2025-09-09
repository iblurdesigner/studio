# TextScan_Arriendo

Una aplicación web Next.js para extraer texto de imágenes y generar comprobantes de pago estructurados.

## Características

- **OCR en el navegador**: Extracción de texto usando Tesseract.js
- **Procesamiento de texto**: Análisis inteligente del texto extraído usando patrones y reglas
- **Generación de PDF**: Exportación de comprobantes en formato PDF
- **Interfaz moderna**: UI construida con Tailwind CSS y shadcn/ui
- **Sin dependencias externas**: No requiere APIs de terceros ni claves de API

## Funcionalidades

1. **Subida de imágenes**: Soporte para JPG, PNG, JPEG
2. **Extracción de texto**: OCR automático usando Tesseract.js
3. **Edición de texto**: Revisión y corrección del texto extraído
4. **Generación de informe**: Procesamiento automático para crear comprobantes estructurados
5. **Exportación**: Descarga e impresión de PDFs

## Instalación

```bash
# Clonar el repositorio
git clone <repository-url>
cd TextScan_Arriendo

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev
```

## Uso

1. Abre [http://localhost:9002](http://localhost:9002) en tu navegador
2. Sube una imagen de un comprobante o recibo
3. Revisa y edita el texto extraído si es necesario
4. Genera el informe estructurado
5. Descarga o imprime el PDF resultante

## Tecnologías

- **Frontend**: Next.js 15, React 18, TypeScript
- **UI**: Tailwind CSS, shadcn/ui, Radix UI
- **OCR**: Tesseract.js
- **PDF**: jsPDF, jspdf-autotable
- **Procesamiento**: Algoritmos de coincidencia de patrones personalizados

## Estructura del Proyecto

```
src/
├── app/                 # Páginas de Next.js
├── components/          # Componentes reutilizables
│   ├── ui/             # Componentes de UI base
│   └── header.tsx      # Header de la aplicación
├── lib/                # Utilidades y lógica de negocio
│   ├── text-processor.ts  # Procesador de texto personalizado
│   └── utils.ts        # Utilidades generales
└── hooks/              # Hooks personalizados de React
```

## Scripts Disponibles

- `npm run dev` - Ejecuta el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run start` - Ejecuta la aplicación en modo producción
- `npm run lint` - Ejecuta el linter
- `npm run typecheck` - Verifica los tipos de TypeScript

## Configuración

No se requiere configuración adicional. La aplicación funciona completamente en el navegador sin necesidad de APIs externas o claves de configuración.

## Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request