type FileInfo = {
  file_key: string;
  filename: string;
  fileContent: string; // base64
  categoryMapping?: Record<string, string>; // product_handle -> category_path
};

const fileCache = new Map<string, FileInfo>();

export function addFileToCache(transactionId: string, fileInfo: FileInfo): void {
  fileCache.set(transactionId, fileInfo);
}

export function getFileFromCache(transactionId: string): FileInfo | undefined {
  return fileCache.get(transactionId);
}

export function removeFileFromCache(transactionId: string): void {
  fileCache.delete(transactionId);
}

// Cache específico para categoryMapping (pode ser usado por transaction_id ou workflow_id)
const categoryMappingCache = new Map<string, Record<string, string>>();

export function addCategoryMappingToCache(key: string, categoryMapping: Record<string, string>): void {
  categoryMappingCache.set(key, categoryMapping);
}

export function getCategoryMappingFromCache(key: string): Record<string, string> | undefined {
  return categoryMappingCache.get(key);
}

export function removeCategoryMappingFromCache(key: string): void {
  categoryMappingCache.delete(key);
}
