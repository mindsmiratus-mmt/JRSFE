# JRSFE Reports Architecture, Shop-Wise Scoping & Data Logic Comparison

This document provides a detailed overview of the reporting architecture in **JRSFE**, featuring a comprehensive comparison between **Sale Report – Billwise** and **Sale Report – Itemwise**, backend `shopId` filtering support, and role permission guards.

---

## 1. Role & Permission Scoping (Summary)

Access to reports and export functions is managed via [`src/utils/permission.ts`](file:///d:/working/JRSFE/src/utils/permission.ts):

- **Admin Override (`isAdmin`)**: Full access to view and export all reports.
- **View Permission (`hasRead`)**: Hides report navigation from [`SideNavbar.tsx`](file:///d:/working/JRSFE/src/components/layout/SideNavbar.tsx) and shows an Access Denied guard if `false`.
- **Export Permission (`canExport`)**: CSV, Excel, and PDF print buttons are visible **only** to users with `Create` or `Update` permission (`hasCreate || hasUpdate || isAdmin`).

---

## 2. Logic Comparison: Sale Billwise vs. Sale Itemwise

Both reports derive their raw dataset from backend invoice records (`useInvoices` hook), but structure and aggregate data at different granularities:

| Comparison Criteria | Sale Report – Billwise ([SaleBillwiseReport.tsx](file:///d:/working/JRSFE/src/pages/reports/SaleBillwiseReport.tsx)) | Sale Report – Itemwise ([SaleItemwiseReport.tsx](file:///d:/working/JRSFE/src/pages/reports/SaleItemwiseReport.tsx)) |
| :--- | :--- | :--- |
| **Data Granularity** | **1 Row per Invoice / Bill** | **1 Row per Sold Item** |
| **Primary Identifier** | Invoice Number (`invoiceNo`) | Product Code / Barcode / Item Name (`invoiceItems[i]`) |
| **Focus Area** | Financial summary, GST tax breakdown (CGST, SGST, IGST), total bill amount, customer details. | Product inventory breakdown, metal weights (Gross/Net Wt), purity (KT), making charges, and individual item pricing. |
| **Row Rendering Logic** | Renders overall invoice totals: `subTotal`, `totalTax`, `grandTotal`, and aggregated invoice weight sums. | Flattens `invoice.invoiceItems[]` array across all invoices. Each item sold generates an independent row. |
| **Tax Calculation** | Shows exact CGST, SGST, IGST split per invoice bill. | Shows item price breakdown; tax is summarized at the bill container level. |
| **Customer & Shop Context** | Includes Customer Name, Phone, Address, and Shop Name for each bill. | Includes Invoice No., Customer Name, and Shop Name alongside individual product specs. |
| **Shop Filter Support** | **Supported** via backend `shopId` parameter (`/Invoice?shopId={filterShopId}`). | **Supported** via backend `shopId` parameter (`/Invoice?shopId={filterShopId}`). |

---

## 3. Shop Filter Scoping & Backend Limitation Notice

### A. Shop-Filter Supported Reports
The following reports accept the `shopId` parameter in backend query requests:
1. **Master Sale Report** ([`SaleReport.tsx`](file:///d:/working/JRSFE/src/pages/SaleReport.tsx))
2. **Sale Report – Billwise** ([`SaleBillwiseReport.tsx`](file:///d:/working/JRSFE/src/pages/reports/SaleBillwiseReport.tsx))
3. **Sale Report – Itemwise** ([`SaleItemwiseReport.tsx`](file:///d:/working/JRSFE/src/pages/reports/SaleItemwiseReport.tsx))

> [!NOTE]
> These reports include the reusable [`ShopSelect.tsx`](file:///d:/working/JRSFE/src/components/ui/ShopSelect.tsx) dropdown control, allowing users to filter sales data by a specific shop or view all shops.

### B. Non-Shop Scoped Reports (Backend API Limitations)
The backend endpoints and custom hooks for the following reports **do not accept a `shopId` filter parameter**:
- **Purchase Report** ([`PurchaseReport.tsx`](file:///d:/working/JRSFE/src/pages/reports/PurchaseReport.tsx))
- **In-Transit Report** ([`InTransitReport.tsx`](file:///d:/working/JRSFE/src/pages/reports/InTransitReport.tsx))
- **Received Report** ([`ReceivedReport.tsx`](file:///d:/working/JRSFE/src/pages/reports/ReceivedReport.tsx))
- **Transfer Report** ([`TransferReport.tsx`](file:///d:/working/JRSFE/src/pages/reports/TransferReport.tsx))
- **Available Stock Report** ([`AvailableStockReport.tsx`](file:///d:/working/JRSFE/src/pages/reports/AvailableStockReport.tsx))
- **Return Report** ([`ReturnReport.tsx`](file:///d:/working/JRSFE/src/pages/reports/ReturnReport.tsx))
- **Item Tracking Report** ([`ItemTrackingReport.tsx`](file:///d:/working/JRSFE/src/pages/reports/ItemTrackingReport.tsx))
- **Metal Report** ([`MetalReport.tsx`](file:///d:/working/JRSFE/src/pages/reports/MetalReport.tsx))

> [!IMPORTANT]
> **Why `ShopSelect` is Disabled / Removed for Other Reports**:
> Since the underlying backend API endpoints for these modules (`/StockTransfer`, `/Return`, `/Purchase`, etc.) do not accept or process a `shopId` query parameter, shop-wise filtered reports **cannot be created or generated** for them at the frontend level. `ShopSelect` was intentionally removed from these pages to avoid presenting misleading filter UI to users until backend API endpoints are updated with `shopId` filtering support.

---

## 4. Master Report Summary Table

| Report Name | Component Path | Backend `shopId` Parameter? | Shop Filter (`ShopSelect`) Included? | Granularity Level |
| :--- | :--- | :---: | :---: | :--- |
| **Sale (Billwise)** | `pages/reports/SaleBillwiseReport.tsx` | **YES** | **YES** | Bill / Invoice Level |
| **Sale (Itemwise)** | `pages/reports/SaleItemwiseReport.tsx` | **YES** | **YES** | Item / Barcode Level |
| **Sale Report (Master)** | `pages/SaleReport.tsx` | **YES** | **YES** | Master Tabbed View |
| **Purchase** | `pages/reports/PurchaseReport.tsx` | **NO** | **NO** (Backend API lacks `shopId`) | Overall Purchase |
| **In-Transit** | `pages/reports/InTransitReport.tsx` | **NO** | **NO** (Backend API lacks `shopId`) | Transfer Status |
| **Received** | `pages/reports/ReceivedReport.tsx` | **NO** | **NO** (Backend API lacks `shopId`) | Transfer Receipt |
| **Transfer** | `pages/reports/TransferReport.tsx` | **NO** | **NO** (Backend API lacks `shopId`) | Transfer Log |
| **Available Stock** | `pages/reports/AvailableStockReport.tsx` | **NO** | **NO** (Backend API lacks `shopId`) | Stock Inventory |
| **Return** | `pages/reports/ReturnReport.tsx` | **NO** | **NO** (Backend API lacks `shopId`) | Returned Items |
| **Item Tracking** | `pages/reports/ItemTrackingReport.tsx` | **NO** | **NO** (Backend API lacks `shopId`) | Product Audit |
| **Metal Report** | `pages/reports/MetalReport.tsx` | **NO** | **NO** (Backend API lacks `shopId`) | Metal Category Summary |
