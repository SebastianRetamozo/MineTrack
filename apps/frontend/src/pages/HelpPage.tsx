import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { cn } from '../utils/helpers';
import { CheckCircle, AlertTriangle, Clock, Wrench, Truck, Gauge, Info } from 'lucide-react';

type HelpItem = string | { icon: React.ComponentType<{ className?: string }>; color: string; label: string; description: string };

const sections: { title: string; items: HelpItem[] }[] = [
  {
    title: 'Primeros Pasos',
    items: [
      'Agrega tipos de equipos en Configuración con sus intervalos de mantenimiento por defecto',
      'Registra equipos con sus códigos, tipos y lecturas iniciales de horómetro',
      'Monitorea el progreso de mantenimiento en el Panel Principal',
      'Registra mantenimiento cuando el equipo alcance el umbral',
    ],
  },
  {
    title: 'Gestión de Equipos',
    items: [
      'Cada unidad de equipo tiene su propio horómetro (contador de horas de operación)',
      'Los valores del horómetro solo pueden aumentar, no pueden disminuir',
      'El código de equipo debe ser único en todos los equipos',
      'El progreso de mantenimiento se calcula como: (horómetro actual - horómetro último mantenimiento) / intervalo aplicado × 100%',
    ],
  },
  {
    title: 'Flujo de Mantenimiento',
    items: [
      'El mantenimiento es requerido cuando las horas desde el último mantenimiento ≥ intervalo aplicado',
      'Registrar mantenimiento: guarda el horómetro actual, crea entrada en historial, actualiza horómetro último mantenimiento',
      'El intervalo aplicado se actualiza al intervalo por defecto actual del tipo de equipo',
      'El horómetro total se preserva (se actualiza a la lectura del mantenimiento)',
    ],
  },
  {
    title: 'Indicadores del Panel Principal',
    items: [
      { icon: CheckCircle, color: 'text-success-600', label: 'Normal', description: 'Progreso < 80%, mantenimiento no requerido' },
      { icon: Clock, color: 'text-warning-600', label: 'Mantenimiento Pronto', description: 'Progreso ≥ 80%, acercándose al umbral' },
      { icon: AlertTriangle, color: 'text-danger-600', label: 'Requiere Mantenimiento', description: 'Progreso ≥ 100%, atención inmediata necesaria' },
    ],
  },
];

export function HelpPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="page-title">Ayuda y Documentación</h1>
        <p className="page-subtitle">Aprende a usar MineTrack efectivamente</p>
      </div>

      <div className="space-y-6">
        {sections.map((section, index) => (
          <Card key={index}>
            <CardHeader>
              <h3 className="text-lg font-semibold text-navy-900">{section.title}</h3>
            </CardHeader>
            <CardContent>
              {section.items.length > 0 && typeof section.items[0] === 'object' && 'icon' in section.items[0] ? (
                <div className="space-y-4">
                  {section.items.map((item, i) => {
                    const typedItem = item as { icon: React.ComponentType<{ className?: string }>; color: string; label: string; description: string };
                    const Icon = typedItem.icon;
                    return (
                      <div key={i} className="flex items-start gap-3">
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', `${typedItem.color} bg-opacity-10`)}>

                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-navy-900">{typedItem.label}</p>
                          <p className="text-sm text-navy-500">{typedItem.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <ul className="space-y-3">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" />
                      <span className="text-navy-700">{item as string}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-navy-600" />
              <h3 className="text-lg font-semibold text-navy-900">Notas Importantes</h3>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-navy-600">
              <li className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
                <span>Los intervalos de mantenimiento mostrados son valores ilustrativos de demostración y no recomendaciones reales de fabricantes. Consulta siempre los manuales de los equipos para los programas de mantenimiento adecuados.</span>
              </li>
              <li className="flex items-start gap-3">
                <Gauge className="w-5 h-5 text-navy-600 flex-shrink-0 mt-0.5" />
                <span>Los valores del horómetro representan horas de operación y solo deben aumentar. El sistema impide disminuir los valores del horómetro mediante actualizaciones normales.</span>
              </li>
              <li className="flex items-start gap-3">
                <Wrench className="w-5 h-5 text-navy-600 flex-shrink-0 mt-0.5" />
                <span>Al registrar mantenimiento, el intervalo aplicado se actualiza al intervalo por defecto actual del tipo de equipo. Esto asegura que el equipo use el programa de mantenimiento más reciente.</span>
              </li>
              <li className="flex items-start gap-3">
                <Truck className="w-5 h-5 text-navy-600 flex-shrink-0 mt-0.5" />
                <span>Los códigos de equipo deben ser únicos. El sistema impide la creación de códigos duplicados.</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-navy-900">Atajos de Teclado</h3>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 p-3 bg-navy-50 rounded-lg">
                <kbd className="px-2 py-1 bg-white border border-navy-200 rounded text-sm font-mono">Esc</kbd>
                <span className="text-navy-700">Cerrar diálogo</span>
              </div>
            </div>
            <p className="mt-4 text-sm text-navy-500">
              Actualmente solo se soporta la tecla <kbd className="px-1.5 py-0.5 bg-white border border-navy-200 rounded font-mono">Esc</kbd> para cerrar diálogos.
              La navegación por teclado entre páginas no está implementada.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}