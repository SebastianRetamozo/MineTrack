import { Eye, Edit, Trash2, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import type { Equipment, EquipmentType } from '../../types';

interface EquipmentTableProps {
  equipment: Equipment[];
  equipmentTypes: EquipmentType[];
  isLoading?: boolean;
  onView: (equipment: Equipment) => void;
  onEdit: (equipment: Equipment) => void;
  onDelete: (equipment: Equipment) => void;
}

export function EquipmentTable({
  equipment,
  equipmentTypes,
  isLoading,
  onView,
  onEdit,
  onDelete,
}: EquipmentTableProps) {
  if (isLoading) {
    return (
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Tipo</th>
              <th>Horómetro</th>
              <th>Desde Mantenimiento</th>
              <th>Progreso</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i}>
                <td className="px-4 py-3 border-b border-navy-100">
                  <div className="h-4 bg-navy-100 rounded w-24 animate-pulse" />
                </td>
                <td className="px-4 py-3 border-b border-navy-100">
                  <div className="h-4 bg-navy-100 rounded w-20 animate-pulse" />
                </td>
                <td className="px-4 py-3 border-b border-navy-100">
                  <div className="h-4 bg-navy-100 rounded w-20 animate-pulse" />
                </td>
                <td className="px-4 py-3 border-b border-navy-100">
                  <div className="h-4 bg-navy-100 rounded w-20 animate-pulse" />
                </td>
                <td className="px-4 py-3 border-b border-navy-100">
                  <div className="h-4 bg-navy-100 rounded w-32 animate-pulse" />
                </td>
                <td className="px-4 py-3 border-b border-navy-100">
                  <div className="h-4 bg-navy-100 rounded w-24 animate-pulse" />
                </td>
                <td className="px-4 py-3 border-b border-navy-100">
                  <div className="h-4 bg-navy-100 rounded w-24 animate-pulse" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (equipment.length === 0) {
    return (
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Tipo</th>
              <th>Horómetro</th>
              <th>Desde Mantenimiento</th>
              <th>Progreso</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className="py-12 text-center text-navy-500">
                No se encontraron equipos. Haz clic en "Agregar Equipo" para comenzar.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  const getEquipmentType = (typeId: string) =>
    equipmentTypes.find(t => t.id === typeId);

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Tipo</th>
            <th>Horómetro</th>
            <th>Desde Mantenimiento</th>
            <th>Progreso</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {equipment.map((item) => {
            const type = getEquipmentType(item.equipmentTypeId);
            const progress = item.maintenanceProgress;
            const hoursSinceMaintenance = progress?.hoursSinceMaintenance ?? (item.horometer - item.lastMaintenanceHorometer);
            const progressPercent = progress?.progress ?? 0;
            const maintenanceRequired = progress?.maintenanceRequired ?? (hoursSinceMaintenance >= item.appliedIntervalHours);

            return (
              <tr key={item.id}>
                <td className="font-mono font-medium text-navy-900">
                  {item.code}
                </td>
                <td>
                  <Badge variant="info">{type?.name || 'Desconocido'}</Badge>
                </td>
                <td className="font-mono text-navy-700">
                  {item.horometer.toLocaleString()}h
                </td>
                <td className="text-navy-700">
                  {hoursSinceMaintenance.toLocaleString()}h
                </td>
                <td className="w-48">
                  <ProgressBar
                    value={progressPercent}
                    max={100}
                    size="sm"
                    variant={maintenanceRequired ? 'danger' : progressPercent >= 80 ? 'warning' : 'success'}
                    showLabel
                  />
                </td>
                <td>
                  <Badge
                    variant={
                      maintenanceRequired ? 'danger' :
                      progressPercent >= 80 ? 'warning' : 'success'
                    }
                  >
                    {maintenanceRequired ? (
                      <>
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Requiere Mantenimiento
                      </>
                    ) : progressPercent >= 80 ? (
                      <>
                        <Clock className="w-3 h-3 mr-1" />
                        Mantenimiento Pronto
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Normal
                      </>
                    )}
                  </Badge>
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onView(item)}
                      aria-label={`Ver ${item.code}`}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(item)}
                      aria-label={`Editar ${item.code}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(item)}
                      aria-label={`Eliminar ${item.code}`}
                    >
                      <Trash2 className="w-4 h-4 text-danger-600" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}