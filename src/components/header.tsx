import { ScanText } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b border-border/60">
      <div className="container mx-auto px-4 h-20 flex items-center gap-4">
        <div className="p-2 bg-primary rounded-lg">
          <ScanText className="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex flex-col align-items-center">
          TextScan FM
          <span className="text-sm text-gray-400">Comprobantes de Arriendo</span>
        </h1>
      </div>
    </header>
  );
}
