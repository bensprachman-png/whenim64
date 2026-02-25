'use client'

import { useState, useMemo } from 'react'
import { SearchIcon, XIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { GLOSSARY_TERMS, CATEGORY_ORDER, type GlossaryCategory } from '@/lib/glossary-data'

interface GlossaryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CATEGORY_COLORS: Record<GlossaryCategory, string> = {
  'Social Security': 'text-blue-600 dark:text-blue-400',
  'Medicare':        'text-green-600 dark:text-green-400',
  'Tax':             'text-amber-600 dark:text-amber-400',
  'Investing':       'text-purple-600 dark:text-purple-400',
}

export default function GlossaryDialog({ open, onOpenChange }: GlossaryDialogProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return GLOSSARY_TERMS
    return GLOSSARY_TERMS.filter((t) =>
      `${t.term} ${t.abbr ?? ''} ${t.brief} ${t.detail}`.toLowerCase().includes(q)
    )
  }, [query])

  // Group by category when not searching; flat list when searching
  const grouped = useMemo(() => {
    if (query.trim()) return null
    return CATEGORY_ORDER.map((cat) => ({
      category: cat,
      terms: filtered.filter((t) => t.category === cat),
    })).filter((g) => g.terms.length > 0)
  }, [filtered, query])

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setQuery(''); onOpenChange(o) }}>
      <DialogContent className="flex flex-col max-w-3xl h-[85vh] p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b">
          <DialogTitle>Retirement Glossary</DialogTitle>
          <DialogDescription>
            Common terms used in retirement planning — click any term to expand.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="px-6 py-3 shrink-0 border-b">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search terms…"
              className="w-full rounded-md border bg-background pl-9 pr-9 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <XIcon className="size-4" />
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {filtered.length === GLOSSARY_TERMS.length
              ? `${GLOSSARY_TERMS.length} terms`
              : `${filtered.length} of ${GLOSSARY_TERMS.length} terms`}
          </p>
        </div>

        {/* Term list */}
        <div className="flex-1 overflow-y-auto px-6 py-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              No terms match your search.
            </p>
          ) : grouped ? (
            // Grouped by category
            grouped.map(({ category, terms }) => (
              <div key={category} className="mb-2">
                <p className={`pt-4 pb-1 text-xs font-semibold uppercase tracking-widest ${CATEGORY_COLORS[category as GlossaryCategory]}`}>
                  {category}
                </p>
                <Accordion type="multiple">
                  {terms.map((t) => (
                    <AccordionItem key={t.id} value={t.id}>
                      <AccordionTrigger className="hover:no-underline py-3 items-start">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-0.5 sm:gap-4 items-baseline mr-2 text-left">
                          <span className="font-medium text-sm leading-snug">
                            {t.term}
                            {t.abbr && (
                              <span className="ml-2 text-[10px] font-mono font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                {t.abbr}
                              </span>
                            )}
                          </span>
                          <span className="text-sm text-muted-foreground font-normal leading-snug">
                            {t.brief}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="rounded-md bg-muted/40 px-4 py-3 text-sm leading-relaxed text-foreground">
                          {t.detail}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))
          ) : (
            // Flat list when searching
            <Accordion type="multiple">
              {filtered.map((t) => (
                <AccordionItem key={t.id} value={t.id}>
                  <AccordionTrigger className="hover:no-underline py-3 items-start">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-0.5 sm:gap-4 items-baseline mr-2 text-left">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-sm leading-snug">
                          {t.term}
                          {t.abbr && (
                            <span className="ml-2 text-[10px] font-mono font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {t.abbr}
                            </span>
                          )}
                        </span>
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${CATEGORY_COLORS[t.category]}`}>
                          {t.category}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground font-normal leading-snug">
                        {t.brief}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="rounded-md bg-muted/40 px-4 py-3 text-sm leading-relaxed text-foreground">
                      {t.detail}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
