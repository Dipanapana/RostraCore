'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/DashboardLayout'
import PageHeader from '@/components/ui/PageHeader'
import { helpArticles, HELP_CATEGORIES } from '@/content/helpArticles'
import {
  BookOpen,
  Search,
  ChevronRight,
  Rocket,
  Users,
  CalendarClock,
  Building2,
  Wallet,
  Shield,
  Settings,
} from 'lucide-react'

const ICON_MAP: Record<string, React.ReactNode> = {
  Rocket: <Rocket className="w-5 h-5" />,
  Users: <Users className="w-5 h-5" />,
  CalendarClock: <CalendarClock className="w-5 h-5" />,
  Building2: <Building2 className="w-5 h-5" />,
  Wallet: <Wallet className="w-5 h-5" />,
  Shield: <Shield className="w-5 h-5" />,
  Settings: <Settings className="w-5 h-5" />,
}

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const filteredArticles = useMemo(() => {
    let articles = [...helpArticles]

    if (activeCategory) {
      articles = articles.filter((a) => a.category === activeCategory)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      articles = articles.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q)
      )
    }

    return articles.sort((a, b) => a.order - b.order)
  }, [searchQuery, activeCategory])

  const groupedArticles = useMemo(() => {
    const groups: Record<string, typeof filteredArticles> = {}
    for (const article of filteredArticles) {
      if (!groups[article.category]) {
        groups[article.category] = []
      }
      groups[article.category].push(article)
    }
    return groups
  }, [filteredArticles])

  const categoryOrder = HELP_CATEGORIES.map((c) => c.key)

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <PageHeader
          backHref="/dashboard"
          backLabel="Back to Dashboard"
          title="Help Center"
          subtitle="Find answers and learn how to use RostraCore"
          icon={<BookOpen className="w-6 h-6 text-blue-600" />}
        />

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search help articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm text-sm"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeCategory === null
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          {HELP_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() =>
                setActiveCategory(activeCategory === cat.key ? null : cat.key)
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeCategory === cat.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {ICON_MAP[cat.icon]}
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results Count */}
        {searchQuery.trim() && (
          <p className="text-sm text-gray-500">
            {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''} found
            {activeCategory && (
              <> in <strong>{HELP_CATEGORIES.find((c) => c.key === activeCategory)?.label}</strong></>
            )}
          </p>
        )}

        {/* Articles Grouped by Category */}
        {filteredArticles.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No articles found</h3>
            <p className="text-sm text-gray-500">
              Try adjusting your search query or clearing the category filter.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {categoryOrder
              .filter((key) => groupedArticles[key])
              .map((catKey) => {
                const category = HELP_CATEGORIES.find((c) => c.key === catKey)!
                const articles = groupedArticles[catKey]
                return (
                  <section key={catKey}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-gray-400">{ICON_MAP[category.icon]}</span>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {category.label}
                      </h2>
                      <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                        {articles.length}
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {articles.map((article) => (
                        <Link
                          key={article.slug}
                          href={`/help/${article.slug}`}
                          className="group bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-blue-300 hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                {article.title}
                              </h3>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                {article.description}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 flex-shrink-0 mt-0.5 transition-colors" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                )
              })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
