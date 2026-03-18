import { ScanText, FileText, List } from 'lucide-react';
import Link from 'next/link';

export function Header() {
  return (
    <header className="border-b border-border/60">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-primary rounded-lg">
            <ScanText className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex flex-col align-items-center">
            TextScan FM
            <span className="text-sm text-gray-400">Comprobantes de Arriendo</span>
          </h1>
        </div>
        
        <nav className="flex items-center gap-2">
          <Link 
            href="/" 
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-accent transition-colors text-foreground"
          >
            <FileText className="h-5 w-5" />
            <span className="hidden sm:inline">Nuevo Comprobante</span>
          </Link>
          <Link 
            href="/comprobantes" 
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <List className="h-5 w-5" />
            <span className="hidden sm:inline">Ver Comprobantes</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
