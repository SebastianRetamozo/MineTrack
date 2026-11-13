import { useState, useEffect } from 'react';
import { Plus, Wrench, Eye } from 'lucide-react';
import { formatDate } from '../utils/helpers';
import { cn } from '../utils/helpers';
import { useMaintenance, useEquipment, useRegisterMaintenance, useEquipmentTypes } from '../hooks/useApi';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Dialog, DialogFooter } from '../components/ui/Dialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Table, Pagination } from '../components/ui/Table';
import { Textarea } from '../components/ui/Input';
import type { Maintenance, Equipment } from '../types';

interface MaintenanceFormData {
  equipmentId: string;
  horometerAtMaintenance: number;
  description: string;
}

export function MaintenancePage() {
  const [search, setSearch] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<MaintenanceFormData>({
    equipmentId: '',
    horometerAtMaintenance: 0,
    description: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);

  const urlParams = new URLSearchParams(window.location.search);
  const initialEquipmentId = urlParams.get('equipo');

  const { data: equipmentData } = useEquipment({ limit: 1000 });
  const equipment = equipmentData?.data || [];

  const { data: equipmentTypesData } = useEquipmentTypes({ limit: 100 });
  const equipmentTypes = equipmentTypesData?.data || [];

  const { data: maintenanceData, isLoading, refetch } = useMaintenance({
    page,
    limit: 20,
    equipmentId: equipmentFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const registerMutation = useRegisterMaintenance();

  const maintenance = maintenanceData?.data || [];
  const pagination = maintenanceData?.pagination;

  // Set initial equipment from URL param
  useEffect(() => {
    if (initialEquipmentId && equipment.find(e => e.id === initialEquipmentId)) {
      setEquipmentFilter(initialEquipmentId);
    }
  }, [initialEquipmentId, equipment]);

  // Update selectedEquipment when formData.equipmentId changes
  useEffect(() => {
    const eq = equipment.find(e => e.id === formData.equipmentId);
    setSelectedEquipment(eq || null);
  }, [formData.equipmentId, equipment]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.equipmentId) errors.equipmentId = 'El equipo es obligatorio';
    if (formData.horometerAtMaintenance < 0) errors.horometerAtMaintenance = 'El horómetro no puede ser negativo';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await registerMutation.mutateAsync({
        equipmentId: formData.equipmentId,
        data: {
          horometerAtMaintenance: formData.horometerAtMaintenance,
          description: formData.description || undefined,
        },
      });
      setIsFormOpen(false);
      resetForm();
      refetch();
    } catch (error) {
      console.error('Maintenance registration failed:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      equipmentId: '',
      horometerAtMaintenance: 0,
      description: '',
    });
    setFormErrors({});
    setSelectedEquipment(null);
  };

  const openForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const filteredMaintenance = maintenance.filter(item => {
    if (search) {
      const equipmentMatch = equipment.find(e => e.id === item.equipmentId);
      if (!equipmentMatch || !equipmentMatch.code.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Mantenimiento</h1>
          <p className="page-subtitle">Registra y controla el mantenimiento de los equipos</p>
        </div>
        <Button onClick={() => openForm()} leftIcon={<Plus className="w-4 h-4" />}>
          Registrar Mantenimiento
        </Button>
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
              value={equipmentFilter}
              onChange={(e) => setEquipmentFilter(e.target.value)}
              options={[
                { value: '', label: 'Todos los Equipos' },
                ...equipment.map(e => ({ value: e.id, label: e.code })),
              ]}
              placeholder="Filtrar por equipo"
            />
            <div className="flex gap-2">
              <Input
                type="date"
                placeholder="Fecha inicio"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
              <Input
                type="date"
                placeholder="Fecha fin"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Maintenance Table */}
      <div className="card">
        {isLoading ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Equipo</th>
                  <th>Tipo</th>
                  <th>Horómetro</th>
                  <th>Descripción</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 border-b border-navy-100">
                      <div className="h-4 bg-navy-100 rounded w-32 animate-pulse" />
                    </td>
                    <td className="px-4 py-3 border-b border-navy-100">
                      <div className="h-4 bg-navy-100 rounded w-24 animate-pulse" />
                    </td>
                    <td className="px-4 py-3 border-b border-navy-100">
                      <div className="h-4 bg-navy-100 rounded w-20 animate-pulse" />
                    </td>
                    <td className="px-4 py-3 border-b border-navy-100">
                      <div className="h-4 bg-navy-100 rounded w-24 animate-pulse" />
                    </td>
                    <td className="px-4 py-3 border-b border-navy-100">
                      <div className="h-4 bg-navy-100 rounded w-32 animate-pulse" />
                    </td>
                    <td className="px-4 py-3 border-b border-navy-100">
                      <div className="h-4 bg-navy-100 rounded w-24 animate-pulse" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredMaintenance.length === 0 ? (
          <EmptyState
            icon={<Wrench className="w-16 h-16 text-navy-200" />}
            title="Sin registros de mantenimiento"
            description="No hay registros de mantenimiento que coincidan con tus filtros actuales. Intenta ajustar tu búsqueda o registra una nueva entrada de mantenimiento."
            action={<Button onClick={() => openForm()} leftIcon={<Plus className="w-4 h-4" />}>Registrar Mantenimiento</Button>}
          />
        ) : (
          <>
            <Table
              columns={[
                { key: 'date', header: 'Fecha', render: (item: Maintenance) => formatDate(item.performedAt) },
                { key: 'equipment', header: 'Equipo', render: (item: Maintenance) => {
                  const eq = equipment.find(e => e.id === item.equipmentId);
                  return eq ? (
                    <span className="font-mono font-medium text-navy-900">{eq.code}</span>
                  ) : 'Desconocido';
                }},
                { key: 'type', header: 'Tipo', render: (item: Maintenance) => {
                  const eq = equipment.find(e => e.id === item.equipmentId);
                  const type = equipmentTypes.find(t => t.id === eq?.equipmentTypeId);
                  return type ? <Badge variant="info">{type.name}</Badge> : 'Desconocido';
                }},
                { key: 'horometer', header: 'Horómetro', render: (item: Maintenance) => (
                  <span className="font-mono text-navy-700">{item.horometerAtMaintenance.toLocaleString()}h</span>
                )},
                { key: 'description', header: 'Descripción', render: (item: Maintenance) => (
                  <span className={cn(item.description ? '' : 'text-navy-400 italic')}>
                    {item.description || 'Sin descripción'}
                  </span>
                )},
                { key: 'actions', header: 'Acciones', render: () => (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" aria-label="Ver detalles">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                )},
              ]}
              data={filteredMaintenance}
              keyExtractor={(item) => item.id}
              emptyMessage="No se encontraron registros de mantenimiento"
            />
            {pagination && pagination.totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
                totalItems={pagination.total}
                itemsPerPage={pagination.limit}
              />
            )}
          </>
        )}
      </div>

      {/* Register Maintenance Dialog */}
      <Dialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Registrar Mantenimiento"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Equipo *"
            name="equipmentId"
            value={formData.equipmentId}
            onChange={(e) => setFormData(prev => ({ ...prev, equipmentId: e.target.value }))}
            error={formErrors.equipmentId}
            options={[
              { value: '', label: 'Seleccionar equipo' },
              ...equipment.map(e => {
                const type = equipmentTypes.find(t => t.id === e.equipmentTypeId);
                return {
                  value: e.id,
                  label: `${e.code} (${type?.name || 'Desconocido'}) - ${e.horometer.toLocaleString()}h`,
                };
              }),
            ]}
            placeholder="Seleccionar equipo"
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              type="number"
              label="Horómetro en Mantenimiento *"
              name="horometerAtMaintenance"
              value={formData.horometerAtMaintenance}
              onChange={(e) => setFormData(prev => ({ ...prev, horometerAtMaintenance: parseInt(e.target.value) || 0 }))}
              error={formErrors.horometerAtMaintenance}
              min={0}
              step={1}
              required
              helperText={selectedEquipment ? `Actual: ${selectedEquipment.horometer.toLocaleString()}h` : undefined}
            />
            <div>
              <label className="label">Último Mantenimiento</label>
              {selectedEquipment ? (
                <div className="px-3 py-2 rounded-lg border border-navy-200 bg-navy-50 text-navy-700">
                  {selectedEquipment.lastMaintenanceHorometer.toLocaleString()}h
                </div>
              ) : (
                <p className="px-3 py-2 text-navy-500 italic">Selecciona un equipo para ver el último mantenimiento</p>
              )}
            </div>
          </div>
          <Textarea
            label="Descripción"
            name="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Opcional: Describe el mantenimiento realizado"
            rows={3}
          />
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)} disabled={registerMutation.isPending}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={registerMutation.isPending}>
              Registrar Mantenimiento
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}

interface MaintenanceFormData {
  equipmentId: string;
  horometerAtMaintenance: number;
  description: string;
}