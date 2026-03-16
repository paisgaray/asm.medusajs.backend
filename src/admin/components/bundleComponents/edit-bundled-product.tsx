import { Pencil, PlusMini } from '@medusajs/icons';
import {
  Button,
  Divider,
  FocusModal,
  Heading,
  Input,
  Label,
  toast
} from '@medusajs/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { sdk } from '../../lib/sdk';
import { default as ProductSelect } from '../common/autoCompleteBundle';

type BundleItemState = {
  id?: string;
  product_id?: string;
  details?: string;
  isNew?: boolean;
};

const EditBundledProduct = ({ bundle }: { bundle: any }) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedBundleId, setSelectedBundleId] = useState<string | undefined>(
    bundle?.product?.id
  );
  const [items, setItems] = useState<BundleItemState[]>(
    bundle?.items?.map((item: any) => ({
      id: item.id,
      product_id: item.product.id,
      details: item.details,
      isNew: false,
    })) ?? []
  );

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
        toast.success('Bundle updated successfully',);
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
        details: '',
        isNew: true,
      },
    ]);
  };

  function clearState() {
    setSelectedBundleId(undefined);
    setItems([{ product_id: undefined }]);

  }

  return (
    <FocusModal open={open} onOpenChange={setOpen}>
      <FocusModal.Trigger asChild>
        <Button variant="primary">Edit Bundle</Button>
      </FocusModal.Trigger>

      <FocusModal.Content className="w-full flex flex-col p-8 max-w-[60%] left-1/2 transform -translate-x-1/2 max-h-[80%] mt-auto rounded-2xl bottom-[10%]">
        <FocusModal.Body className="flex flex-col items-center gap-8 w-full">

          <Heading level="h2">Edit Bundled Product</Heading>

          <div className="flex flex-col gap-4 w-full max-w-[720px] px-4">
            <Heading level="h3">Select Bundle Product</Heading>

            <ProductSelect
              value={selectedBundleId}
              onChange={setSelectedBundleId}
              type="bundled"
              selectProduct={bundle.product}
            />
            <Button
              className='p-4 h-6 w-1/4'

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

                <ProductSelect
                  disabled={!item.isNew}
                  value={item.product_id}
                  onChange={(value) =>
                    setItems((prev) =>
                      prev.map((it, i) =>
                        i === index ? { ...it, product_id: value } : it
                      )
                    )
                  }
                  type="not-bundled"
                  selectProduct={item.isNew ? undefined : bundle.items[index].product}
                />

                <div className="grid grid-cols-2 gap-2">
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
                      className='p-4 h-6 w-1/4'

                      variant="secondary"
                      isLoading={isCreatingItem}
                      disabled={isCreatingItem}
                      onClick={() => createItemMutation(item)}
                    >
                      Save New Item
                    </Button>
                  ) : (
                    <Button
                      className='p-4 h-6 w-1/4'

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
                      className='p-4 h-6 w-1/4'
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
          <Button variant="secondary" onClick={() => { setOpen(false); clearState(); }}>
            Close
          </Button>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  );
};

export default EditBundledProduct;