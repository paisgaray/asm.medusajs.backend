import { Button, FocusModal, Heading, Text, toast } from '@medusajs/ui';
import { useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sdk } from '../../lib/sdk';
const DeleteBundledProduct = ({ idBundledProduct }: { idBundledProduct: string }) => {
  const [open, setOpen] = useState(false);

  const queryClient = useQueryClient();

  const { mutateAsync: deleteBundledProduct, isPending: isDeleting } = useMutation({
    mutationFn: async (idBundledProduct: string) => {
      await sdk.client.fetch(`/admin/bundled-products/${idBundledProduct}`, {
        method: 'DELETE',
      });
    },
  });

  const handleDelete = async () => {
    try {
      await deleteBundledProduct(idBundledProduct);

      queryClient.invalidateQueries({ queryKey: ['bundled-products'] });

      setOpen(false);
      toast.success('Bundled product deleted successfully');
    } catch (error) {
      toast.error('Failed to delete bundled product');
    }
  };
  return (
    <div>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Delete Bundled
      </Button>

      <FocusModal open={open} onOpenChange={setOpen}>
        <FocusModal.Content className=" flex items-center flex-col w-full  p-8 max-w-[50%] left-1/2 transform -translate-x-1/2 max-h-[30%] mt-auto rounded-2xl justify-center   bottom-[40%] small:translate-y-[-50%]  small:mx-auto small:my-auto small:rounded-2xl">
          <FocusModal.Body className="flex flex-col items-center py-8">
            <div className="flex flex-col gap-y-1 items-center justify-center text-center max-w-[80%]">
              <Heading>Delete Bundled Product</Heading>
              <Text className="text-ui-fg-subtle">
                Are you sure you want to delete this bundled product? This action cannot be undone, and all associated
                data will be permanently removed. Please confirm that you want to proceed with this deletion.
              </Text>
            </div>
          </FocusModal.Body>
          <FocusModal.Footer className="flex items-center w-full justify-end gap-x-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} isLoading={isDeleting} disabled={isDeleting}>
              Delete
            </Button>
          </FocusModal.Footer>
        </FocusModal.Content>
      </FocusModal>
    </div>
  );
};

export default DeleteBundledProduct;
