'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Printer, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ReceiptDonation = {
  id: string
  amount: number
  donated_at: string
  method: string
  campaign?: string | null
  receipt_number?: string | null
  donor?: {
    first_name: string
    last_name: string
    email?: string | null
    address?: string | null
  } | null
}

type ReceiptOrg = {
  name: string
  address?: string | null
  website?: string | null
  logo_url?: string | null
}

interface Props {
  donation: ReceiptDonation
  org: ReceiptOrg
}

function formatCurrency(amount: number) {
  return `$${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function ReceiptClient({ donation, org }: Props) {
  const donorName = donation.donor
    ? `${donation.donor.first_name} ${donation.donor.last_name}`
    : 'Anonymous Donor'
  const receiptNo = donation.receipt_number || donation.id.slice(0, 8).toUpperCase()

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Controls — hidden when printing */}
        <div className="print:hidden flex items-center justify-between mb-6">
          <Link
            href="/donors"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#00C4F4] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Donors
          </Link>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print / Save as PDF
          </Button>
        </div>

        {/* Receipt card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 print:shadow-none print:border-0">
          {/* Org header */}
          <div className="border-b border-gray-100 pb-6 mb-6">
            <h1 className="text-3xl font-bold text-gray-900">{org.name}</h1>
            {org.address && <p className="text-sm text-gray-500 mt-1">{org.address}</p>}
            {org.website && <p className="text-sm text-[#00C4F4] mt-0.5">{org.website}</p>}
          </div>

          <p className="text-xs font-semibold tracking-wide uppercase text-[#00C4F4] mb-1">
            Official Donation Receipt
          </p>

          <div className="flex flex-wrap justify-between gap-4 text-sm text-gray-500 mb-8">
            <span>Receipt #: <strong className="text-gray-900">{receiptNo}</strong></span>
            <span>Date: <strong className="text-gray-900">{formatDate(donation.donated_at)}</strong></span>
          </div>

          {/* Donor */}
          <div className="mb-8">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Received from</p>
            <p className="text-base font-semibold text-gray-900">{donorName}</p>
            {donation.donor?.address && (
              <p className="text-sm text-gray-500 whitespace-pre-line">{donation.donor.address}</p>
            )}
            {donation.donor?.email && (
              <p className="text-sm text-gray-500">{donation.donor.email}</p>
            )}
          </div>

          {/* Amount */}
          <div className="bg-gray-50 rounded-xl p-6 mb-8 print:bg-gray-50">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Donation amount</p>
            <p className="text-4xl font-bold text-emerald-600">{formatCurrency(donation.amount)}</p>
            <div className="flex flex-wrap gap-x-8 gap-y-1 mt-4 text-sm text-gray-600">
              <span>
                Payment method:{' '}
                <strong className="text-gray-900 capitalize">
                  {donation.method?.replace('_', ' ') || '—'}
                </strong>
              </span>
              {donation.campaign && (
                <span>
                  Campaign: <strong className="text-gray-900">{donation.campaign}</strong>
                </span>
              )}
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-8">
            Thank you for your generous contribution to {org.name}. Your support makes our work possible.
          </p>

          {/* Footer */}
          <div className="border-t border-gray-100 pt-6 text-xs text-gray-400">
            <p>This receipt may be used for tax purposes.</p>
            {org.website && <p className="mt-1">{org.website}</p>}
            <div className="flex items-center gap-1.5 mt-4">
              <Image src="/ivula.png" alt="Ivula" width={16} height={16} className="h-4 w-4 object-contain" />
              <span>Powered by Ivula Canopy</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
