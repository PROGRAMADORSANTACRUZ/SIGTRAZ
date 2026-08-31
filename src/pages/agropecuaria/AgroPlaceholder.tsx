interface AgroPlaceholderProps {
  titulo: string
  descripcion: string
}

// Pagina temporal mientras se construye cada proceso de Agropecuaria.
export function AgroPlaceholder({ titulo, descripcion }: AgroPlaceholderProps) {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-2xl font-bold text-slate-900">
          {titulo}
        </h2>
        <p className="text-slate-500">{descripcion}</p>
      </header>
      <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white p-12 text-center text-slate-400">
        Modulo en construccion
      </div>
    </div>
  )
}
