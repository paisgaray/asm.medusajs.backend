import { Pencil, PlusMini } from '@medusajs/icons';
import {
  Button,
  Divider,
  FocusModal,
  Heading,
  Input,
  Label,
  Select,
  toast,
} from '@medusajs/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { sdk } from '../../lib/sdk';

type BundleItemState = {
  id?: string; // id real do bundle_item
  product_id?: string;
  quantity: number;
  details?: string;
  isNew?: boolean;
};

const EditBundledProduct = ({ bundle }: { bundle: any }) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // Produto principal do bundle
  const [selectedBundleId, setSelectedBundleId] = useState<string>(
    bundle?.product?.id
  );

  // Itens do bundle (mantendo valores da row)
  const [items, setItems] = useState<BundleItemState[]>(
    bundle?.items?.map((item: any) => ({
      id: item.id,
      product_id: item.product.id,
      quantity: item.quantity,
      details: item.details,
      isNew: false,
    })) ?? []
  );


  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { products } = await sdk.admin.product.list({ limit: 2000 });
      return products;
    },
  });

  const productsBundle = useMemo(() => {
    return products.filter((product) =>
      product.tags?.some((tag) => tag.value === 'bundled')
    );
  }, [products]);

  const productsNotBundle = useMemo(() => {
    return products.filter(
      (product) =>
        !product.tags?.some((tag) => tag.value === 'bundled')
    );
  }, [products]);



  const { mutateAsync: updateBundleProduct, isPending: isUpdatingBundle } =
    useMutation({
      mutationFn: async () => {
        await sdk.client.fetch(`/admin/bundled-products/${bundle.id}`, {
          method: 'PUT',
          body: {
            product_id: selectedBundleId,
          },
        });
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['bundled-products'] });
        toast.success('Bundle updated successfully');
      },
      onError: () => {
        toast.error('Failed to update bundle');
      },
    });



  const { mutateAsync: updateItemMutation, isPending: isUpdatingItem } =
    useMutation({
      mutationFn: async (item: BundleItemState) => {
        await sdk.client.fetch(
          `/admin/bundled-products/${bundle.id}/bundle-item/${item.id}`,
          {
            method: 'PUT',
            body: {
              quantity: item.quantity,
              details: item.details,
            },
          }
        );
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['bundled-products'] });
        toast.success('Item updated');
      },
      onError: () => {
        toast.error('Failed to update item');
      },
    });



  const { mutateAsync: deleteItemMutation, isPending: isDeletingItem } = useMutation({
    mutationFn: async (itemId: string) => {
      await sdk.client.fetch(
        `/admin/bundled-products/${bundle.id}/bundle-item/${itemId}`,
        { method: 'DELETE' }
      );
    },
    onSuccess: (_, deletedId) => {
      setItems((prev) => prev.filter((item) => item.id !== deletedId));
      queryClient.invalidateQueries({ queryKey: ['bundled-products'] });
      toast.success('Item deleted');
    },
    onError: () => {
      toast.error('Failed to delete item');
    },
  });



  const { mutateAsync: createItemMutation, isPending: isCreatingItem } =
    useMutation({
      mutationFn: async (item: BundleItemState) => {
        await sdk.client.fetch(
          `/admin/bundled-products/${bundle.id}`,
          {
            method: 'POST',
            body: {
              product_id: item.product_id,
              quantity: item.quantity,
              details: item.details,
            },
          }
        );
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['bundled-products'] });
        toast.success('Item created');
      },
      onError: () => {
        toast.error('Failed to create item');
      },
    });



  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        product_id: undefined,
        quantity: 1,
        details: '',
        isNew: true,
      },
    ]);
  };

  return (
    <FocusModal open={open} onOpenChange={setOpen}>
      <FocusModal.Trigger asChild>
        <Button variant="primary">Edit Bundle</Button>
      </FocusModal.Trigger>

      <FocusModal.Content className="w-full flex flex-col p-8 max-w-[60%] left-1/2 transform -translate-x-1/2 max-h-[80%] mt-auto rounded-2xl bottom-[10%]">
        <FocusModal.Body className="flex flex-col items-center gap-8 w-full">

          <Heading level="h2">Edit Bundled Product</Heading>

          {/* SELECT BUNDLE */}
          <div className="flex flex-col gap-4 w-full max-w-[720px] px-4">
            <Heading level="h3">Select Bundle Product</Heading>

            <Select
              value={selectedBundleId}
              onValueChange={(value) => setSelectedBundleId(value)}
            >
              <Select.Trigger>
                <Select.Value placeholder="Select Product" />
              </Select.Trigger>
              <Select.Content>
                {productsBundle.map((product) => (
                  <Select.Item key={product.id} value={product.id}>
                    <div className='flex items-center gap-4'>
                      {product.thumbnail && (
                        <img
                          src={product?.thumbnail}
                          alt={product?.title}
                          className="w-6 h-6 object-cover rounded-sm mr-2"
                        />
                      )}
                      {product?.title}
                    </div>
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>

            <Button
              variant="secondary"
              isLoading={isUpdatingBundle}
              onClick={() => updateBundleProduct()}
            >
              Change Bundle Product <Pencil />
            </Button>
          </div>

          <Divider />

          {/* ITEMS */}
          <div className="flex flex-col gap-4 overflow-y-scroll h-[400px] px-4 w-full max-w-[720px]">

            <Heading level="h3">Add or Edit Bundle Items</Heading>

            {items.map((item, index) => (
              <div key={item.id ?? index} className="flex flex-col gap-3">

                <Heading level="h3">Item {index + 1}</Heading>

                <Select
                  value={item.product_id}
                  onValueChange={(value) =>
                    setItems((prev) =>
                      prev.map((it, i) =>
                        i === index ? { ...it, product_id: value } : it
                      )
                    )
                  }
                >
                  <Select.Trigger>
                    <Select.Value placeholder="Select Product" />
                  </Select.Trigger>
                  <Select.Content>
                    {productsNotBundle.map((product) => (
                      <Select.Item key={product.id} value={product.id}>
                        <div className='flex items-center gap-4'>
                          {product.thumbnail && (
                            <img
                              src={product?.thumbnail}
                              alt={product?.title}
                              className="w-6 h-6 object-cover rounded-sm mr-2"
                            />
                          )}
                          {product?.title}
                        </div>
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((it, i) =>
                            i === index
                              ? { ...it, quantity: Math.max(1, Number(e.target.value)) }
                              : it
                          )
                        )
                      }
                    />
                  </div>

                  <div>
                    <Label>Details</Label>
                    <Input
                      type="text"
                      value={item.details}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((it, i) =>
                            i === index
                              ? { ...it, details: e.target.value }
                              : it
                          )
                        )
                      }
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  {item.isNew ? (
                    <Button
                      variant="secondary"
                      isLoading={isCreatingItem}
                      disabled={isCreatingItem}
                      onClick={() => createItemMutation(item)}
                    >
                      Save New Item
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      isLoading={isUpdatingItem}
                      disabled={isUpdatingItem}
                      onClick={() => updateItemMutation(item)}
                    >
                      Update Item
                    </Button>
                  )}

                  {!item.isNew && (
                    <Button
                      variant="danger"
                      isLoading={isDeletingItem}
                      disabled={isDeletingItem}
                      onClick={() => item.id && deleteItemMutation(item.id)}
                    >
                      Delete Item
                    </Button>
                  )}
                </div>

                <Divider />
              </div>
            ))}
            <div className='h-[40px] mb-4' >
              <Button variant="secondary" onClick={handleAddItem} size='large'>
                Add Item <PlusMini />
              </Button>
            </div>
          </div>
        </FocusModal.Body>

        <FocusModal.Footer>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Close
          </Button>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  );
};

export default EditBundledProduct;