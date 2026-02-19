'use client'

import { useState } from 'react'
import { Deal, DealType } from '@/app/types/deals'
import { walkFromDB } from '@/app/lib/distance'

const dealTypeLabels: Record<DealType, { label: string; colour: string }> = {
  '2for1': { label: '2 for 1', colour: 'bg-purple-100 text-purple-800' },
  percentage: { label: '% off', colour: 'bg-green-100 text-green-800' },
  fixed: { label: '£ off', colour: 'bg-blue-100 text-blue-800' },
  freeItem: { label: 'Free item', colour: 'bg-orange-100 text-orange-800' },
  setMenu: { label: 'Set menu', colour: 'bg-teal-100 text-teal-800' },
  subscription: { label: 'Subscription', colour: 'bg-pink-100 text-pink-800' },
}

const dayLabels: Record<string, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  everyday: 'Every day',
}

interface DealCardProps {
  deal: Deal
}

export function DealCard({ deal }: DealCardProps) {
  const [codeRevealed, setCodeRevealed] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const { label, colour } = dealTypeLabels[deal.dealType]
  const walk =
    deal.lat != null && deal.lng != null
      ? walkFromDB(deal.lat, deal.lng)
      : null

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl" role="img" aria-label={deal.restaurant}>
              {deal.imageEmoji}
            </span>
            <div>
              <h3 className="font-semibold text-gray-900 text-base leading-tight">
                {deal.restaurant}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">{deal.location}</p>
              {walk && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {walk.distance} · ~{walk.walkMins} min walk from DB
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colour}`}
            >
              {label}
            </span>
            <span className="text-xs text-gray-400">{deal.priceRange}</span>
          </div>
        </div>

        {/* Tagline + discount */}
        <div className="mt-3">
          <p className="text-sm font-medium text-gray-800">{deal.tagline}</p>
          <p className="text-lg font-bold text-emerald-600 mt-0.5">
            {deal.discountLabel}
          </p>
        </div>

        {/* Valid days */}
        <div className="flex flex-wrap gap-1 mt-2">
          {deal.validDays.map((d) => (
            <span
              key={d}
              className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
            >
              {dayLabels[d] ?? d}
            </span>
          ))}
        </div>
      </div>

      {/* Expandable description */}
      <div className="px-4 pb-3">
        <p
          className={`text-sm text-gray-600 leading-relaxed ${
            expanded ? '' : 'line-clamp-2'
          }`}
        >
          {deal.description}
        </p>
        {deal.description.length > 120 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-500 hover:text-blue-700 mt-1"
          >
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>

      {/* Requirements */}
      {(deal.requiresApp || deal.requiresCard) && (
        <div className="px-4 pb-3">
          <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Requires: {deal.requiresApp ?? deal.requiresCard}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 pb-4 flex items-center gap-2">
        {deal.code && (
          <button
            onClick={() => setCodeRevealed(true)}
            className={`flex-1 text-sm font-medium rounded-xl py-2 px-3 transition-all duration-200 ${
              codeRevealed
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono tracking-wide cursor-text'
                : 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95'
            }`}
          >
            {codeRevealed ? `Code: ${deal.code}` : '🎟 Reveal code'}
          </button>
        )}
        {deal.url && (
          <a
            href={deal.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${
              deal.code ? '' : 'flex-1'
            } text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl py-2 px-3 text-center transition-colors duration-150`}
          >
            {deal.code ? 'Visit →' : 'View deal →'}
          </a>
        )}
      </div>
    </div>
  )
}
