import { useState } from 'react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useEquipmentTypes, useCreateEquipmentType, useUpdateEquipmentType, useDeleteEquipmentType } from '../hooks/useApi';
import { Dialog, DialogFooter } from '../components/ui/Dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { AlertCircle } from 'lucide-react';
import type { EquipmentType } from '../types';

export function SettingsPage() {
  const { data: equipmentTypesData, isLoading } = useEquipmentTypes({ limit: 100 });
  const equipmentTypes = equipmentTypesData?.data || [];

  const createMutation = useCreateEquipmentType();
  const updateMutation = useUpdateEquipmentType();
  const deleteMutation = useDeleteEquipmentType();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingType, setEditingType] = useState<EquipmentType | null>(null);
  const [formData, setFormData] = useState({ name: '', maintenanceIntervalHours: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'El nombre es obligatorio';
    if (!formData.maintenanceIntervalHours || parseInt(formData.maintenanceIntervalHours) <= 0) {
      errors.maintenanceIntervalHours = 'El intervalo de mantenimiento debe ser positivo';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitError(null);

    try {
      if (editingType) {
        await updateMutation.mutateAsync({
          id: editingType.id,
          data: {
            name: formData.name,
            maintenanceIntervalHours: parseInt(formData.maintenanceIntervalHours),
          },
        });
      } else {
        await createMutation.mutateAsync({
          name: formData.name,
          maintenanceIntervalHours: parseInt(formData.maintenanceIntervalHours),
        });
      }
      setIsFormOpen(false);
      resetForm();
    } catch (error: any) {
      const message = error?.message || 'Error al guardar el tipo de equipo';
      setSubmitError(message);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', maintenanceIntervalHours: '' });
    setFormErrors({});
    setSubmitError(null);
    setEditingType(null);
  };

  const openCreateForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (type: EquipmentType) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      maintenanceIntervalHours: type.maintenanceIntervalHours.toString(),
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (type: EquipmentType) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar "${type.name}"? Esta acción no se puede deshacer.`)) {
      await deleteMutation.mutateAsync(type.id);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="page-title">Configuración</h1>
        <p className="page-subtitle">Gestiona tipos de equipos e intervalos de mantenimiento</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-navy-900">Tipos de Equipos</h3>
            <Button onClick={openCreateForm} leftIcon={<Plus className="w-4 h-4" />}>
              Agregar Tipo de Equipo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-navy-100 rounded animate-pulse" />
              ))}
            </div>
          ) : equipmentTypes.length === 0 ? (
            <EmptyState
              icon={<Plus className="w-16 h-16 text-navy-200" />}
              title="Sin tipos de equipos"
              description="No hay tipos de equipos configurados aún. Crea tu primer tipo para empezar a registrar equipos."
              actionLabel="Crear primer tipo"
              onAction={openCreateForm}
            />
          ) : (
            <div className="divide-y divide-navy-100">
              {equipmentTypes.map((type) => (
                <div key={type.id} className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-navy-100 flex items-center justify-center">
                      <span className="text-2xl font-bold text-navy-700">
                        {type.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-navy-900">{type.name}</p>
                      <p className="text-sm text-navy-500">
                        Intervalo de mantenimiento por defecto: {type.maintenanceIntervalHours.toLocaleString()} horas
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="info">{type._count?.equipment || 0} equipos</Badge>
                        <Badge variant="gray">Creado {new Date(type.createdAt).toLocaleDateString()}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditForm(type)}
                      leftIcon={<Edit className="w-4 h-4" />}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(type)}
                      leftIcon={<Trash2 className="w-4 h-4 text-danger-600" />}
                      className="text-danger-600 hover:bg-danger-50"
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Equipment Type Form Dialog */}
      <Dialog
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          resetForm();
        }}
        title={editingType ? 'Editar Tipo de Equipo' : 'Agregar Tipo de Equipo'}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {submitError && (
            <div className="flex items-center gap-2 p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}
          <Input
            label="Nombre *"
            name="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            error={formErrors.name}
            placeholder="Ej., Camión, Excavadora"
            required
          />
          <Input
            type="number"
            label="Intervalo de Mantenimiento (horas) *"
            name="maintenanceIntervalHours"
            value={formData.maintenanceIntervalHours}
            onChange={(e) => setFormData(prev => ({ ...prev, maintenanceIntervalHours: e.target.value }))}
            error={formErrors.maintenanceIntervalHours}
            min={1}
            step={1}
            required
            placeholder="Ej., 250"
          />
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={createMutation.isPending || updateMutation.isPending}>
              {editingType ? 'Guardar Cambios' : 'Crear Tipo de Equipo'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}