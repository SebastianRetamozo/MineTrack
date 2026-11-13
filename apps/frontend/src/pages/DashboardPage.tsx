import { Truck, Wrench, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatDate, getProgressColor } from '../utils/helpers';
import { cn } from '../utils/helpers';
import { useEquipment, useEquipmentTypes, useMaintenance } from '../hooks/useApi';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { EmptyState } from '../components/ui/EmptyState';

export function DashboardPage() {
  const { data: equipmentData, isLoading: equipmentLoading } = useEquipment({ limit: 1000 });
  const { data: equipmentTypesData } = useEquipmentTypes({ limit: 100 });
  const { data: maintenanceData, isLoading: maintenanceLoading } = useMaintenance({ limit: 10 });

  const equipment = equipmentData?.data || [];
  const equipmentTypes = equipmentTypesData?.data || [];
  const recentMaintenance = maintenanceData?.data || [];

  const isLoading = equipmentLoading || maintenanceLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Panel Principal</h1>
            <p className="page-subtitle">Resumen del estado de equipos y mantenimiento</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="stat-card animate-pulse">
              <div className="flex items-center gap-3">
                <div className="stat-icon bg-navy-100" />
                <div>
                  <div className="h-4 bg-navy-100 rounded w-24" />
                  <div className="h-8 bg-navy-100 rounded w-16 mt-2" />
                </div>
              </div>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="animate-pulse">
            <div className="h-6 bg-navy-100 rounded w-48 mb-4" />
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-navy-100 rounded" />
              ))}
            </div>
          </Card>
          <Card className="animate-pulse">
            <div className="h-6 bg-navy-100 rounded w-48 mb-4" />
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-navy-100 rounded" />
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalEquipment = equipment.length;
  const equipmentRequiringMaintenance = equipment.filter(e => e.maintenanceProgress?.maintenanceRequired).length;
  const equipmentMaintenanceSoon = equipment.filter(e =>
    e.maintenanceProgress && !e.maintenanceProgress.maintenanceRequired && e.maintenanceProgress.progress >= 80
  ).length;
  const equipmentNormalCycle = equipment.filter(e =>
    e.maintenanceProgress && !e.maintenanceProgress.maintenanceRequired && e.maintenanceProgress.progress < 80
  ).length;

  // Equipment by type
  const equipmentByType = equipmentTypes.map(type => ({
    type: type.name,
    count: equipment.filter(e => e.equipmentTypeId === type.id).length,
    interval: type.maintenanceIntervalHours,
  }));

  // Equipment needing attention (maintenance required or soon)
  const equipmentNeedingAttention = equipment
    .filter(e => e.maintenanceProgress && (e.maintenanceProgress.maintenanceRequired || e.maintenanceProgress.progress >= 80))
    .sort((a, b) => (b.maintenanceProgress?.progress || 0) - (a.maintenanceProgress?.progress || 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Panel Principal</h1>
          <p className="page-subtitle">Resumen del estado de equipos y mantenimiento</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="stat-card">
          <div className="flex items-center gap-3">
            <div className="stat-icon bg-navy-100 text-navy-600">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <p className="stat-label">Total Equipos</p>
              <p className="stat-value">{totalEquipment}</p>
            </div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="flex items-center gap-3">
            <div className="stat-icon bg-danger-100 text-danger-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="stat-label">Requiere Mantenimiento</p>
              <p className="stat-value text-danger-600">{equipmentRequiringMaintenance}</p>
            </div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="flex items-center gap-3">
            <div className="stat-icon bg-warning-100 text-warning-600">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <p className="stat-label">Mantenimiento Pronto</p>
              <p className="stat-value text-warning-600">{equipmentMaintenanceSoon}</p>
            </div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="flex items-center gap-3">
            <div className="stat-icon bg-success-100 text-success-600">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="stat-label">Ciclo Normal</p>
              <p className="stat-value text-success-600">{equipmentNormalCycle}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Equipment by type & Equipment needing attention */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="px-6 py-4 border-b border-navy-100">
            <h3 className="text-lg font-semibold text-navy-900">Equipos por Tipo</h3>
          </div>
          <CardContent className="p-0">
            {equipmentByType.length === 0 ? (
              <EmptyState
                icon={<Truck className="w-16 h-16 text-navy-200" />}
                title="Sin tipos de equipos"
                description="Agrega tipos de equipos para empezar a registrar equipos."
              />
            ) : (
              <div className="divide-y divide-navy-100">
                {equipmentByType.map((item) => (
                  <div key={item.type} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-navy-100 flex items-center justify-center">
                        <Truck className="w-5 h-5 text-navy-600" />
                      </div>
                      <div>
                        <p className="font-medium text-navy-900">{item.type}</p>
                        <p className="text-sm text-navy-500">Intervalo: {item.interval.toLocaleString()}h</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-navy-900">{item.count}</p>
                      <p className="text-sm text-navy-500">unidades</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <div className="px-6 py-4 border-b border-navy-100">
            <h3 className="text-lg font-semibold text-navy-900">Equipos que Requieren Atención</h3>
          </div>
          <CardContent className="p-0">
            {equipmentNeedingAttention.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-success-500 mx-auto mb-3" />
                <p className="text-navy-500">Todos los equipos dentro del ciclo normal de mantenimiento</p>
              </div>
            ) : (
              <div className="divide-y divide-navy-100">
                {equipmentNeedingAttention.map((item) => {
                  const progress = item.maintenanceProgress!;
                  const progressPercent = progress.progress;
                  const progressVariant = getProgressColor(progressPercent);
                  const remainingHours = item.appliedIntervalHours - progress.hoursSinceMaintenance;
                  const type = equipmentTypes.find(t => t.id === item.equipmentTypeId);

                  return (
                    <div key={item.id} className="px-6 py-4 hover:bg-navy-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium text-navy-900">{item.code}</span>
                            {type && <Badge variant="info">{type.name}</Badge>}
                            <Badge variant={progress.maintenanceRequired ? 'danger' : 'warning'}>
                              {progress.maintenanceRequired ? 'Requiere Mantenimiento' : 'Mantenimiento Pronto'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-navy-500">
                            <span>Horómetro: <span className="font-mono text-navy-700">{item.horometer.toLocaleString()}h</span></span>
                            <span>Desde mantenimiento: <span className="font-mono text-navy-700">{progress.hoursSinceMaintenance.toLocaleString()}h</span></span>
                            <span>Restantes: <span className={cn('font-mono', progress.maintenanceRequired ? 'text-danger-600' : 'text-success-600')}>{remainingHours.toLocaleString()}h</span></span>
                          </div>
                        </div>
                        <div className="w-32 flex-shrink-0">
                          <ProgressBar
                            value={progressPercent}
                            max={100}
                            size="sm"
                            variant={progressVariant as 'success' | 'warning' | 'danger'}
                            showLabel
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent maintenance activity */}
      <Card>
        <div className="px-6 py-4 border-b border-navy-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-navy-900">Actividad Reciente de Mantenimiento</h3>
          <Badge variant="info">{recentMaintenance.length} recientes</Badge>
        </div>
        <CardContent className="p-0">
          {recentMaintenance.length === 0 ? (
            <EmptyState
              icon={<Wrench className="w-16 h-16 text-navy-200" />}
              title="Sin registros de mantenimiento aún"
              description="Los registros de mantenimiento aparecerán aquí una vez que registres mantenimiento para los equipos."
            />
          ) : (
            <div className="divide-y divide-navy-100">
              {recentMaintenance.map((record) => {
                const eq = equipment.find(e => e.id === record.equipmentId);
                const type = equipmentTypes.find(t => t.id === eq?.equipmentTypeId);
                return (
                  <div key={record.id} className="px-6 py-4 flex items-center justify-between hover:bg-navy-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-navy-100 flex items-center justify-center flex-shrink-0">
                        <Wrench className="w-6 h-6 text-navy-600" />
                      </div>
                      <div>
                        <p className="font-medium text-navy-900">
                          {eq ? eq.code : 'Equipo Desconocido'}
                        </p>
                        <p className="text-sm text-navy-500">
                          {type ? type.name : 'Tipo Desconocido'} • {formatDate(record.performedAt)}
                        </p>
                        <p className="text-sm font-mono text-navy-600">
                          Horómetro: {record.horometerAtMaintenance.toLocaleString()}h
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {record.description && (
                        <p className="text-sm text-navy-500 italic max-w-xs truncate">
                          {record.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}