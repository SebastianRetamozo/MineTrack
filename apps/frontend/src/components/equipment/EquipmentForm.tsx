import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Dialog, DialogFooter } from '../ui/Dialog';
import type { Equipment, EquipmentType } from '../../types';

interface EquipmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { code: string; equipmentTypeId: string; horometer: number; appliedIntervalHours: number }) => Promise<void>;
  equipmentTypes: EquipmentType[];
  initialData?: Equipment | null;
  isLoading?: boolean;
  title?: string;
}

export function EquipmentForm({
  isOpen,
  onClose,
  onSubmit,
  equipmentTypes,
  initialData,
  isLoading,
  title,
}: EquipmentFormProps) {
  const [formData, setFormData] = useState({
    code: '',
    equipmentTypeId: '',
    horometer: 0,
    appliedIntervalHours: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!initialData;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) newErrors.code = 'El código del equipo es obligatorio';
    if (!formData.equipmentTypeId) newErrors.equipmentTypeId = 'El tipo de equipo es obligatorio';
    if (formData.horometer < 0) newErrors.horometer = 'El horómetro no puede ser negativo';
    if (!formData.appliedIntervalHours || parseInt(formData.appliedIntervalHours) <= 0) {
      newErrors.appliedIntervalHours = 'El intervalo de mantenimiento debe ser positivo';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await onSubmit({
        code: formData.code,
        equipmentTypeId: formData.equipmentTypeId,
        horometer: formData.horometer,
        appliedIntervalHours: parseInt(formData.appliedIntervalHours),
      });
      onClose();
    } catch (error) {
      console.error('Form submit error:', error);
    }
  };

  const selectedType = equipmentTypes.find(t => t.id === formData.equipmentTypeId);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title || (isEditing ? 'Editar Equipo' : 'Agregar Equipo')}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Código de Equipo"
            name="code"
            value={formData.code}
            onChange={handleChange}
            error={errors.code}
            placeholder="Ej., TRK-001"
            required
            maxLength={50}
          />
          <Select
            label="Tipo de Equipo"
            name="equipmentTypeId"
            value={formData.equipmentTypeId}
            onChange={handleChange}
            error={errors.equipmentTypeId}
            options={equipmentTypes.map(t => ({ value: t.id, label: `${t.name} (${t.maintenanceIntervalHours}h)` }))}
            placeholder="Seleccionar tipo de equipo"
            required
          />
          <Input
            type="number"
            label="Horómetro Actual"
            name="horometer"
            value={formData.horometer}
            onChange={handleChange}
            error={errors.horometer}
            min={0}
            step={1}
            required
          />
          <Input
            type="number"
            label="Intervalo de Mantenimiento (horas)"
            name="appliedIntervalHours"
            value={formData.appliedIntervalHours}
            onChange={handleChange}
            error={errors.appliedIntervalHours}
            min={1}
            step={1}
            required
            helperText={selectedType ? `Por defecto para ${selectedType.name}: ${selectedType.maintenanceIntervalHours}h` : undefined}
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isLoading}
          >
            {isEditing ? 'Guardar Cambios' : 'Crear Equipo'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}