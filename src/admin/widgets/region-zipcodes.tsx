import { defineWidgetConfig } from '@medusajs/admin-sdk';
import { DetailWidgetProps, AdminRegion } from '@medusajs/framework/types';
import { Trash, Plus } from '@medusajs/icons';
import { Container, Heading, Button, Input, Table, Text, toast } from '@medusajs/ui';
import { useState, useEffect } from 'react';

type RegionZipcode = {
  id: string;
  zipcode: string;
  region_id: string;
  created_at: string;
  updated_at: string;
};

const RegionZipcodesWidget = ({ data }: DetailWidgetProps<AdminRegion>) => {
  const [zipcodes, setZipcodes] = useState<RegionZipcode[]>([]);
  const [newZipcode, setNewZipcode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchZipcodes();
  }, [data.id]);

  const fetchZipcodes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/admin/region-zipcodes?region_id=${data.id}`, {
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
    if (!newZipcode.trim()) return;

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
          region_id: data.id,
        }),
      });

      if (response.ok) {
        toast.success('Success', {
          description: 'Zipcode added successfully',
        });
        setNewZipcode('');
        await fetchZipcodes();
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
        await fetchZipcodes();
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

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Region Zipcodes</Heading>
          <Text className="text-ui-fg-subtle">Manage zipcodes associated with this region</Text>
        </div>
      </div>

      <div className="px-6 py-4">
        <form onSubmit={handleAddZipcode} className="flex gap-2 mb-4">
          <Input
            placeholder="Enter zipcode (e.g., 01000-000)"
            value={newZipcode}
            onChange={(e) => setNewZipcode(e.target.value)}
            disabled={isAdding}
            className="flex-1"
          />
          <Button type="submit" disabled={isAdding || !newZipcode.trim()}>
            <Plus /> Add Zipcode
          </Button>
        </form>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Text>Loading zipcodes...</Text>
          </div>
        ) : zipcodes.length === 0 ? (
          <div className="flex justify-center py-8">
            <Text className="text-ui-fg-subtle">No zipcodes associated with this region yet</Text>
          </div>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Zipcode</Table.HeaderCell>
                <Table.HeaderCell>Created At</Table.HeaderCell>
                <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {zipcodes.map((zipcode) => (
                <Table.Row key={zipcode.id}>
                  <Table.Cell>{zipcode.zipcode}</Table.Cell>
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

export const config = defineWidgetConfig({
  zone: 'region.details.after',
});

export default RegionZipcodesWidget;
