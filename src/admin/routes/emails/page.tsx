import { defineRouteConfig } from "@medusajs/admin-sdk";
import { CubeSolid } from "@medusajs/icons";
import {
  Container,
  createDataTableColumnHelper,
  DataTable,
  DataTablePaginationState,
  Heading,
  useDataTable,
} from "@medusajs/ui";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import CreateBundledProduct from "../../components/create-bundled-product";
import { sdk } from "../../lib/sdk";

type Contact = {
  id: string;
  first_name: string;
  last_name: string;
  message: string;
  subject: string;
  phone: string;
  email: string;
};

const columnHelper = createDataTableColumnHelper<Contact>();

const columns = [
  columnHelper.accessor("first_name", {
    header: "First Name",
  }),
  columnHelper.accessor("last_name", {
    header: "Last Name",
  }),
  columnHelper.accessor("email", {
    header: "E-mail",
  }),
  columnHelper.accessor("id", {
    header: "Contact",
    cell: ({ row }) => {
      return <Link to={`/emails/${row.original.id}`}>View Contact</Link>;
    },
  }),
];

const limit = 15;

const EmailsPage = () => {
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageSize: limit,
    pageIndex: 0,
  });

  const offset = useMemo(() => {
    return pagination.pageIndex * limit;
  }, [pagination]);

  const { data, isLoading } = useQuery<{
    contacts: Contact[];
    count: number;
  }>({
    queryKey: ["emails", offset, limit],
    queryFn: () =>
      sdk.client.fetch("/admin/contact", {
        method: "GET",
        query: {
          limit,
          offset,
        },
      }),
  });

  console.log(data);

  const table = useDataTable({
    columns,
    data: data?.contacts ?? [],
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
        <DataTable.Toolbar className="flex items-start justify-between gap-2 md:flex-row md:items-center">
          <Heading>E-mails</Heading>
          <CreateBundledProduct />
        </DataTable.Toolbar>
        <DataTable.Table />
        <DataTable.Pagination />
      </DataTable>
    </Container>
  );
};

export const config = defineRouteConfig({
  label: "E-mails",
  icon: CubeSolid,
});

export default EmailsPage;

