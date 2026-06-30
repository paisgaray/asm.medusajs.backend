import { defineRouteConfig } from "@medusajs/admin-sdk";
import { ArrowPath } from "@medusajs/icons";
import {
  Badge,
  Container,
  createDataTableColumnHelper,
  DataTable,
  DataTablePaginationState,
  Heading,
  Select,
  Text,
  useDataTable,
} from "@medusajs/ui";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import DeleteSubscription from "../../components/subscriptionComponents/delete-subscription";
import EditSubscription from "../../components/subscriptionComponents/edit-subscription";
import { sdk } from "../../lib/sdk";

const STRIPE_PROVIDER = "pp_stripe_stripe";
const GLOBAL_PAYMENTS_PROVIDER = "pp_global-payments_global-payments";

type SubscriptionCustomer = {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
};

type Subscription = {
  id: string;
  status: string;
  provider: string;
  provider_id: string;
  subscription_price: number;
  calculated_price?: number;
  currency: string;
  frequency: string;
  next_billing_date?: string | null;
  created_at: string;
  customer?: SubscriptionCustomer;
};

type StatusFilter = "all" | "active" | "paused" | "cancelled" | "past_due" | "incomplete";
type ProviderFilter = "all" | typeof STRIPE_PROVIDER | typeof GLOBAL_PAYMENTS_PROVIDER;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "cancelled", label: "Cancelled" },
  { value: "past_due", label: "Past due" },
  { value: "incomplete", label: "Incomplete" },
];

const PROVIDER_OPTIONS: { value: ProviderFilter; label: string }[] = [
  { value: "all", label: "All providers" },
  { value: STRIPE_PROVIDER, label: "Stripe" },
  { value: GLOBAL_PAYMENTS_PROVIDER, label: "Global Payments" },
];

function formatCustomerName(customer?: SubscriptionCustomer) {
  if (!customer) return "—";
  const name = [customer.first_name, customer.last_name].filter(Boolean).join(" ");
  if (customer.email) return name ? `${name} (${customer.email})` : customer.email;
  return name || "—";
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatProviderLabel(provider: string) {
  if (provider === GLOBAL_PAYMENTS_PROVIDER) return "Global Payments";
  if (provider === STRIPE_PROVIDER) return "Stripe";
  return provider;
}

function getStatusColor(status: string): "green" | "orange" | "red" | "grey" | "blue" {
  switch (status) {
    case "active":
      return "green";
    case "paused":
      return "orange";
    case "cancelled":
      return "red";
    case "past_due":
      return "red";
    case "incomplete":
      return "blue";
    default:
      return "grey";
  }
}

const columnHelper = createDataTableColumnHelper<Subscription>();

const columns = [
  columnHelper.accessor("customer", {
    header: "Customer",
    cell: ({ row }) => <Text size="small">{formatCustomerName(row.original.customer)}</Text>,
  }),
  columnHelper.accessor("provider", {
    header: "Provider",
    cell: ({ row }) => (
      <Badge size="2xsmall" color="grey">
        {formatProviderLabel(row.original.provider)}
      </Badge>
    ),
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: ({ row }) => (
      <Badge size="2xsmall" color={getStatusColor(row.original.status)}>
        {row.original.status.replace("_", " ")}
      </Badge>
    ),
  }),
  columnHelper.accessor("calculated_price", {
    header: "Price",
    cell: ({ row }) => {
      const price = row.original.calculated_price ?? row.original.subscription_price / 100;
      return (
        <Text size="small">
          {price.toFixed(2)} {row.original.currency.toUpperCase()}
        </Text>
      );
    },
  }),
  columnHelper.accessor("frequency", {
    header: "Frequency",
    cell: ({ row }) => <Text size="small">{row.original.frequency}</Text>,
  }),
  columnHelper.accessor("next_billing_date", {
    header: "Next billing",
    cell: ({ row }) => <Text size="small">{formatDate(row.original.next_billing_date)}</Text>,
  }),
  columnHelper.accessor("created_at", {
    header: "Created",
    cell: ({ row }) => <Text size="small">{formatDate(row.original.created_at)}</Text>,
  }),
  columnHelper.accessor("id", {
    header: "Actions",
    cell: ({ row }) => (
      <div className="flex gap-2 justify-end">
        <EditSubscription subscription={row.original} />
        <DeleteSubscription subscriptionId={row.original.id} />
      </div>
    ),
  }),
];

const limit = 15;

const SubscriptionsPage = () => {
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageSize: limit,
    pageIndex: 0,
  });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>("all");

  const offset = useMemo(() => pagination.pageIndex * limit, [pagination]);

  const { data, isLoading } = useQuery<{
    subscriptions: Subscription[];
    count: number;
  }>({
    queryKey: ["subscriptions", offset, limit, statusFilter, providerFilter],
    queryFn: () =>
      sdk.client.fetch("/admin/subscriptions", {
        method: "GET",
        query: {
          limit,
          offset,
          ...(statusFilter !== "all" ? { status: statusFilter } : {}),
          ...(providerFilter !== "all" ? { provider: providerFilter } : {}),
        },
      }),
  });

  const table = useDataTable({
    columns,
    data: data?.subscriptions ?? [],
    isLoading,
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
    rowCount: data?.count ?? 0,
  });

  return (
    <Container className="divide-y p-0">
      <DataTable instance={table}>
        <DataTable.Toolbar className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
          <Heading>Subscriptions</Heading>
          <div className="flex flex-wrap gap-2">
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as StatusFilter);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
            >
              <Select.Trigger className="w-40">
                <Select.Value placeholder="Status" />
              </Select.Trigger>
              <Select.Content>
                {STATUS_OPTIONS.map((option) => (
                  <Select.Item key={option.value} value={option.value}>
                    {option.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
            <Select
              value={providerFilter}
              onValueChange={(value) => {
                setProviderFilter(value as ProviderFilter);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
            >
              <Select.Trigger className="w-44">
                <Select.Value placeholder="Provider" />
              </Select.Trigger>
              <Select.Content>
                {PROVIDER_OPTIONS.map((option) => (
                  <Select.Item key={option.value} value={option.value}>
                    {option.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
        </DataTable.Toolbar>
        <DataTable.Table />
        <DataTable.Pagination />
      </DataTable>
    </Container>
  );
};

export const config = defineRouteConfig({
  label: "Subscriptions",
  icon: ArrowPath,
});

export default SubscriptionsPage;
