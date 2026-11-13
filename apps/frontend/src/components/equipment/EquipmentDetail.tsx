import { AlertTriangle, CheckCircle, Clock, Wrench, Hash, Gauge } from 'lucide-react';
import { formatDate, getProgressColor, getMaintenanceStatusText } from '../../utils/helpers';
import { cn } from '../../utils/helpers';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { Dialog, DialogFooter } from '../ui/Dialog';
import type { Equipment, EquipmentType, Maintenance } from '../../types';

interface EquipmentDetailProps {
  equipment: Equipment | null;
  equipmentType: EquipmentType | null;
  maintenanceHistory: Maintenance[];
  isOpen: boolean;
  onClose: () => void;
  onEdit: (equipment: Equipment) => void;
  onDelete: (equipment: Equipment) => void;
  onRegisterMaintenance: (equipment: Equipment) => void;
}

export function EquipmentDetail({
  equipment,
  equipmentType,
  maintenanceHistory,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onRegisterMaintenance,
}: EquipmentDetailProps) {
  if (!equipment || !isOpen) return null;

  const progress = equipment.maintenanceProgress;
  const hoursSinceMaintenance = progress?.hoursSinceMaintenance ?? (equipment.horometer - equipment.lastMaintenanceHorometer);
  const progressPercent = progress?.progress ?? 0;
  const maintenanceRequired = progress?.maintenanceRequired ?? (hoursSinceMaintenance >= equipment.appliedIntervalHours);
  const remainingHours = Math.max(0, equipment.appliedIntervalHours - hoursSinceMaintenance);
  const progressVariant = getProgressColor(progressPercent);
  const statusText = getMaintenanceStatusText(progressPercent, maintenanceRequired);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={equipment.code}
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Header with key metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="stat-icon">
                <Gauge className="w-8 h-8" />
              </div>
              <div>
                <p className="stat-label">Horómetro Actual</p>
                <p className="stat-value font-mono">{equipment.horometer.toLocaleString()}h</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="stat-icon">
                <Clock className="w-8 h-8" />
              </div>
              <div>
                <p className="stat-label">Desde Último Mantenimiento</p>
                <p className="stat-value font-mono">{hoursSinceMaintenance.toLocaleString()}h</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="stat-icon">
                <Hash className="w-8 h-8" />
              </div>
              <div>
                <p className="stat-label">Intervalo Aplicado</p>
                <p className="stat-value font-mono">{equipment.appliedIntervalHours.toLocaleString()}h</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="stat-icon">
                {maintenanceRequired ? (
                  <AlertTriangle className="w-8 h-8 text-danger-500" />
                ) : (
                  <CheckCircle className="w-8 h-8 text-success-500" />
                )}
              </div>
              <div>
                <p className="stat-label">Horas Restantes</p>
                <p className={cn('stat-value font-mono', maintenanceRequired ? 'text-danger-600' : 'text-success-600')}>
                  {remainingHours.toLocaleString()}h
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-navy-700">Progreso de Mantenimiento</span>
            <Badge variant={progressVariant === 'danger' ? 'danger' : progressVariant === 'warning' ? 'warning' : 'success'}>
              {statusText}
            </Badge>
          </div>
          <ProgressBar
            value={progressPercent}
            max={100}
            size="lg"
            variant={progressVariant as 'success' | 'warning' | 'danger'}
            showLabel
          />
        </div>

        {/* Equipment info */}
        <div className="grid gap-4 sm:grid-cols-2 border-t border-navy-100 pt-6">
          <div>
            <h3 className="text-sm font-medium text-navy-700 mb-3">Detalles del Equipo</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-navy-500">Tipo</dt>
                <dd className="font-medium text-navy-900">{equipmentType?.name || 'Desconocido'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-navy-500">Código</dt>
                <dd className="font-mono font-medium text-navy-900">{equipment.code}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-navy-500">Horómetro Último Mantenimiento</dt>
                <dd className="font-mono text-navy-900">{equipment.lastMaintenanceHorometer.toLocaleString()}h</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-navy-500">Intervalo Por Defecto del Tipo</dt>
                <dd className="font-mono text-navy-900">{equipmentType?.maintenanceIntervalHours.toLocaleString()}h</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-navy-500">Creado</dt>
                <dd className="text-navy-900">{formatDate(equipment.createdAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-navy-500">Actualizado</dt>
                <dd className="text-navy-900">{formatDate(equipment.updatedAt)}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h3 className="text-sm font-medium text-navy-700 mb-3">Acciones Rápidas</h3>
            <div className="flex flex-col gap-2">
              <Button
                variant="primary"
                onClick={() => {
                  onRegisterMaintenance(equipment);
                  onClose();
                }}
                className="w-full"
                leftIcon={<Wrench className="w-4 h-4" />}
              >
                Registrar Mantenimiento
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  onEdit(equipment);
                  onClose();
                }}
                className="w-full"
                leftIcon={<Wrench className="w-4 h-4" />}
              >
                Editar Equipo
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  onDelete(equipment);
                  onClose();
                }}
                className="w-full"
                leftIcon={<Wrench className="w-4 h-4" />}
              >
                Eliminar Equipo
              </Button>
            </div>
          </div>
        </div>

        {/* Maintenance History */}
        <div className="border-t border-navy-100 pt-6">
          <h3 className="text-sm font-medium text-navy-700 mb-3">Historial de Mantenimiento</h3>
          {maintenanceHistory.length === 0 ? (
            <div className="text-center py-8 text-navy-500">
              <Wrench className="w-12 h-12 mx-auto text-navy-200 mb-3" />
              <p className="text-navy-500">Sin registros de mantenimiento aún</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Horómetro</th>
                    <th>Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceHistory.map((record) => (
                    <tr key={record.id}>
                      <td className="font-medium text-navy-900">
                        {formatDate(record.performedAt)}
                      </td>
                      <td className="font-mono text-navy-700">
                        {record.horometerAtMaintenance.toLocaleString()}h
                      </td>
                      <td className="text-navy-700">
                        {record.description || <span className="text-navy-400 italic">Sin descripción</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            onRegisterMaintenance(equipment);
            onClose();
          }}
          leftIcon={<Wrench className="w-4 h-4" />}
        >
          Registrar Mantenimiento
        </Button>
      </DialogFooter>
    </Dialog>
  );
}