import { defineRouteConfig } from '@medusajs/admin-sdk';
import { Plus, Trash } from '@medusajs/icons';
import {
  Button,
  Container,
  createDataTableColumnHelper,
  DataTable,
  DataTablePaginationState,
  Heading,
  Input,
  Select,
  Text,
  toast,
  useDataTable,
} from '@medusajs/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { sdk } from '../../../lib/sdk';

type RegionZipcode = {
  id: string;
  zipcode: string;
  region_id: string;
  created_at: string;
  updated_at: string;
};

type Region = {
  id: string;
  name: string;
  currency_code: string;
};

const limit = 15;

const columnHelper = createDataTableColumnHelper<RegionZipcode>();

const ZipcodesManagementPage = () => {
  const queryClient = useQueryClient();

  const [newZipcode, setNewZipcode] = useState('');
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [filterRegionId, setFilterRegionId] = useState<string>('all');
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageSize: limit,
    pageIndex: 0,
  });

  const offset = useMemo(() => pagination.pageIndex * limit, [pagination]);

  const { data: regionsData } = useQuery<{ regions: Region[] }>({
    queryKey: ['regions'],
    queryFn: () => sdk.client.fetch('/admin/regions', { method: 'GET' }),
  });
  const regions = regionsData?.regions ?? [];

  const { data: zipcodesData, isLoading } = useQuery<{
    region_zipcodes: RegionZipcode[];
    count: number;
  }>({
    queryKey: ['region-zipcodes', offset, limit, filterRegionId],
    queryFn: () =>
      sdk.client.fetch('/admin/region-zipcodes', {
        method: 'GET',
        query: {
          limit,
          offset,
          ...(filterRegionId !== 'all' && { region_id: filterRegionId }),
        },
      }),
  });

  const getRegionName = (regionId: string) => {
    return regions.find((r) => r.id === regionId)?.name || regionId;
  };

  const handleDeleteZipcode = async (id: string) => {
    if (!confirm('Are you sure you want to delete this zipcode?')) return;

    try {
      await sdk.client.fetch(`/admin/region-zipcodes/${id}`, { method: 'DELETE' });
      toast.success('Success', { description: 'Zipcode deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['region-zipcodes'] });
    } catch {
      toast.error('Error', { description: 'Failed to delete zipcode' });
    }
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor('zipcode', {
        header: 'Zipcode',
        cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
      }),
      columnHelper.accessor('region_id', {
        header: 'Region',
        cell: ({ getValue }) => getRegionName(getValue()),
      }),
      columnHelper.accessor('created_at', {
        header: 'Created At',
        cell: ({ getValue }) => new Date(getValue()).toLocaleDateString(),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              variant="transparent"
              onClick={() => handleDeleteZipcode(row.original.id)}
              className="text-ui-fg-error"
            >
              <Trash />
            </Button>
          </div>
        ),
      }),
    ],
    [regions],
  );

  const table = useDataTable({
    columns,
    data: zipcodesData?.region_zipcodes ?? [],
    isLoading,
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
    rowCount: zipcodesData?.count ?? 0,
  });

  const handleAddZipcode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZipcode.trim() || !selectedRegionId) return;

    setIsAdding(true);
    try {
      await sdk.client.fetch('/admin/region-zipcodes', {
        method: 'POST',
        body: { zipcode: newZipcode.trim(), region_id: selectedRegionId },
      });
      toast.success('Success', { description: 'Zipcode added successfully' });
      setNewZipcode('');
      queryClient.invalidateQueries({ queryKey: ['region-zipcodes'] });
    } catch (error: any) {
      toast.error('Error', { description: error?.message || 'Failed to add zipcode' });
    } finally {
      setIsAdding(false);
    }
  };

  const handleFilterChange = (regionId: string) => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
    setFilterRegionId(regionId);
  };

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h1">Zipcode Management</Heading>
        <Text className="text-ui-fg-subtle mt-2">Manage zipcodes for all regions</Text>
      </div>

      <div className="px-6 py-4 space-y-4">
        {/* Add Zipcode Form */}
        <div className="bg-ui-bg-subtle p-4 rounded-lg">
          <Heading level="h2" className="mb-3">
            Add New Zipcode
          </Heading>
          <form onSubmit={handleAddZipcode} className="flex gap-2">
            <Input
              placeholder="Enter zipcode (e.g., 01000-000)"
              value={newZipcode}
              onChange={(e) => setNewZipcode(e.target.value)}
              disabled={isAdding}
              className="flex-1"
            />
            <Select value={selectedRegionId} onValueChange={setSelectedRegionId} disabled={isAdding}>
              <Select.Trigger className="w-48">
                <Select.Value placeholder="Select region" />
              </Select.Trigger>
              <Select.Content>
                {regions.map((region) => (
                  <Select.Item key={region.id} value={region.id}>
                    {region.name} ({region.currency_code.toUpperCase()})
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
            <Button type="submit" disabled={isAdding || !newZipcode.trim() || !selectedRegionId}>
              <Plus /> Add
            </Button>
          </form>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Text size="small" weight="plus">
            Filter by region:
          </Text>
          <Select value={filterRegionId} onValueChange={handleFilterChange}>
            <Select.Trigger className="w-48">
              <Select.Value placeholder="All regions" />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="all">All regions</Select.Item>
              {regions.map((region) => (
                <Select.Item key={region.id} value={region.id}>
                  {region.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>

        {/* Zipcodes Table */}
        <DataTable instance={table}>
          <DataTable.Table />
          <DataTable.Pagination />
        </DataTable>
      </div>
    </Container>
  );
};

export const config = defineRouteConfig({
  label: 'Zipcodes',
});

export default ZipcodesManagementPage;
