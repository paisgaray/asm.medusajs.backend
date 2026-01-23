export interface AlgoliaHit {
  objectID: string;
  handle: string;
  title: string;
  description: string;
  thumbnail: string;
  [key: string]: unknown;
}

export interface Product {
  id: string;
  title: string;
  handle: string;
  description: string;
  thumbnail: string;
  variants: unknown[];
  [key: string]: unknown;
}
