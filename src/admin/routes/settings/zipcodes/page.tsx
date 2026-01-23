import { defineRouteConfig } from '@medusajs/admin-sdk';
import { Trash, Plus } from '@medusajs/icons';
import { Container, Heading, Button, Input, Table, Text, Select, toast } from '@medusajs/ui';
import { useState, useEffect } from 'react';

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

const ZipcodesManagementPage = () => {
  const [zipcodes, setZipcodes] = useState<RegionZipcode[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [newZipcode, setNewZipcode] = useState('');
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [filterRegionId, setFilterRegionId] = useState<string>('all');

  useEffect(() => {
    fetchRegions();
    fetchZipcodes();
  }, []);

  const fetchRegions = async () => {
    try {
      const response = await fetch('/admin/regions', {
        credentials: 'include',
      });
      if (response.ok) {
        const result = await response.json();
        setRegions(result.regions || []);
        if (result.regions?.length > 0) {
          setSelectedRegionId(result.regions[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching regions:', error);
    }
  };

  const fetchZipcodes = async (regionId?: string) => {
    setIsLoading(true);
    try {
      const url = regionId ? `/admin/region-zipcodes?region_id=${regionId}` : '/admin/region-zipcodes';

      const response = await fetch(url, {
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        setZipcodes(result.region_zipcodes || []);
      }
    } catch (error) {
      console.error('Error fetching zipcodes:', error);
      toast.error('Error', {
        description: 'Failed to load zipcodes',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddZipcode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZipcode.trim() || !selectedRegionId) return;

    setIsAdding(true);
    try {
      const response = await fetch('/admin/region-zipcodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          zipcode: newZipcode.trim(),
          region_id: selectedRegionId,
        }),
      });

      if (response.ok) {
        toast.success('Success', {
          description: 'Zipcode added successfully',
        });
        setNewZipcode('');
        await fetchZipcodes(filterRegionId === 'all' ? undefined : filterRegionId);
      } else {
        const error = await response.json();
        toast.error('Error', {
          description: error.message || 'Failed to add zipcode',
        });
      }
    } catch (error) {
      console.error('Error adding zipcode:', error);
      toast.error('Error', {
        description: 'Failed to add zipcode',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteZipcode = async (id: string) => {
    if (!confirm('Are you sure you want to delete this zipcode?')) return;

    try {
      const response = await fetch(`/admin/region-zipcodes/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast.success('Success', {
          description: 'Zipcode deleted successfully',
        });
        await fetchZipcodes(filterRegionId === 'all' ? undefined : filterRegionId);
      } else {
        toast.error('Error', {
          description: 'Failed to delete zipcode',
        });
      }
    } catch (error) {
      console.error('Error deleting zipcode:', error);
      toast.error('Error', {
        description: 'Failed to delete zipcode',
      });
    }
  };

  const handleFilterChange = (regionId: string) => {
    setFilterRegionId(regionId);
    fetchZipcodes(regionId === 'all' ? undefined : regionId);
  };

  const getRegionName = (regionId: string) => {
    return regions.find((r) => r.id === regionId)?.name || regionId;
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
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Text>Loading zipcodes...</Text>
          </div>
        ) : zipcodes.length === 0 ? (
          <div className="flex justify-center py-8">
            <Text className="text-ui-fg-subtle">No zipcodes found</Text>
          </div>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Zipcode</Table.HeaderCell>
                <Table.HeaderCell>Region</Table.HeaderCell>
                <Table.HeaderCell>Created At</Table.HeaderCell>
                <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {zipcodes.map((zipcode) => (
                <Table.Row key={zipcode.id}>
                  <Table.Cell className="font-medium">{zipcode.zipcode}</Table.Cell>
                  <Table.Cell>{getRegionName(zipcode.region_id)}</Table.Cell>
                  <Table.Cell>{new Date(zipcode.created_at).toLocaleDateString()}</Table.Cell>
                  <Table.Cell className="text-right">
                    <Button
                      variant="transparent"
                      onClick={() => handleDeleteZipcode(zipcode.id)}
                      className="text-ui-fg-error"
                    >
                      <Trash />
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </div>
    </Container>
  );
};

export const config = defineRouteConfig({
  label: 'Zipcodes',
});

export default ZipcodesManagementPage;
