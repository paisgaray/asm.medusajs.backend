import { defineRouteConfig } from '@medusajs/admin-sdk';
import { Button, Container, Heading, Input, Select, Table, Text, toast } from '@medusajs/ui';
import { useEffect, useState } from 'react';

const LANGUAGES = [
  { value: 'pt', label: 'Portuguese (pt)' },
  { value: 'es', label: 'Spanish (es)' },
  { value: 'ca', label: 'Catalan (ca)' },
];

const SEARCH_LIMIT = 20;

type AlgoliaHit = {
  objectID: string;
  title: string;
  handle: string;
  thumbnail?: string;
};

type SearchResult = {
  hits: AlgoliaHit[];
  nbHits: number;
  page: number;
  nbPages: number;
};

type SyncResult = {
  totalIndexed: number;
  duration: number;
  message: string;
};

const AlgoliaManagementPage = () => {
  const [language, setLanguage] = useState('pt');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    runSearch(searchQuery.trim(), currentPage);
  }, [language, currentPage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      runSearch(searchQuery.trim(), currentPage);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const runSearch = async (q: string, page: number) => {
    setIsSearching(true);
    try {
      const params = new URLSearchParams({
        q,
        language,
        page: String(page),
        limit: String(SEARCH_LIMIT),
      });
      const response = await fetch(`/admin/algolia/search?${params}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok) {
        setSearchResults(data);
      } else {
        toast.error('Search failed', { description: data.message || 'Failed to search products' });
      }
    } catch {
      toast.error('Search failed', { description: 'An error occurred while searching' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const response = await fetch(`/admin/algolia/sync/${language}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ skipClear: false }),
      });
      const data = await response.json();
      if (response.ok) {
        setSyncResult(data);
        toast.success('Sync complete', {
          description: `Indexed ${data.totalIndexed} products in ${formatDuration(data.duration)}`,
        });
      } else {
        toast.error('Sync failed', { description: data.message || 'Failed to sync products' });
      }
    } catch {
      toast.error('Sync failed', { description: 'An error occurred while syncing' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm(`Clear all indexed products for language "${language}"? This cannot be undone.`)) return;
    setIsClearing(true);
    try {
      const response = await fetch(`/admin/algolia/clear/${language}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok) {
        setSyncResult(null);
        setSearchResults(null);
        toast.success('Index cleared', {
          description: `Index for "${language}" has been cleared`,
        });
      } else {
        toast.error('Clear failed', { description: data.message || 'Failed to clear index' });
      }
    } catch {
      toast.error('Clear failed', { description: 'An error occurred while clearing the index' });
    } finally {
      setIsClearing(false);
    }
  };

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    setCurrentPage(0);
    setSyncResult(null);
    setSearchResults(null);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(0);
  };

  const formatDuration = (ms: number) => {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const busy = isSyncing || isClearing;

  return (
    <Container className="divide-y p-0">
      {/* Header */}
      <div className="px-6 py-4">
        <Heading level="h1">Algolia Index Management</Heading>
        <Text className="text-ui-fg-subtle mt-1">Sync and manage product search indexes for each language</Text>
      </div>

      {/* Controls */}
      <div className="px-6 py-4 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Text size="small" weight="plus">
              Language:
            </Text>
            <Select value={language} onValueChange={handleLanguageChange} disabled={busy}>
              <Select.Trigger className="w-44">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {LANGUAGES.map((lang) => (
                  <Select.Item key={lang.value} value={lang.value}>
                    {lang.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>

          <Button onClick={handleSync} disabled={busy}>
            {isSyncing ? 'Syncing...' : 'Sync All Products'}
          </Button>

          <Button variant="secondary" onClick={handleClear} disabled={busy}>
            {isClearing ? 'Clearing...' : 'Clear Index'}
          </Button>
        </div>

        {syncResult && (
          <div className="flex items-center gap-2 text-sm">
            <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
            <Text size="small" className="text-ui-fg-subtle">
              Synced <span className="text-ui-fg-base font-medium">{syncResult.totalIndexed}</span> products
              {syncResult.duration ? (
                <>
                  {' '}
                  in <span className="text-ui-fg-base font-medium">{formatDuration(syncResult.duration)}</span>
                </>
              ) : null}
            </Text>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="px-6 py-4 space-y-4">
        <Heading level="h2">Search Indexed Products</Heading>
        <Input placeholder="Search products in this index..." value={searchQuery} onChange={handleSearchChange} />

        {isSearching ? (
          <Text className="text-ui-fg-subtle text-center py-4">Searching...</Text>
        ) : searchResults && searchResults.hits.length === 0 ? (
          <Text className="text-ui-fg-subtle text-center py-4">
            {searchQuery.trim() ? `No products found for "${searchQuery}"` : 'No products indexed for this language'}
          </Text>
        ) : searchResults && searchResults.hits.length > 0 ? (
          <>
            <div className="flex items-center justify-between">
              <Text size="small" className="text-ui-fg-subtle">
                {searchResults.nbHits} result{searchResults.nbHits !== 1 ? 's' : ''} found
              </Text>
            </div>

            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Product</Table.HeaderCell>
                  <Table.HeaderCell>Handle</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {searchResults.hits.map((hit) => (
                  <Table.Row key={hit.objectID}>
                    <Table.Cell>
                      <div className="flex items-center gap-3">
                        {hit.thumbnail ? (
                          <img
                            src={hit.thumbnail}
                            alt={hit.title}
                            className="h-8 w-8 rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded bg-ui-bg-subtle flex items-center justify-center flex-shrink-0">
                            <Text size="xsmall" className="text-ui-fg-muted">
                              —
                            </Text>
                          </div>
                        )}
                        <Text size="small">{hit.title}</Text>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="text-ui-fg-subtle font-mono">
                        {hit.handle}
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>

            {searchResults.nbPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => setCurrentPage((p) => p - 1)}
                  disabled={currentPage === 0 || isSearching}
                >
                  Previous
                </Button>
                <Text size="small" className="text-ui-fg-subtle">
                  Page {currentPage + 1} of {searchResults.nbPages}
                </Text>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={currentPage >= searchResults.nbPages - 1 || isSearching}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        ) : null}
      </div>
    </Container>
  );
};

export const config = defineRouteConfig({ label: 'Algolia' });
export default AlgoliaManagementPage;
