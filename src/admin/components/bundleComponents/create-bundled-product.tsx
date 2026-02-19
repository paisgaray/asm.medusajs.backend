import { HttpTypes } from '@medusajs/framework/types';
import { PlusMini } from '@medusajs/icons';
import { Button, Divider, FocusModal, Heading, Input, Label, Select, toast } from '@medusajs/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';

import { sdk } from '../../lib/sdk';

type BundledProductItemProps = {
  item: { product_id: string | undefined; quantity: number; description?: string };
  index: number;
  setItems: React.Dispatch<
    React.SetStateAction<{ product_id: string | undefined; quantity: number; description?: string }[]>
  >;
  products: HttpTypes.AdminProduct[] | undefined;
  fetchMoreProducts: () => void;
  hasNextPage: boolean;
};

const CreateBundledProduct = () => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [items, setItems] = useState<{ product_id: string | undefined; quantity: number; description?: string }[]>([
    { product_id: undefined, quantity: 1 },
  ]);
  const [products, setProducts] = useState<HttpTypes.AdminProduct[]>([]);
  const productsLimit = 15;
  const [currentProductPage, setCurrentProductPage] = useState(0);
  const [productsCount, setProductsCount] = useState(0);
  const hasNextPage = useMemo(() => {
    return productsCount ? productsCount > productsLimit : true;
  }, [productsCount, productsLimit]);
  const queryClient = useQueryClient();

  useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { products, count } = await sdk.admin.product.list({
        limit: productsLimit,
        offset: currentProductPage * productsLimit,
      });
      setProductsCount(count);
      setProducts((prev) => [...prev, ...products]);
      return products;
    },
    enabled: hasNextPage,
  });

  const fetchMoreProducts = () => {
    if (!hasNextPage) {
      return;
    }
    setCurrentProductPage(currentProductPage + 1);
  };

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
        title,
        product: {
          title,
          options: [
            {
              title: 'Default',
              values: ['default'],
            },
          ],
          status: 'published',
          variants: [
            {
              title,
              // You can set prices in the product's page
              prices: [],
              options: {
                Default: 'default',
              },
              manage_inventory: false,
            },
          ],
        },
        items: items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          description: item.description,
        })),
      });
      setOpen(false);
      toast.success('Bundled product created successfully');
      queryClient.invalidateQueries({ queryKey: ['bundled-products'] });
      setTitle('');
      setItems([{ product_id: undefined, quantity: 1 }]);
    } catch {
      toast.error('Failed to create bundled product');
    }
  };
  console.log('🚀 ~ CreateBundledProduct ~ products:', products);

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
                <Input
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                  }}
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
                    products={products}
                    fetchMoreProducts={fetchMoreProducts}
                    hasNextPage={hasNextPage}
                  />
                ))}
                <Button
                  className="p-4"
                  size="xlarge"
                  variant="secondary"
                  onClick={() => setItems([...items, { product_id: undefined, quantity: 1, description: '' }])}
                >
                  Add Item <PlusMini />
                </Button>
              </div>
            </div>
          </div>
        </FocusModal.Body>
        <FocusModal.Footer className="flex items-center w-full justify-end gap-x-2">
          <div className="flex items-center justify-end gap-x-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
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
  products,
  fetchMoreProducts,
  hasNextPage,
}: BundledProductItemProps) => {
  const observer = useRef(
    new IntersectionObserver(
      (entries) => {
        if (!hasNextPage) return;
        const first = entries[0];
        if (first.isIntersecting) fetchMoreProducts();
      },
      { threshold: 1 },
    ),
  );

  const lastOptionRef = useCallback(
    (node: HTMLDivElement) => {
      if (!hasNextPage) return;
      if (observer.current) observer.current.disconnect();
      if (node) observer.current.observe(node);
    },
    [hasNextPage],
  );

  return (
    <div className="my-2 flex flex-col gap-3">
      <div data-testid={`bundled-product-item-${index}`} className="flex flex-col gap-1">
        <Heading level={'h3'} className="mb-1">
          Item {index + 1}
        </Heading>
        <Select
          value={item.product_id}
          onValueChange={(value) =>
            setItems((items) =>
              items.map((item, i) => {
                return i === index
                  ? {
                    ...item,
                    product_id: value,
                  }
                  : item;
              }),
            )
          }
        >
          <Select.Trigger>
            <Select.Value placeholder="Select Product" />
          </Select.Trigger>
          <Select.Content>
            {products?.map((product, productIndex) => (
              <Select.Item
                key={product.id}
                value={product.id}
                ref={productIndex === products.length - 1 ? lastOptionRef : null}
              >
                {product.title}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
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
                  return i === index ? { ...item, quantity: parseInt(e.target.value) } : item;
                }),
              )
            }
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Description</Label>
          <Input
            type="text"
            placeholder="Description"
            className="w-full mt-1 rounded-md border border-gray-200 p-2"
            value={item.description}
            onChange={(e) =>
              setItems((items) =>
                items.map((item, i) => {
                  return i === index ? { ...item, description: e.target.value } : item;
                }),
              )
            }
          />
        </div>
      </div>
      <Divider />
    </div>
  );
};

export default CreateBundledProduct;
