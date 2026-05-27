import { defineRouteConfig } from '@medusajs/admin-sdk';
import { Button, Container, Heading, Input, Table, Text, toast } from '@medusajs/ui';
import { useState } from 'react';

// ---------- Types ----------

type ProductSummary = {
  id: string;
  title: string | null;
  handle: string | null;
  thumbnail: string | null;
};

type RecommendationGroup = {
  group_index: number;
  products: ProductSummary[];
};

type RecommenderResponse = {
  type: 'bundle' | 'product';
  endpoint: string;
  recommendations: RecommendationGroup[];
  unresolved_ids: string[];
};

type BundleParams = {
  id_cliente: string;
  codigo_postal: string;
  mes: string;
  dia: string;
  hora: string;
  dia_semana: string;
  top_k_baskets: string;
  page_size: string;
};

type ProductParams = {
  id_cliente: string;
  codigo_postal: string;
  mes: string;
  dia: string;
  hora: string;
  dia_semana: string;
  top_k_categories: string;
  first_k_categories: string;
  qty_products_first_k_categories: string;
  qty_products_rest_categories: string;
  page_size: string;
};

// ---------- Defaults ----------

// Returns date-based defaults. dia_semana follows the storefront convention: 0=Mon … 6=Sun
function getDateDefaults() {
  const now = new Date();
  return {
    mes: String(now.getMonth() + 1),
    dia: String(now.getDate()),
    hora: String(now.getHours()),
    dia_semana: String((now.getDay() + 6) % 7),
  };
}

const DEFAULT_BUNDLE: BundleParams = {
  id_cliente: '',
  codigo_postal: '12345',
  ...getDateDefaults(),
  top_k_baskets: '10',
  page_size: '5',
};

const DEFAULT_PRODUCT: ProductParams = {
  id_cliente: '',
  codigo_postal: '12345',
  ...getDateDefaults(),
  top_k_categories: '15',
  first_k_categories: '5',
  qty_products_first_k_categories: '2',
  qty_products_rest_categories: '1',
  page_size: '5',
};

// ---------- Field descriptors ----------

type FieldDef = { key: string; label: string; hint?: string };

const BUNDLE_FIELDS: FieldDef[] = [
  { key: 'id_cliente', label: 'Customer ID', hint: 'id_cliente' },
  { key: 'codigo_postal', label: 'Postal Code', hint: 'codigo_postal' },
  { key: 'mes', label: 'Month', hint: '1–12' },
  { key: 'dia', label: 'Day', hint: '1–31' },
  { key: 'hora', label: 'Hour', hint: '0–23' },
  { key: 'dia_semana', label: 'Weekday', hint: '1=Sun … 7=Sat' },
  { key: 'top_k_baskets', label: 'Top K Baskets', hint: 'top_k_baskets' },
  { key: 'page_size', label: 'Page Size', hint: 'page_size' },
];

const PRODUCT_FIELDS: FieldDef[] = [
  { key: 'id_cliente', label: 'Customer ID', hint: 'id_cliente' },
  { key: 'codigo_postal', label: 'Postal Code', hint: 'codigo_postal' },
  { key: 'mes', label: 'Month', hint: '1–12' },
  { key: 'dia', label: 'Day', hint: '1–31' },
  { key: 'hora', label: 'Hour', hint: '0–23' },
  { key: 'dia_semana', label: 'Weekday', hint: '1=Sun … 7=Sat' },
  { key: 'top_k_categories', label: 'Top K Categories', hint: 'top_k_categories' },
  { key: 'first_k_categories', label: 'First K Categories', hint: 'first_k_categories' },
  {
    key: 'qty_products_first_k_categories',
    label: 'Qty (First K Categories)',
    hint: 'qty_products_first_k_categories',
  },
  {
    key: 'qty_products_rest_categories',
    label: 'Qty (Rest Categories)',
    hint: 'qty_products_rest_categories',
  },
  { key: 'page_size', label: 'Page Size', hint: 'page_size' },
];

// ---------- Page ----------

const RecommenderPage = () => {
  const [activeTab, setActiveTab] = useState<'bundle' | 'product'>('bundle');
  const [bundleParams, setBundleParams] = useState<BundleParams>(DEFAULT_BUNDLE);
  const [productParams, setProductParams] = useState<ProductParams>(DEFAULT_PRODUCT);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<RecommenderResponse | null>(null);

  const handleBundleChange = (key: keyof BundleParams, value: string) => {
    setBundleParams((prev) => ({ ...prev, [key]: value }));
  };

  const handleProductChange = (key: keyof ProductParams, value: string) => {
    setProductParams((prev) => ({ ...prev, [key]: value }));
  };

  const handleRun = async () => {
    setIsLoading(true);
    setResults(null);
    try {
      const body =
        activeTab === 'bundle'
          ? { type: 'bundle' as const, ...bundleParams }
          : { type: 'product' as const, ...productParams };

      const response = await fetch('/admin/recommender', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error('Recommender error', {
          description: data.message || 'Failed to call the recommendation endpoint',
        });
        return;
      }

      setResults(data as RecommenderResponse);

      const total = (data as RecommenderResponse).recommendations.reduce(
        (acc: number, g: RecommendationGroup) => acc + g.products.length,
        0,
      );
      toast.success('Recommendations loaded', {
        description: `${(data as RecommenderResponse).recommendations.length} groups, ${total} products`,
      });
    } catch {
      toast.error('Recommender error', {
        description: 'An unexpected error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const activeFields = activeTab === 'bundle' ? BUNDLE_FIELDS : PRODUCT_FIELDS;
  const activeParams: Record<string, string> =
    activeTab === 'bundle'
      ? (bundleParams as unknown as Record<string, string>)
      : (productParams as unknown as Record<string, string>);

  return (
    <Container className="divide-y p-0">
      {/* Header */}
      <div className="px-6 py-4">
        <Heading level="h1">Product Recommender</Heading>
        <Text className="text-ui-fg-subtle mt-1">
          Test the SageMaker recommendation endpoints ( <span className="font-mono text-xs">registered-basket</span> /{' '}
          <span className="font-mono text-xs">registered-products</span>)
        </Text>
      </div>

      {/* Tabs */}
      <div className="px-6 py-4">
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'bundle' ? 'primary' : 'secondary'}
            size="small"
            onClick={() => {
              setActiveTab('bundle');
              setResults(null);
            }}
          >
            Bundle (registered-basket)
          </Button>
          <Button
            variant={activeTab === 'product' ? 'primary' : 'secondary'}
            size="small"
            onClick={() => {
              setActiveTab('product');
              setResults(null);
            }}
          >
            Product (registered-products)
          </Button>
        </div>
      </div>

      {/* Parameters form */}
      <div className="px-6 py-4 space-y-4">
        <Heading level="h2">Parameters</Heading>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {activeFields.map(({ key, label, hint }) => (
            <div key={key} className="flex flex-col gap-1">
              <Text size="small" weight="plus">
                {label}
                {hint && <span className="ml-1 text-ui-fg-muted font-normal font-mono text-xs">({hint})</span>}
              </Text>
              <Input
                value={activeParams[key] ?? ''}
                onChange={(e) => {
                  if (activeTab === 'bundle') {
                    handleBundleChange(key as keyof BundleParams, e.target.value);
                  } else {
                    handleProductChange(key as keyof ProductParams, e.target.value);
                  }
                }}
                disabled={isLoading}
              />
            </div>
          ))}
        </div>

        <div className="pt-2">
          <Button onClick={handleRun} disabled={isLoading}>
            {isLoading ? 'Calling SageMaker...' : 'Run Recommendations'}
          </Button>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="px-6 py-4 space-y-6">
          <div className="flex items-center justify-between">
            <Heading level="h2">
              Results — {results.recommendations.length} group
              {results.recommendations.length !== 1 ? 's' : ''}
            </Heading>
            <Text size="small" className="text-ui-fg-muted font-mono">
              endpoint: {results.endpoint}
            </Text>
          </div>

          {results.unresolved_ids.length > 0 && (
            <div className="rounded-md bg-ui-tag-orange-bg border border-ui-tag-orange-border px-4 py-3">
              <Text size="small" className="text-ui-tag-orange-text">
                <span className="font-medium">
                  {results.unresolved_ids.length} unresolved ID
                  {results.unresolved_ids.length !== 1 ? 's' : ''}:
                </span>{' '}
                {results.unresolved_ids.join(', ')}
              </Text>
            </div>
          )}

          {results.recommendations.length === 0 ? (
            <Text className="text-ui-fg-subtle text-center py-6">
              No recommendations returned for these parameters.
            </Text>
          ) : (
            results.recommendations.map((group) => (
              <div key={group.group_index} className="space-y-2">
                <Text size="small" weight="plus" className="text-ui-fg-subtle">
                  Group {group.group_index + 1} — {group.products.length} product
                  {group.products.length !== 1 ? 's' : ''}
                </Text>
                <Table>
                  <Table.Header>
                    <Table.Row>
                      <Table.HeaderCell>Product</Table.HeaderCell>
                      <Table.HeaderCell>Handle</Table.HeaderCell>
                      <Table.HeaderCell>ID</Table.HeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {group.products.map((product) => (
                      <Table.Row key={product.id}>
                        <Table.Cell>
                          <div className="flex items-center gap-3">
                            {product.thumbnail ? (
                              <img
                                src={product.thumbnail}
                                alt={product.title ?? product.id}
                                className="h-8 w-8 rounded object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded bg-ui-bg-subtle flex items-center justify-center flex-shrink-0">
                                <Text size="xsmall" className="text-ui-fg-muted">
                                  —
                                </Text>
                              </div>
                            )}
                            <Text size="small">
                              {product.title ?? <span className="text-ui-fg-muted italic">Not found in Medusa</span>}
                            </Text>
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <Text size="small" className="text-ui-fg-subtle font-mono">
                            {product.handle ?? '—'}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text size="xsmall" className="text-ui-fg-muted font-mono">
                            {product.id}
                          </Text>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </div>
            ))
          )}
        </div>
      )}
    </Container>
  );
};

export const config = defineRouteConfig({ label: 'Recommender' });
export default RecommenderPage;
