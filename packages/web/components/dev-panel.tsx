'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api-fetch'

// Evaluated at build time by Next.js — falsy when env is absent, so Panel is dead code in prod.
const ENABLED = process.env.NEXT_PUBLIC_DEV_PANEL === 'true'

// ─── types ────────────────────────────────────────────────────────────────────

type ApiResult = { status: number; body: unknown }
type Slot = 'createInvoice' | 'simPay' | 'createOrder' | 'negNoInvoice' | 'negUnpaid'
type Results = { [K in Slot]: ApiResult | null }
type Busy    = Partial<Record<Slot, boolean>>

const EMPTY_RESULTS: Results = {
  createInvoice: null, simPay: null, createOrder: null,
  negNoInvoice: null,  negUnpaid: null,
}

// ─── tiny helpers ─────────────────────────────────────────────────────────────

function ResultBlock({ result }: { result: ApiResult | null }) {
  if (!result) return null
  const ok = result.status >= 200 && result.status < 300
  return (
    <pre className="mt-1 rounded bg-black p-2 text-[10px] leading-relaxed overflow-x-auto whitespace-pre-wrap break-all border border-neutral-800">
      <span className={ok ? 'text-green-400' : 'text-red-400'}>{result.status} </span>
      {JSON.stringify(result.body, null, 2)}
    </pre>
  )
}

function ActionBtn({
  label, loading, disabled, onClick,
}: { label: string; loading: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={loading || !!disabled}
      className="w-full rounded bg-neutral-800 px-3 py-2 text-left text-xs hover:bg-neutral-700 disabled:opacity-40 active:scale-[0.98] transition-all"
    >
      {loading ? '⏳ ' : ''}{label}
    </button>
  )
}

// ─── order body shared between happy path and negative tests ──────────────────

function orderBody(invoiceId: string, serviceTypeId: number) {
  return {
    invoiceId,
    serviceTypeId,
    address: 'Dev test, Ulaanbaatar',
    scheduledDate: new Date(Date.now() + 86_400_000).toISOString(),
    hours: 2,
    areaSqm: 40,
    matchingStrategy: 'scheduled',
  }
}

// ─── panel (all hooks live here, never rendered when ENABLED=false) ────────────

function Panel() {
  const [open,          setOpen]          = useState(false)
  const [invoiceId,     setInvoiceId]     = useState<string | null>(null)
  const [serviceTypeId, setServiceTypeId] = useState(1)
  const [results,       setResults]       = useState<Results>(EMPTY_RESULTS)
  const [busy,          setBusy]          = useState<Busy>({})

  // Fetch first available service type so the order body is always valid
  useEffect(() => {
    apiFetch('/api/service-types')
      .then(r => r.json())
      .then((d: { success: boolean; data?: { id: number }[] }) => {
        if (d.success && d.data?.[0]) setServiceTypeId(d.data[0].id)
      })
      .catch(() => {})
  }, [])

  // Generic caller for routes where we don't need to inspect the body before storing it
  const call = async (slot: Slot, fn: () => Promise<Response>) => {
    setBusy((prev: Busy) => { const n: Busy = { ...prev }; n[slot] = true;  return n })
    try {
      const res  = await fn()
      const body = await res.json() as unknown
      setResults((prev: Results) => { const n: Results = { ...prev }; n[slot] = { status: res.status, body }; return n })
    } catch (err) {
      setResults((prev: Results) => { const n: Results = { ...prev }; n[slot] = { status: 0, body: String(err) }; return n })
    } finally {
      setBusy((prev: Busy) => { const n: Busy = { ...prev }; n[slot] = false; return n })
    }
  }

  // Step 1 — create invoice; extract invoice_id from response
  const handleCreateInvoice = async () => {
    setBusy((prev: Busy) => { const n: Busy = { ...prev }; n.createInvoice = true; return n })
    try {
      const res  = await apiFetch('/api/payments/create-invoice', { method: 'POST' })
      const body = await res.json() as { success: boolean; data?: { invoice_id: string } }
      setResults((prev: Results) => { const n: Results = { ...prev }; n.createInvoice = { status: res.status, body }; return n })
      if (body.success && body.data?.invoice_id) setInvoiceId(body.data.invoice_id)
    } catch (err) {
      setResults((prev: Results) => { const n: Results = { ...prev }; n.createInvoice = { status: 0, body: String(err) }; return n })
    } finally {
      setBusy((prev: Busy) => { const n: Busy = { ...prev }; n.createInvoice = false; return n })
    }
  }

  // Step 2 — confirm payment
  const handleSimPay = () => call('simPay', () =>
    apiFetch('/api/payments/dev-sim-pay', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ invoiceId }),
    }),
  )

  // Step 3 — create order (requires confirmed invoice)
  const handleCreateOrder = () => call('createOrder', () =>
    apiFetch('/api/orders', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(orderBody(invoiceId ?? '', serviceTypeId)),
    }),
  )

  // Negative: no invoiceId in body → Zod rejects → expect 400
  const handleNegNoInvoice = () => call('negNoInvoice', () =>
    apiFetch('/api/orders', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        serviceTypeId,
        address: 'Dev test, Ulaanbaatar',
        scheduledDate: new Date(Date.now() + 86_400_000).toISOString(),
        hours: 2,
        areaSqm: 40,
      }),
    }),
  )

  // Negative: create invoice then skip sim-pay → expect 402
  const handleNegUnpaid = async () => {
    setBusy((prev: Busy) => { const n: Busy = { ...prev }; n.negUnpaid = true; return n })
    try {
      const invRes  = await apiFetch('/api/payments/create-invoice', { method: 'POST' })
      const invData = await invRes.json() as { success: boolean; data?: { invoice_id: string } }
      const unpaid  = invData.data?.invoice_id ?? 'missing'

      const res  = await apiFetch('/api/orders', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(orderBody(unpaid, serviceTypeId)),
      })
      const body = await res.json() as unknown
      setResults((prev: Results) => { const n: Results = { ...prev }; n.negUnpaid = { status: res.status, body }; return n })
    } catch (err) {
      setResults((prev: Results) => { const n: Results = { ...prev }; n.negUnpaid = { status: 0, body: String(err) }; return n })
    } finally {
      setBusy((prev: Busy) => { const n: Busy = { ...prev }; n.negUnpaid = false; return n })
    }
  }

  const reset = () => { setInvoiceId(null); setResults(EMPTY_RESULTS) }

  // ── floating trigger ─────────────────────────────────────────────────────────
  if (!open) {
    return (
      <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 w-full max-w-[390px] flex justify-end pr-4 pointer-events-none">
        <button
          onClick={() => setOpen(true)}
          className="pointer-events-auto rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-mono text-white shadow-lg opacity-75 hover:opacity-100 active:scale-95 transition-all"
        >
          🧪 Dev panel
        </button>
      </div>
    )
  }

  // ── open panel ───────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-[390px] max-h-[80vh] overflow-y-auto rounded-t-2xl bg-neutral-950 text-white p-4 pb-8 font-mono text-xs"
        onClick={(e: MouseEvent) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold">🧪 Dev — Payment Flow</span>
          <div className="flex gap-2">
            <button onClick={reset} className="rounded bg-neutral-700 px-2 py-1 hover:bg-neutral-600 active:scale-95 transition-all">
              Reset
            </button>
            <button onClick={() => setOpen(false)} className="rounded bg-neutral-700 px-2 py-1 hover:bg-neutral-600 active:scale-95 transition-all">
              ✕
            </button>
          </div>
        </div>

        {/* Stored invoice_id */}
        {invoiceId && (
          <div className="mb-3 rounded bg-neutral-800 px-2 py-1.5 break-all">
            <span className="text-neutral-400">invoice_id: </span>
            <span className="text-yellow-300">{invoiceId}</span>
          </div>
        )}

        {/* ── Happy path ─────────────────────────────────────────────────────── */}
        <p className="mb-2 text-[10px] uppercase tracking-wider text-neutral-400">Happy path</p>

        <div className="mb-2">
          <ActionBtn label="1. Create invoice" loading={!!busy.createInvoice} onClick={() => { void handleCreateInvoice() }} />
          <ResultBlock result={results.createInvoice} />
        </div>

        <div className="mb-2">
          <ActionBtn label="2. Simulate pay" loading={!!busy.simPay} disabled={!invoiceId} onClick={() => { void handleSimPay() }} />
          <ResultBlock result={results.simPay} />
        </div>

        <div className="mb-2">
          <ActionBtn label="3. Create order" loading={!!busy.createOrder} disabled={!invoiceId} onClick={() => { void handleCreateOrder() }} />
          <ResultBlock result={results.createOrder} />
        </div>

        {/* ── Negative tests ─────────────────────────────────────────────────── */}
        <p className="mt-4 mb-2 text-[10px] uppercase tracking-wider text-neutral-400">Negative tests</p>

        {([
          { slot: 'negNoInvoice' as const, label: 'Order without invoice',      expected: 400 },
          { slot: 'negUnpaid'   as const, label: 'Order with unpaid invoice',   expected: 402 },
        ] as const).map(({ slot, label, expected }) => {
          const result = results[slot]
          const match  = result ? result.status === expected : null
          const handler = slot === 'negNoInvoice'
            ? () => { void handleNegNoInvoice() }
            : () => { void handleNegUnpaid() }
          return (
            <div key={slot} className="mb-2">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <ActionBtn label={label} loading={!!busy[slot]} onClick={handler} />
                </div>
                <span className="shrink-0 text-[10px] text-neutral-500">expect {expected}</span>
                {result && (
                  <span className={`shrink-0 text-[10px] font-bold ${match ? 'text-green-400' : 'text-red-400'}`}>
                    got {result.status} {match ? '✓' : '✗'}
                  </span>
                )}
              </div>
              <ResultBlock result={result} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── exported shell ───────────────────────────────────────────────────────────
// Returns null in prod instantly (no hooks called), so Panel is never evaluated.

export function DevPanel() {
  if (!ENABLED) return null
  return <Panel />
}
