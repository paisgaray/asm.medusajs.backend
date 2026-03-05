import { defineRouteConfig } from '@medusajs/admin-sdk';
import { CubeSolid } from '@medusajs/icons';
import {
  Container,
  createDataTableColumnHelper,
  DataTable,
  DataTablePaginationState,
  Heading,
  useDataTable,
} from '@medusajs/ui';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import CreateBundledProduct from '../../components/bundleComponents/create-bundled-product';
import DeleteBundledProduct from '../../components/bundleComponents/delete-bundled-product';
import EditBundledProduct from '../../components/bundleComponents/edit-bundled-product';
import { sdk } from '../../lib/sdk';

type BundledProduct = {
  id: string;
  title: string;
  product: {
    id: string;
    title: string;
    thumbnail?: string;
  };
  items: {
    id: string;
    product: {
      id: string;
      title: string;
      thumbnail?: string;
    };
  }[];
  created_at: Date;
  updated_at: Date;
};

const columnHelper = createDataTableColumnHelper<BundledProduct>();

const columns = [
  columnHelper.accessor('title', {
    header: 'Bundle Product ',
    cell: ({ row }) => {
      return (
        <div className="flex flex-row gap-4 items-center min-w-[300px]">
          {row.original?.product?.thumbnail && (
            <div data-testid="image-bundle-product">
              <Link to={`/products/${row.original.product.id}`} className=" h-8 flex-row flex gap-2 items-center">
                <img src={row.original?.product?.thumbnail} alt={row.original?.product?.title} className="   w-8 h-8" />
                <span>{row.original?.product?.title}</span>
              </Link>
            </div>
          )}
        </div>
      );
    },
  }),

  columnHelper.accessor('items', {
    header: 'Items',
    meta: {
      className: '',
    },

    cell: ({ row }) => {
      return (
        <div className="flex flex-col max-h-[100px] min-w-[300px] overflow-y-auto gap-4 py-2 ">
          {row.original.items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 min-w-[160px] w-auto">
              <img src={item.product?.thumbnail} className="w-8 h-8 rounded" alt={item.product?.title} />
              <span className="text-sm cursor-default">{item.product.title}</span>
            </div>
          ))}
        </div>
      );
    },
  }),

  columnHelper.accessor('title', {
    header: 'Actions',
    headerAlign: 'right',
    cell: ({ row }) => {
      return (
        <div className="flex gap-2 flex-row justify-end">
          <EditBundledProduct bundle={row.original} />
          <DeleteBundledProduct idBundledProduct={row.original.id} />
        </div>
      );
    },
  }),
];

const limit = 15;

const BundledProductsPage = () => {
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageSize: limit,
    pageIndex: 0,
  });

  const offset = useMemo(() => {
    return pagination.pageIndex * limit;
  }, [pagination]);

  const { data, isLoading } = useQuery<{
    bundled_products: BundledProduct[];
    count: number;
  }>({
    queryKey: ['bundled-products', offset, limit],
    queryFn: () =>
      sdk.client.fetch('/admin/bundled-products', {
        method: 'GET',
        query: {
          limit,
          offset,
        },
      }),
  });

  const table = useDataTable({
    columns,
    data: data?.bundled_products ?? [],
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
          <Heading>Bundled Products</Heading>
          <CreateBundledProduct />
        </DataTable.Toolbar>
        <DataTable.Table />
        <DataTable.Pagination />
      </DataTable>
    </Container>
  );
};

export const config = defineRouteConfig({
  label: 'Bundled Products',
  icon: CubeSolid,
});

export default BundledProductsPage;
