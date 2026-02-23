'use client'

import { useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/DashboardLayout'
import PageHeader from '@/components/ui/PageHeader'
import { helpArticles, HELP_CATEGORIES } from '@/content/helpArticles'
import { BookOpen, ChevronRight, FileQuestion } from 'lucide-react'

export default function HelpArticlePage() {
  const params = useParams()
  const slug = params.slug as string

  const article = useMemo(
    () => helpArticles.find((a) => a.slug === slug),
    [slug]
  )

  const relatedArticles = useMemo(() => {
    if (!article) return []
    return helpArticles
      .filter((a) => a.category === article.category && a.slug !== article.slug)
      .sort((a, b) => a.order - b.order)
  }, [article])

  const category = article
    ? HELP_CATEGORIES.find((c) => c.key === article.category)
    : null

  if (!article) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto space-y-6">
          <PageHeader
            backHref="/help"
            backLabel="Back to Help Center"
          />
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            <FileQuestion className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Article Not Found
            </h1>
            <p className="text-sm text-gray-500 mb-6">
              The help article you are looking for does not exist or may have been moved.
            </p>
            <Link
              href="/help"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Browse All Articles
            </Link>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <PageHeader
          backHref="/help"
          backLabel="Back to Help Center"
          title={article.title}
          subtitle={article.description}
          icon={<BookOpen className="w-6 h-6 text-blue-600" />}
        />

        {/* Category Badge */}
        {category && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
              {category.label}
            </span>
          </div>
        )}

        {/* Article Content */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <div
            className="prose prose-sm max-w-none
              prose-headings:text-gray-900 prose-headings:font-semibold
              prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-3
              prose-h3:text-base prose-h3:mt-5 prose-h3:mb-2
              prose-p:text-gray-600 prose-p:leading-relaxed prose-p:mb-3
              prose-li:text-gray-600 prose-li:leading-relaxed
              prose-strong:text-gray-900 prose-strong:font-semibold
              prose-ul:my-2 prose-ol:my-2
              prose-li:my-0.5"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </div>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              Related Articles
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {relatedArticles.map((related) => (
                <Link
                  key={related.slug}
                  href={`/help/${related.slug}`}
                  className="group bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {related.title}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {related.description}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 flex-shrink-0 mt-0.5 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
