import { HttpTypes } from '@medusajs/framework/types';
import { PlusMini } from '@medusajs/icons';
import { Button, Divider, FocusModal, Heading, Input, Label, toast } from '@medusajs/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { sdk } from '../../lib/sdk';
import { default as ProductSelect } from '../common/autoCompleteBundle';

type BundledProductItemProps = {
  item: { product_id: string | undefined; quantity: number; details?: string };
  index: number;
  setItems: React.Dispatch<
    React.SetStateAction<{ product_id: string | undefined; quantity: number; details?: string }[]>
  >;
  products?: HttpTypes.AdminProduct[] | undefined;
};

const CreateBundledProduct = () => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<{ product_id: string | undefined; quantity: number | null; details?: string }[]>([
    { product_id: undefined, quantity: null },
  ]);
  const queryClient = useQueryClient();
  const [selectedBundleId, setSelectedBundleId] = useState<string | undefined>();
  const { mutateAsync: createBundledProduct, isPending: isCreating } = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      await sdk.client.fetch('/admin/bundled-products', {
        method: 'POST',
        body: data,
      });
    },
  });

  const handleCreate = async () => {
    try {
      await createBundledProduct({
        product_id: selectedBundleId,
        items: items.map((item) => (
          {
            product_id: item.product_id,
            quantity: item.quantity,
            details: item.details,
          })),
      });
      setOpen(false);
      toast.success('Bundled product created successfully');
      queryClient.invalidateQueries({ queryKey: ['bundled-products'] });
      setSelectedBundleId(undefined);
      setItems([{ product_id: undefined, quantity: 1 }]);

      if (!selectedBundleId) {
        toast.error('Select a bundle product');
        return;
      }

      if (items.some(item => !item.product_id)) {
        toast.error('All items must have a product selected');
        return;
      }
    } catch {
      toast.error('Failed to create bundled product');
    }
  };

  function clearState() {
    setSelectedBundleId(undefined);
    setItems([{ product_id: undefined, quantity: null }]);

  }

  return (
    <FocusModal open={open} onOpenChange={setOpen}>
      <FocusModal.Trigger asChild>
        <Button variant="primary">Create</Button>
      </FocusModal.Trigger>
      <FocusModal.Content className="w-full flex items-center flex-col w-full  p-8 max-w-[60%] left-1/2 transform -translate-x-1/2 max-h-[80%] mt-auto rounded-2xl justify-center   bottom-[10%]  small:rounded-2xl">
        <FocusModal.Body className="flex items-center w-full justify-center ">
          <div className="flex flex-col items-center gap-8 w-full">
            <Heading className="text-2xl" level={'h2'}>
              Create Bundled Product
            </Heading>

            <div className="flex   w-full max-w-[720px] flex-col gap-8  ">
              <div className="flex flex-col gap-4 px-4  ">
                <Heading level={'h2'}>Select Bundle Product</Heading>
                <ProductSelect
                  value={selectedBundleId}
                  onChange={setSelectedBundleId}
                  placeholder="Select Bundle Product"
                  type="bundled"
                />

              </div>
              <Divider />
              <div className="flex flex-col gap-2 overflow-y-scroll h-[400px] px-4 ">
                <Heading level={'h2'}>Add Bundle Items</Heading>
                {items.map((item, index) => (
                  <BundledProductItem
                    key={index}
                    item={item}
                    index={index}
                    setItems={setItems}

                  />
                ))}
                <Button
                  className='p-4 h-6 w-1/4'
                  size="large"
                  variant="secondary"
                  onClick={() => setItems([...items, { product_id: undefined, quantity: 1, details: '' }])}
                >
                  Add Item <PlusMini />
                </Button>
              </div>
            </div>
          </div>
        </FocusModal.Body>
        <FocusModal.Footer className="flex items-center w-full justify-end gap-x-2 py-">
          <div className="flex items-center justify-end gap-x-2">
            <Button variant="secondary" onClick={() => { setOpen(false); clearState(); }} >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate} isLoading={isCreating}>
              Create Bundle
            </Button>
          </div>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  );
};

const BundledProductItem = ({
  item,
  index,
  setItems,
}: BundledProductItemProps) => {

  return (
    <div className="my-2 flex flex-col gap-3">
      <div data-testid={`bundled-product-item-${index}`} className="flex flex-col gap-1">
        <Heading level={'h3'} className="mb-1">
          Item {index + 1}
        </Heading>
        <ProductSelect
          value={item.product_id}
          onChange={(value) =>
            setItems((prev) =>
              prev.map((it, i) =>
                i === index ? { ...it, product_id: value } : it
              )
            )
          }
          type="not-bundled"
        />
      </div>
      <div data-testid={`bundled-product-quantity-${index}`} className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <Label>Quantity</Label>
          <Input
            type="number"
            placeholder="Quantity"
            className="w-full mt-1 rounded-md border border-gray-200 p-2"
            value={item.quantity}
            onChange={(e) =>
              setItems((items) =>
                items.map((item, i) => {
                  return i === index ? { ...item, quantity: Math.max(1, Number(e.target.value)) } : item;
                }),
              )
            }
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label>details</Label>
          <Input
            type="text"
            placeholder="details"
            className="w-full mt-1 rounded-md border border-gray-200 p-2"
            value={item.details}
            onChange={(e) =>
              setItems((items) =>
                items.map((item, i) => {
                  return i === index ? { ...item, details: e.target.value } : item;
                }),
              )
            }
          />
        </div>
      </div>
      <Divider />
    </div >
  );
};

export default CreateBundledProduct;
