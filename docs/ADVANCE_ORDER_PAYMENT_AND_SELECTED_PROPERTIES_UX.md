# Advance Order Payment UX & Sales History Selected Properties

Branch: `feature/advance-fully-paid-ux` (from `feature/customer-address-order-invoice` @ 7e9ff7b)
Date: 2026-10-01
Scope: JRSFE only. No JRS API, database or migration change; no VedaGold change.

## Completed

### `/admin/sale/advance/:id` — `src/components/forms/Sale/AdvacePaymentForm.tsx`

This page is the form for collecting the **remaining balance** and completing an advance order
(`POST /api/Order/{id}/complete-advance`). It is not a view of payments already made.

- **Fully-paid state** (`order.balanceAmount <= 0`): shows "Fully paid — no balance to collect";
  hides the wallet-redeem input, the split-payment rows, "Add Split Payment", the totals panel and
  the adjust panel. The main button reads "Complete Advance Order"; the confirm dialog says no
  further payment is collected.
- **Request unchanged:** the hidden form still holds its single blank Cash row, so complete-advance
  receives the same payload as before
  (`{ walletRedeemAmount: 0, paymentDetail: { payments: [{ method: 0, amount: 0 }], exchangeItems: [], adjustAmount: 0 } }`).
  JRS skips zero-amount entries and reuses the existing advance `OrderPayment` for the invoice.
- **View Advance Receipt** button (header, next to Cancel): reuses the existing `useAdvanceReceiptPdf`
  hook (`GET /api/Order/{id}/advance-receipt-pdf`), opened the same way as on `/admin/sale`.
- **"Collecting Now"** replaces the misleading "Total Paid" label in the split-payment summary. It is
  the amount entered on this form now; the calculation is unchanged.
- **Completed/cancelled guard:** when `status` is `Closed` or `Cancelled`, or the order already has an
  `invoiceId`, the payment section is replaced by a read-only note and "Back to Sales", "Edit Items"
  is hidden, and both completion handlers return early. JRS itself does not block complete-advance
  on a Cancelled order without an invoice, so this guard matters.
- Partially paid orders (`balanceAmount > 0`) keep the existing behaviour apart from the label and
  the receipt button.

### `/admin/sale` item popup — `src/components/ui/hover-card.tsx` (`OrderItemsHoverCard`)

- Shows a compact **Selected Properties** block (one `name: value` line each) under Tag/HUID.
- Reads only the persisted snapshot `item.selectedProperties` (camelCase, from
  `POST /api/Order/list` → `cartData.items[]`); never the live product.
- Pairs with an empty, null or whitespace-only name or value are skipped; with no valid pair, no
  section is rendered. Values render as React text (escaped).
- One component, so it covers both the `Sale.tsx` table and card layouts. `Sale.tsx` is unchanged.

## Payment finding

- The advance payment from checkout-advance (including ecommerce payments, `method = 3` →
  `OnlineBanking`) **is recorded correctly** by JRS as `Order` + `OrderPayment` + `OrderPaymentEntry`.
- The advance page does not load payment entries: it calls only `GET /api/Order/{id}`, whose response
  does not include `PaymentDetails` (`OrderRepository.GetByIdAsync` does not include it).
- The **Advance Receipt PDF** already shows each entry's method, machine/bank, reference and amount
  (`GetAdvanceOrderForReceiptAsync` loads them). The final invoice PDF also shows them. Neither
  displays `OrderPaymentEntry.Note`.
- No JRS API change was required. **Inline payment display on the advance page is deferred**; it would
  need a JRS read change, because no data the page already loads contains the entries.

## selectedProperties finding

selectedProperties are **not lost**. Path:

VedaGold (POS cart add) → JRS `CartItem.SelectedProperties` → `Order.CartData` (cart snapshot copied
verbatim at checkout) → `InvoiceItem.SelectedPropertiesJson` (copied at completion) → JRSFE.

- The Advance Receipt PDF and Invoice PDF already render them as `Name: Value` lines under the item.
- The JRSFE Sales History popup now renders them (above).
- Verified on a throwaway SQL Server LocalDB with the real JRS code: stored in `Orders.CartData` and
  `InvoiceItems.SelectedPropertiesJson`, returned by `POST /api/Order/list`, and present in both
  generated HTML documents. The 28 existing JRS `SelectedProperties` tests pass.

## Validation

| Check | Result |
|---|---|
| TypeScript (`tsc -b`) | PASS |
| Vite production build | PASS (existing large-chunk warning only) |
| ESLint on changed files | No new errors (pre-existing errors in both files unchanged) |
| JRS changes | None — clean at 85f8889 |
| VedaGold changes | None |
| Browser verification | **PENDING MANUAL VERIFICATION** — no browser was available in this phase |

### Manual checks still required

- **A. Fully paid advance:** balance ₹0; fully-paid message shown; no balance-payment rows;
  View Advance Receipt opens the PDF; Complete Advance Order completes the order.
- **B. Partially paid advance:** balance-payment rows, split payment and wallet behaviour unchanged;
  label reads "Collecting Now".
- **C. Closed / cancelled:** opening `/admin/sale/advance/{id}` shows the read-only note; no way to
  complete again.
- **D. Sales History popup:** an item with selectedProperties shows them; an item without them shows
  no empty section.

## Deferred work (NOT done)

1. VedaGold payment → POS recovery (separate track; uncommitted VedaGold work awaiting review).
2. VedaGold CMS product visibility sync fix (separate track).
3. Optional inline advance-payment display on the advance page (needs a JRS read change).
4. Optional selectedProperties display in the `AdvacePaymentForm` item list (that page receives the
   raw PascalCase `CartData` string, so it would read `SelectedProperties` / `Name` / `Value`).
