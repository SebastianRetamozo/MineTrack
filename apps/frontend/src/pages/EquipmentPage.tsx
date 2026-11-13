import { useState } from 'react';
import { Plus, Truck, Wrench, AlertTriangle, CheckCircle } from 'lucide-react';
import { useEquipment, useEquipmentTypes, useCreateEquipment, useUpdateEquipment, useDeleteEquipment } from '../hooks/useApi';
import { EquipmentTable } from '../components/equipment/EquipmentTable';
import { EquipmentForm } from '../components/equipment/EquipmentForm';
import { EquipmentDetail } from '../components/equipment/EquipmentDetail';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import type { Equipment } from '../types';

export function EquipmentPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [maintenanceFilter, setMaintenanceFilter] = useState<'all' | 'required' | 'soon' | 'normal'>('all');
  const [page, setPage] = useState(1);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { data: equipmentTypesData, isLoading: equipmentTypesLoading } = useEquipmentTypes({ limit: 100 });
  const equipmentTypes = equipmentTypesData?.data || [];

  const { data: equipmentData, isLoading, refetch } = useEquipment({
    page,
    limit: 20,
    equipmentTypeId: typeFilter || undefined,
    maintenanceRequired: maintenanceFilter === 'required' ? true : maintenanceFilter === 'normal' ? false : undefined,
  });

  const createMutation = useCreateEquipment();
  const updateMutation = useUpdateEquipment();
  const deleteMutation = useDeleteEquipment();

  const equipment = equipmentData?.data || [];
  const pagination = equipmentData?.pagination;

  const filteredEquipment = equipment.filter(item => {
    if (search && !item.code.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleCreate = async (formData: { code: string; equipmentTypeId: string; horometer: number; appliedIntervalHours: number }) => {
    await createMutation.mutateAsync({
      code: formData.code,
      equipmentTypeId: formData.equipmentTypeId,
      horometer: formData.horometer,
      appliedIntervalHours: formData.appliedIntervalHours,
    });
    setIsFormOpen(false);
    refetch();
  };

  const handleUpdate = async (formData: { code: string; equipmentTypeId: string; horometer: number; appliedIntervalHours: number }) => {
    if (!editingEquipment) return;
    await updateMutation.mutateAsync({
      id: editingEquipment.id,
      data: {
        code: formData.code,
        equipmentTypeId: formData.equipmentTypeId,
        horometer: formData.horometer,
        appliedIntervalHours: formData.appliedIntervalHours,
      },
    });
    setIsFormOpen(false);
    setEditingEquipment(null);
    refetch();
  };

  const handleDelete = async (equipment: Equipment) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar ${equipment.code}? Esta acción no se puede deshacer.`)) {
      await deleteMutation.mutateAsync(equipment.id);
      refetch();
    }
  };

  const openCreateForm = () => {
    setEditingEquipment(null);
    setIsFormOpen(true);
  };

  const openEditForm = (equipment: Equipment) => {
    setEditingEquipment(equipment);
    setIsFormOpen(true);
  };

  const openDetail = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
    setIsDetailOpen(true);
  };

  const isFormDisabled = equipmentTypesLoading || equipmentTypes.length === 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Equipos</h1>
          <p className="page-subtitle">Gestiona y controla todos los equipos mineros</p>
        </div>
        <Button onClick={openCreateForm} leftIcon={<Plus className="w-4 h-4" />} disabled={isFormDisabled}>
          Agregar Equipo
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="stat-icon bg-navy-100 text-navy-600">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <p className="stat-label">Total Equipos</p>
              <p className="stat-value">{pagination?.total || 0}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="stat-icon bg-danger-100 text-danger-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="stat-label">Requiere Mantenimiento</p>
              <p className="stat-value text-danger-600">
                {filteredEquipment.filter(e => e.maintenanceProgress?.maintenanceRequired).length}
              </p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="stat-icon bg-warning-100 text-warning-600">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <p className="stat-label">Mantenimiento Pronto</p>
              <p className="stat-value text-warning-600">
                {filteredEquipment.filter(e => e.maintenanceProgress && !e.maintenanceProgress.maintenanceRequired && e.maintenanceProgress.progress >= 80).length}
              </p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="stat-icon bg-success-100 text-success-600">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="stat-label">Ciclo Normal</p>
              <p className="stat-value text-success-600">
                {filteredEquipment.filter(e => e.maintenanceProgress && !e.maintenanceProgress.maintenanceRequired && e.maintenanceProgress.progress < 80).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Buscar por código de equipo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-3 flex-wrap">
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={[
                { value: '', label: 'Todos los Tipos' },
                ...equipmentTypes.map(t => ({ value: t.id, label: t.name })),
              ]}
              placeholder="Filtrar por tipo"
              disabled={equipmentTypesLoading}
            />
            <Select
              value={maintenanceFilter}
              onChange={(e) => setMaintenanceFilter(e.target.value as typeof maintenanceFilter)}
              options={[
                { value: 'all', label: 'Todos los Estados' },
                { value: 'required', label: 'Requiere Mantenimiento' },
                { value: 'soon', label: 'Mantenimiento Pronto' },
                { value: 'normal', label: 'Normal' },
              ]}
              placeholder="Filtrar por estado"
            />
          </div>
        </div>
      </div>

      {/* Equipment Table */}
      <div className="card">
        <EquipmentTable
          equipment={filteredEquipment}
          equipmentTypes={equipmentTypes}
          isLoading={isLoading}
          onView={openDetail}
          onEdit={openEditForm}
          onDelete={handleDelete}
        />

        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-navy-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-navy-500">
                Página {pagination.page} de {pagination.totalPages} ({pagination.total} total)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Forms */}
      <EquipmentForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingEquipment(null);
        }}
        onSubmit={editingEquipment ? handleUpdate : handleCreate}
        equipmentTypes={equipmentTypes}
        initialData={editingEquipment}
        isLoading={createMutation.isPending || updateMutation.isPending}
        title={editingEquipment ? 'Editar Equipo' : 'Agregar Equipo'}
      />

      <EquipmentDetail
        equipment={selectedEquipment}
        equipmentType={equipmentTypes.find(t => t.id === selectedEquipment?.equipmentTypeId) || null}
        maintenanceHistory={selectedEquipment?.maintenance || []}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedEquipment(null);
        }}
        onEdit={openEditForm}
        onDelete={handleDelete}
        onRegisterMaintenance={(eq) => {
          window.location.href = `/mantenimiento?equipo=${eq.id}`;
        }}
      />
    </div>
  );
}