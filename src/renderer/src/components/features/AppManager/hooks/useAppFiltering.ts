import { useState, useMemo, useEffect } from 'react'
import { AppInfo } from '../types'
import { BLOATWARE_PRESETS, FRIENDLY_NAMES } from '../constants'

export function useAppFiltering(packages: AppInfo[]) {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'system' | 'user' | 'disabled'>('all')
  const [presetFilter, setPresetFilter] = useState<string>('none')
  const [page, setPage] = useState(1)
  const ITEMS_PER_PAGE = 50

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const systemCount = useMemo(() => packages.filter(p => p.type?.toLowerCase() === 'system').length, [packages])
  const userCount = useMemo(() => packages.filter(p => p.type?.toLowerCase() === 'user').length, [packages])
  const disabledCount = useMemo(() => packages.filter(p => p.status?.toLowerCase() === 'disabled').length, [packages])

  const filteredPackages = useMemo(() => {
    let list = packages
    if (filter === 'system') list = list.filter(app => app.type?.toLowerCase() === 'system')
    if (filter === 'user') list = list.filter(app => app.type?.toLowerCase() === 'user')
    if (filter === 'disabled') list = list.filter(app => app.status?.toLowerCase() === 'disabled')

    if (presetFilter !== 'none') {
      const presetList = BLOATWARE_PRESETS[presetFilter as keyof typeof BLOATWARE_PRESETS] || []
      list = list.filter(app => presetList.includes(app.pkg))
    }

    if (!debouncedSearch) return list
    const q = debouncedSearch.toLowerCase()
    return list.filter(app => {
      const friendlyName = FRIENDLY_NAMES[app.pkg] || ''
      return app.pkg.toLowerCase().includes(q) || friendlyName.toLowerCase().includes(q)
    })
  }, [packages, debouncedSearch, presetFilter, filter])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [debouncedSearch, filter, presetFilter])

  const paginatedPackages = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE
    return filteredPackages.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredPackages, page])

  const totalPages = Math.ceil(filteredPackages.length / ITEMS_PER_PAGE)

  return {
    searchQuery, setSearchQuery,
    filter, setFilter,
    presetFilter, setPresetFilter,
    page, setPage,
    systemCount, userCount, disabledCount,
    filteredPackages, paginatedPackages, totalPages
  }
}
