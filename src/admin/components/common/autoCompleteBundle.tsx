'use client'

import { HttpTypes } from '@medusajs/framework/types'
import { Select } from '@medusajs/ui'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { sdk } from '../../lib/sdk'

type Props = {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  type?: 'bundled' | 'not-bundled' | 'all'
  selectProduct?: HttpTypes.AdminProduct
}

const PAGE_SIZE = 40

export default function ProductSelect({
  value,
  onChange,
  placeholder = 'Select product',
  disabled = false,
  type = 'all',
  selectProduct,
}: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 400)

    return () => clearTimeout(handler)
  }, [searchTerm])

  const { data, isLoading } = useQuery({
    queryKey: ['products-autocomplete', debouncedSearch, offset],
    queryFn: async () => {
      return await sdk.admin.product.list({
        limit: PAGE_SIZE,
        offset,
        q: debouncedSearch,
      })
    },
  })

  const products = useMemo(() => {
    if (!data?.products) return []

    let list = data.products

    if (type === 'bundled') {
      list = list.filter((p) =>
        p.tags?.some((t) => t.value === 'bundled')
      )
    }

    if (type === 'not-bundled') {
      list = list.filter(
        (p) => !p.tags?.some((t) => t.value === 'bundled')
      )
    }

    if (
      selectProduct &&
      !list.find((p) => p.id === selectProduct.id)
    ) {
      list = [selectProduct, ...list]
    }

    return list
  }, [data, type, selectProduct])

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <Select.Trigger className="w-full">
        <Select.Value placeholder={placeholder} />

      </Select.Trigger>

      <Select.Content>
        <div className="p-2 border-b">
          <input
            className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => {
              e.stopPropagation()
              setSearchTerm(e.target.value)
              setOffset(0)
            }}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>

        <div className="max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-sm text-center">Loading...</div>
          ) : (
            products.map((product) => (
              <Select.Item key={product.id} value={product.id}>
                <div className="flex items-center gap-3">
                  {product.thumbnail && (
                    <img
                      src={product.thumbnail}
                      className="w-6 h-6 object-cover rounded-sm"
                    />
                  )}
                  {product.title}
                </div>
              </Select.Item>
            ))
          )}
        </div>

        <div className="flex justify-between p-2 border-t">
          <button
            disabled={offset === 0}
            onClick={(e) => {
              e.preventDefault()
              setOffset((prev) => Math.max(0, prev - PAGE_SIZE))
            }}
            className="text-xs disabled:opacity-50"
          >
            Previous
          </button>

          <button
            disabled={(data?.products?.length ?? 0) < PAGE_SIZE}
            onClick={(e) => {
              e.preventDefault()
              setOffset((prev) => prev + PAGE_SIZE)
            }}
            className="text-xs disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </Select.Content>
    </Select>
  )
}