import { Button, FocusModal, Heading, Text, toast } from "@medusajs/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { sdk } from "../../lib/sdk";

function DeleteSubscription({ subscriptionId }: { subscriptionId: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { mutateAsync: deleteSubscription, isPending } = useMutation({
    mutationFn: async () => {
      await sdk.client.fetch(`/admin/subscriptions/${subscriptionId}`, {
        method: "DELETE",
      });
    },
  });

  const handleDelete = async () => {
    try {
      await deleteSubscription();
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      setOpen(false);
      toast.success("Subscription deleted successfully");
    } catch {
      toast.error("Failed to delete subscription");
    }
  };

  return (
    <>
      <Button variant="danger" size="small" onClick={() => setOpen(true)}>
        Delete
      </Button>

      <FocusModal open={open} onOpenChange={setOpen}>
        <FocusModal.Content className="flex flex-col w-full max-w-lg left-1/2 -translate-x-1/2">
          <FocusModal.Body className="flex flex-col items-center gap-4 p-8 text-center">
            <Heading>Delete Subscription</Heading>
            <Text className="text-ui-fg-subtle">
              This will cancel the subscription on the payment provider when applicable and
              remove it from the store. This action cannot be undone.
            </Text>
          </FocusModal.Body>
          <FocusModal.Footer className="flex justify-end gap-2 p-4">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} isLoading={isPending} disabled={isPending}>
              Delete
            </Button>
          </FocusModal.Footer>
        </FocusModal.Content>
      </FocusModal>
    </>
  );
}

export default DeleteSubscription;
