import { Button, FocusModal, Heading, Label, Select, toast } from "@medusajs/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { sdk } from "../../lib/sdk";

type Subscription = {
  id: string;
  status: string;
};

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "cancelled", label: "Cancelled" },
  { value: "past_due", label: "Past due" },
  { value: "incomplete", label: "Incomplete" },
];

function EditSubscription({ subscription }: { subscription: Subscription }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(subscription.status);
  const queryClient = useQueryClient();

  const { mutateAsync: updateSubscription, isPending } = useMutation({
    mutationFn: async () => {
      await sdk.client.fetch(`/admin/subscriptions/${subscription.id}`, {
        method: "POST",
        body: { status },
      });
    },
  });

  const handleOpen = () => {
    setStatus(subscription.status);
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      await updateSubscription();
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      setOpen(false);
      toast.success("Subscription updated successfully");
    } catch {
      toast.error("Failed to update subscription");
    }
  };

  return (
    <>
      <Button variant="secondary" size="small" onClick={handleOpen}>
        Edit
      </Button>

      <FocusModal open={open} onOpenChange={setOpen}>
        <FocusModal.Content className="flex flex-col w-full max-w-md left-1/2 -translate-x-1/2">
          <FocusModal.Header>
            <Heading>Edit Subscription</Heading>
          </FocusModal.Header>
          <FocusModal.Body className="flex flex-col gap-4 p-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="subscription-status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <Select.Trigger id="subscription-status">
                  <Select.Value placeholder="Select status" />
                </Select.Trigger>
                <Select.Content>
                  {STATUS_OPTIONS.map((option) => (
                    <Select.Item key={option.value} value={option.value}>
                      {option.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
          </FocusModal.Body>
          <FocusModal.Footer className="flex justify-end gap-2 p-4">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} isLoading={isPending} disabled={isPending}>
              Save
            </Button>
          </FocusModal.Footer>
        </FocusModal.Content>
      </FocusModal>
    </>
  );
}

export default EditSubscription;
