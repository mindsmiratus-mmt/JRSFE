import { format } from "date-fns";
import { formatWeight } from "./number";

export interface ExportColumn {
  header: string;
  key: string;
  formatter?: (value: any, row: any) => string | number;
}

export interface StatCardItem {
  label: string;
  value: string | number;
  textColor?: string;
  bgColor?: string;
  iconSvg?: string;
}

/**
 * Downloads data as a CSV file compatible with MS Excel.
 */
export const exportToCSV = (
  filename: string,
  columns: ExportColumn[],
  data: any[]
) => {
  if (!data || data.length === 0) {
    alert("No data available to export.");
    return;
  }

  // Header line
  const headers = columns.map((col) => `"${col.header.replace(/"/g, '""')}"`).join(",");

  // Row lines
  const rows = data.map((row) => {
    return columns
      .map((col) => {
        let val = row[col.key];
        if (col.formatter) {
          val = col.formatter(val, row);
        }
        if (val === null || val === undefined) {
          val = "";
        }
        const stringVal = String(val).replace(/"/g, '""');
        return `"${stringVal}"`;
      })
      .join(",");
  });

  const csvContent = "\uFEFF" + [headers, ...rows].join("\r\n"); // Add UTF-8 BOM for Excel compatibility
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Downloads data as a native Excel XML Spreadsheet (.xls) opening natively in Microsoft Excel.
 */
export const exportToExcel = (
  filename: string,
  columns: ExportColumn[],
  data: any[]
) => {
  if (!data || data.length === 0) {
    alert("No data available to export.");
    return;
  }

  const headerCells = columns
    .map(
      (col) =>
        `<Cell><Data ss:Type="String">${col.header.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</Data></Cell>`
    )
    .join("");

  const dataRows = data
    .map((row) => {
      const cells = columns
        .map((col) => {
          const rawVal = row[col.key];
          let val = rawVal;
          if (col.formatter) {
            val = col.formatter(val, row);
          }
          if (val === null || val === undefined) val = "";

          // Explicit text column keys that should always remain text strings
          const stringKeys = ["billNo", "productCode", "gstNo", "gstin", "date", "billDate", "phone", "huid", "purity", "productName", "customerName", "metal", "category"];
          const isExplicitStringKey = stringKeys.includes(col.key);

          let numericVal: number | null = null;

          if (!isExplicitStringKey) {
            if (typeof rawVal === "number" && !isNaN(rawVal)) {
              numericVal = rawVal;
            } else if (typeof val === "number" && !isNaN(val)) {
              numericVal = val;
            } else if (typeof val === "string" && val.trim() !== "") {
              // Strip currency symbols (₹, $) and commas (,), then check if valid number
              const cleaned = val.replace(/[₹$,]/g, "").trim();
              if (cleaned !== "" && !isNaN(Number(cleaned)) && !cleaned.includes("/") && !cleaned.includes("-")) {
                numericVal = Number(cleaned);
              }
            }
          }

          if (numericVal !== null) {
            return `<Cell><Data ss:Type="Number">${numericVal}</Data></Cell>`;
          }

          const formattedVal = String(val).replace(/</g, "&lt;").replace(/>/g, "&gt;");
          return `<Cell><Data ss:Type="String">${formattedVal}</Data></Cell>`;
        })
        .join("");
      return `<Row>${cells}</Row>`;
    })
    .join("");

  const xmlContent = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Report">
  <Table>
   <Row>${headerCells}</Row>
   ${dataRows}
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xmlContent], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename.endsWith(".xls") ? filename : `${filename}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Opens a print-friendly window for the report table with custom report headline.
 */
export const printReportTable = (
  title: string,
  subtitle: string,
  columns: ExportColumn[],
  data: any[]
) => {
  if (!data || data.length === 0) {
    alert("No data available to print.");
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Popup window was blocked by browser. Please allow popups to print reports.");
    return;
  }

  const tableHeaderHtml = columns
    .map((col) => `<th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; background-color: #f1f5f9; color: #0f172a; font-size: 11px; font-weight: 700;">${col.header}</th>`)
    .join("");

  const tableRowsHtml = data
    .map((row, idx) => {
      const bg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
      const cells = columns
        .map((col) => {
          let val = row[col.key];
          if (col.formatter) {
            val = col.formatter(val, row);
          }
          if (val === null || val === undefined) val = "-";
          return `<td style="border: 1px solid #e2e8f0; padding: 5px 8px; font-size: 10.5px; color: #334155;">${val}</td>`;
        })
        .join("");
      return `<tr style="background-color: ${bg};">${cells}</tr>`;
    })
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title></title>
        <style>
          @page {
            size: landscape;
            margin: 8mm;
          }
          body {
            font-family: system-ui, -apple-system, sans-serif;
            margin: 0;
            padding: 10px;
            color: #0f172a;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .report-header {
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid #b08d28;
          }
          .report-header h2 {
            margin: 0 0 4px 0;
            font-size: 18px;
            color: #854d0e;
            font-weight: 700;
          }
          .report-header p {
            margin: 0;
            font-size: 11px;
            color: #64748b;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 5px;
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <h2>${title}</h2>
          ${subtitle ? `<p>${subtitle}</p>` : ""}
        </div>
        <table>
          <thead>
            <tr>${tableHeaderHtml}</tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
};

/**
 * Opens a print-friendly window for grouped sale reports (matches the UI layout with top summary cards and accordion-style bill cards with nested item tables).
 */
export const printGroupedSaleReport = (
  title: string,
  subtitle: string,
  stats: StatCardItem[],
  invoices: any[],
  selectedMetal: string = "ALL"
) => {
  if (!invoices || invoices.length === 0) {
    alert("No data available to print.");
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Popup window was blocked by browser. Please allow popups to print reports.");
    return;
  }

  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const printedAtStr = format(new Date(), "dd MMM yyyy, hh:mm a");

  // Icon SVGs matching Lucide icons in UI
  const headerIconSvg = title.toLowerCase().includes("itemwise")
    ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e11d48" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`
    : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 6v12"/></svg>`;

  // Small inline icons for the invoice header row
  const personIcon = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  const storeIcon = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg>`;
  const cardIcon = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`;

  // Status badge color helper
  const statusBadge = (status: string) => {
    const s = (status || "Paid").toLowerCase();
    if (s === "pending") return { bg: "#fef9c3", color: "#854d0e", border: "#fde047" };
    if (s === "cancelled" || s === "cancel") return { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" };
    return { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" }; // default = paid/green
  };

  // ── Stat Cards: pure nested-table layout (zero flexbox) ─────────────────
  const statsCellsHtml = stats
    .map(
      (s) => `
      <td style="background-color:#ffffff; border:1px solid #e2e8f0; border-radius:10px; padding:10px 14px; vertical-align:middle; white-space:nowrap;">
        <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
          <tr>
            ${s.iconSvg
              ? `<td style="vertical-align:middle; padding-right:8px; line-height:0;">
                   <span style="display:inline-block; background-color:${s.bgColor || "#f8fafc"}; border-radius:8px; padding:7px; line-height:0;">
                     ${s.iconSvg}
                   </span>
                 </td>`
              : ""}
            <td style="vertical-align:middle;">
              <div style="font-size:8.5px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:3px;">${s.label}</div>
              <div style="font-size:15px; font-weight:800; color:${s.textColor || "#0f172a"};">${s.value}</div>
            </td>
          </tr>
        </table>
      </td>`
    )
    .join("");

  const statsHtml = statsCellsHtml
    ? `<table width="100%" cellpadding="0" cellspacing="8" border="0" style="margin-bottom:16px;"><tr>${statsCellsHtml}</tr></table>`
    : "";

  // ── Invoice Cards ────────────────────────────────────────────────────────
  const invoicesHtml = invoices
    .map((inv: any) => {
      const items = (inv.items || []).filter((item: any) => {
        if (selectedMetal === "ALL") return true;
        return item.metal?.toUpperCase() === selectedMetal.toUpperCase();
      });

      const invDateStr = inv.invoiceDate
        ? format(new Date(inv.invoiceDate), "dd MMM yyyy, hh:mm a")
        : "-";
      const custName = inv.customer?.name || "Walk-in Customer";
      const custPhone = inv.customer?.phone || "-";
      const custGstin = inv.customer?.gstin ? ` | GST: ${inv.customer.gstin}` : "";
      const shopName = inv.shop?.name || "-";
      const shopCode = inv.shop?.shopCode ? inv.shop.shopCode : "";
      const paymentMethod = inv.paymentMethod || "Cash";
      const rawStatus = inv.status || "Paid";
      const badge = statusBadge(rawStatus);
      const invNo = inv.invoiceNo || `INV-${inv.id}`;
      const totalAmt = `&#8377;${num(inv.totalAmount).toLocaleString("en-IN")}`;

      // ── Item rows ──────────────────────────────────────────────────────
      let itemRowsHtml = "";
      if (items.length === 0) {
        itemRowsHtml = `<tr><td colspan="12" style="padding:12px; text-align:center; font-size:10px; color:#94a3b8; font-style:italic;">No item details available for this metal filter.</td></tr>`;
      } else {
        itemRowsHtml = items
          .map((item: any, idx: number) => {
            const tag = item.tagNumber || `ITEM-${item.itemId || idx + 1}`;
            const returnBadge = item.isReturn
              ? `<span style="background-color:#fef3c7; color:#92400e; border:1px solid #fde68a; padding:1px 4px; border-radius:3px; font-size:8px; font-weight:700; margin-left:4px;">RETURN</span>`
              : "";
            const itemName = item.itemName || "Jewelry Item";
            const metal = item.metal || "Gold";
            const category = item.category ? ` (${item.category})` : "";
            const purity = item.gPurityId || item.purityPercent || "22K";
            const grossWt = formatWeight(item.grossWeight);
            const netWt = formatWeight(item.netWeight);
            const stoneWt = formatWeight(item.stoneWeight);
            const diamondWt = item.diamondCarat || item.diamondWeight
              ? formatWeight(item.diamondCarat || item.diamondWeight)
              : "0.000";
            const making = `&#8377;${num(item.makingCharges).toLocaleString("en-IN")}`;
            const discount = `&#8377;${num(item.discount).toLocaleString("en-IN")}`;
            const taxVal = num(item.igst) || (num(item.cgst) + num(item.sgst));
            const tax = `&#8377;${taxVal.toLocaleString("en-IN")}`;
            const totalPrice = `&#8377;${num(item.totalSalePrice).toLocaleString("en-IN")}`;
            const rowBg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";

            return `<tr style="background-color:${rowBg}; border-bottom:1px solid #f1f5f9;">
              <td style="padding:6px 10px; white-space:nowrap;">
                <span style="background-color:#e2e8f0; padding:2px 6px; border-radius:4px; font-family:monospace; font-size:10.5px; font-weight:600; color:#334155;">${tag}</span>${returnBadge}
              </td>
              <td style="padding:6px 10px; font-weight:600; color:#1e293b; font-size:10.5px;">${itemName}</td>
              <td style="padding:6px 10px; font-size:10.5px;">
                <span style="font-weight:600; color:#334155;">${metal}</span><span style="color:#94a3b8;">${category}</span>
              </td>
              <td style="padding:6px 10px;">
                <span style="background-color:#f1f5f9; padding:2px 6px; border-radius:4px; font-family:monospace; font-size:10px; color:#334155;">${purity}</span>
              </td>
              <td style="padding:6px 10px; text-align:right; font-size:10.5px; color:#334155;">${grossWt}</td>
              <td style="padding:6px 10px; text-align:right; font-size:10.5px; font-weight:700; color:#0f172a;">${netWt}</td>
              <td style="padding:6px 10px; text-align:right; font-size:10.5px; color:#475569;">${stoneWt}</td>
              <td style="padding:6px 10px; text-align:right; font-size:10.5px; color:#475569;">${diamondWt}</td>
              <td style="padding:6px 10px; text-align:right; font-size:10.5px; color:#475569;">${making}</td>
              <td style="padding:6px 10px; text-align:right; font-size:10.5px; font-weight:600; color:#e11d48;">${discount}</td>
              <td style="padding:6px 10px; text-align:right; font-size:10.5px; color:#475569;">${tax}</td>
              <td style="padding:6px 10px; text-align:right; font-size:11px; font-weight:800; color:#b08d28;">${totalPrice}</td>
            </tr>`;
          })
          .join("");
      }

      return `<div style="border:1px solid #e2e8f0; border-radius:8px; margin-bottom:10px; overflow:hidden; page-break-inside:avoid; break-inside:avoid;">

        <!-- Invoice accordion header -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc; border-bottom:1px solid #e2e8f0; border-collapse:collapse;">
          <tr>

            <!-- ▼ Invoice No + Status + Date -->
            <td style="padding:10px 12px; vertical-align:middle; width:27%; border-right:1px solid #e2e8f0;">
              <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td style="vertical-align:middle; padding-right:7px;">
                    <span style="display:inline-block; background-color:#ffffff; border:1px solid #e2e8f0; border-radius:5px; padding:3px 7px; font-size:10px; color:#e11d48; font-weight:bold; line-height:1;">&#9660;</span>
                  </td>
                  <td style="vertical-align:middle;">
                    <div style="margin-bottom:2px;">
                      <span style="font-family:monospace; font-weight:800; font-size:12.5px; color:#0f172a;">${invNo}</span>
                      &nbsp;
                      <span style="background-color:${badge.bg}; color:${badge.color}; border:1px solid ${badge.border}; padding:1px 8px; border-radius:10px; font-size:9.5px; font-weight:700;">${rawStatus}</span>
                    </div>
                    <div style="font-size:10px; color:#64748b;">${invDateStr}</div>
                  </td>
                </tr>
              </table>
            </td>

            <!-- 👤 Customer -->
            <td style="padding:10px 12px; vertical-align:middle; width:22%; border-right:1px solid #e2e8f0;">
              <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td style="vertical-align:top; padding-right:5px; padding-top:2px; line-height:0;">${personIcon}</td>
                  <td style="vertical-align:middle;">
                    <div style="font-weight:700; color:#1e293b; font-size:11px;">${custName}</div>
                    <div style="font-size:10px; color:#64748b;">${custPhone}${custGstin}</div>
                  </td>
                </tr>
              </table>
            </td>

            <!-- 🏪 Shop -->
            <td style="padding:10px 12px; vertical-align:middle; width:22%; border-right:1px solid #e2e8f0;">
              <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td style="vertical-align:top; padding-right:5px; padding-top:2px; line-height:0;">${storeIcon}</td>
                  <td style="vertical-align:middle;">
                    <div style="font-weight:600; color:#1e293b; font-size:11px;">${shopName}</div>
                    ${shopCode ? `<div style="font-size:9.5px; color:#64748b;">${shopCode}</div>` : ""}
                  </td>
                </tr>
              </table>
            </td>

            <!-- 💳 Payment -->
            <td style="padding:10px 12px; vertical-align:middle; width:10%; border-right:1px solid #e2e8f0;">
              <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td style="vertical-align:middle; padding-right:5px; line-height:0;">${cardIcon}</td>
                  <td style="vertical-align:middle; font-size:10.5px; color:#475569; font-weight:600;">${paymentMethod}</td>
                </tr>
              </table>
            </td>

            <!-- Items Count -->
            <td style="padding:10px 12px; vertical-align:middle; text-align:right; width:9%; border-right:2px solid #cbd5e1;">
              <div style="font-size:9px; color:#64748b; font-weight:500; margin-bottom:3px;">Items Count</div>
              <span style="background-color:#ffe4e6; color:#9f1239; border:1px solid #fecdd3; padding:2px 8px; border-radius:4px; font-size:10.5px; font-weight:700;">${items.length}&nbsp;${items.length === 1 ? "Item" : "Items"}</span>
            </td>

            <!-- Total Amount -->
            <td style="padding:10px 12px; vertical-align:middle; text-align:right; width:10%;">
              <div style="font-size:9px; color:#64748b; font-weight:500; margin-bottom:3px;">Total Amount</div>
              <div style="font-size:14px; font-weight:800; color:#b08d28;">${totalAmt}</div>
            </td>

          </tr>
        </table>

        <!-- Items sub-table -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; font-size:10.5px;">
          <thead>
            <tr style="background-color:#f1f5f9; border-bottom:1px solid #e2e8f0;">
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:left; white-space:nowrap;"># Tag / Code</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:left;">Item Name</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:left;">Metal / Category</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:left;">Purity</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:right; white-space:nowrap;">Gross Wt. (g)</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:right; white-space:nowrap;">Net Wt. (g)</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:right; white-space:nowrap;">Stone Wt.</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:right; white-space:nowrap;">Diamond Wt.</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:right; white-space:nowrap;">Making Chg. (&#8377;)</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:right; white-space:nowrap;">Discount (&#8377;)</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:right; white-space:nowrap;">Tax (&#8377;)</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:right; white-space:nowrap;">Total Price (&#8377;)</th>
            </tr>
          </thead>
          <tbody>
            ${itemRowsHtml}
          </tbody>
        </table>

      </div>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    @page { size: landscape; margin: 8mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, Roboto, sans-serif;
      margin: 0;
      padding: 10px;
      color: #0f172a;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-size: 11px;
    }
    table { border-collapse: collapse; }
    tr { break-inside: avoid; }
  </style>
</head>
<body>

  <!-- Report header -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom:2px solid #b08d28; margin-bottom:12px; padding-bottom:8px; border-collapse:collapse;">
    <tr>
      <td style="vertical-align:middle; width:30px; padding-right:10px; line-height:0;">${headerIconSvg}</td>
      <td style="vertical-align:middle;">
        <div style="font-size:19px; font-weight:800; color:#0f172a;">${title}</div>
        ${subtitle ? `<div style="font-size:10.5px; color:#64748b; margin-top:3px;">${subtitle}</div>` : ""}
      </td>
      <td style="vertical-align:bottom; text-align:right; white-space:nowrap;">
        <div style="font-size:9.5px; color:#94a3b8;">Printed on: ${printedAtStr}</div>
      </td>
    </tr>
  </table>

  <!-- Stat cards -->
  ${statsHtml}

  <!-- ── Invoice Accordion Cards ── -->
  ${invoicesHtml}

</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
};

/**
 * Opens a print-friendly window for the Purchase & Order Report.
 * Mirrors the UI accordion layout: per-order header row (order no, type badge, status badge,
 * date, customer, invoice ref, advance/balance, grand total) with an items sub-table beneath.
 */
export const printGroupedPurchaseReport = (
  title: string,
  subtitle: string,
  stats: StatCardItem[],
  orders: any[],
  selectedMetal: string = "ALL"
) => {
  if (!orders || orders.length === 0) {
    alert("No data available to print.");
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Popup window was blocked by browser. Please allow popups to print reports.");
    return;
  }

  const n = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
  const fw = (v: unknown) => formatWeight(v as string | number | null | undefined);
  const printedAtStr = format(new Date(), "dd MMM yyyy, hh:mm a");

  // Header icon — shopping bag style
  const headerIconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`;

  // Small inline icons
  const personIcon = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  const fileIcon = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>`;

  // Status badge helpers
  const orderTypeBadge = (isAdv: boolean) =>
    isAdv
      ? { bg: "#fef3c7", color: "#92400e", border: "#fde68a", label: "Advance" }
      : { bg: "#f1f5f9", color: "#334155", border: "#cbd5e1", label: "Regular" };

  const orderStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "pendingpayment" || s === "pending") return { bg: "#fef9c3", color: "#854d0e", border: "#fde047", label: status };
    if (s === "closed") return { bg: "#dcfce7", color: "#166534", border: "#bbf7d0", label: "Closed" };
    return { bg: "#f1f5f9", color: "#334155", border: "#cbd5e1", label: status || "—" };
  };

  // ── Stat Cards ──────────────────────────────────────────────────────────
  const statsCellsHtml = stats
    .map(
      (s) => `
      <td style="background-color:#ffffff; border:1px solid #e2e8f0; border-radius:10px; padding:10px 14px; vertical-align:middle; white-space:nowrap;">
        <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
          <tr>
            ${s.iconSvg
              ? `<td style="vertical-align:middle; padding-right:8px; line-height:0;">
                   <span style="display:inline-block; background-color:${s.bgColor || "#f8fafc"}; border-radius:8px; padding:7px; line-height:0;">${s.iconSvg}</span>
                 </td>`
              : ""}
            <td style="vertical-align:middle;">
              <div style="font-size:8.5px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:3px;">${s.label}</div>
              <div style="font-size:15px; font-weight:800; color:${s.textColor || "#0f172a"};">${s.value}</div>
            </td>
          </tr>
        </table>
      </td>`
    )
    .join("");

  const statsHtml = statsCellsHtml
    ? `<table width="100%" cellpadding="0" cellspacing="8" border="0" style="margin-bottom:16px;"><tr>${statsCellsHtml}</tr></table>`
    : "";

  // ── Order Cards ──────────────────────────────────────────────────────────
  const ordersHtml = orders
    .map((order: any) => {
      const items = (order.cartItems || []).filter((item: any) => {
        if (selectedMetal === "ALL") return true;
        return item.metal?.toUpperCase() === selectedMetal.toUpperCase();
      });

      const orderDateStr = order.createdAt
        ? format(new Date(order.createdAt), "dd MMM yyyy, hh:mm a")
        : "-";
      const orderNo = order.orderNo || `ORD-${order.id}`;
      const custName = order.customer?.name || "Guest Customer";
      const custPhone = order.customer?.phone || "-";
      const invoiceNo = order.invoice?.invoiceNo || (order.invoiceId ? `INV-${order.invoiceId}` : "Not Invoiced");
      const grandTotal = `&#8377;${n(order.grandTotal).toLocaleString("en-IN")}`;
      const advAmt = n(order.advanceAmount);
      const balAmt = n(order.balanceAmount);
      const isAdv = !!order.isAdvanceOrder;

      const typB = orderTypeBadge(isAdv);
      const statB = orderStatusBadge(order.status || "");

      // ── Item rows ────────────────────────────────────────────────────────
      let itemRowsHtml = "";
      if (items.length === 0) {
        itemRowsHtml = `<tr><td colspan="13" style="padding:12px; text-align:center; font-size:10px; color:#94a3b8; font-style:italic;">No cart items in this order.</td></tr>`;
      } else {
        itemRowsHtml = items
          .map((item: any, idx: number) => {
            const tag = item.tagNumber || `ITEM-${item.itemId || idx + 1}`;
            const itemName = item.itemName || "Jewelry Item";
            const metal = item.metal || "Gold";
            const category = item.category ? ` (${item.category})` : "";
            const purity = item.gPurityId || item.purityPercent || "22K";
            const qty = item.quantity || 1;
            const grossWt = fw(item.grossWeight);
            const netWt = fw(item.netWeight);
            const stoneWt = fw(item.stoneWeight);
            const diamondWt = item.diamondCarat || item.diamondWeight
              ? fw(item.diamondCarat || item.diamondWeight)
              : "0.000";
            const making = `&#8377;${n(item.itemCostDetails?.makingCharges).toLocaleString("en-IN")}`;
            const discount = `&#8377;${n(item.itemCostDetails?.discount).toLocaleString("en-IN")}`;
            const taxVal = n(item.itemCostDetails?.igst) || (n(item.itemCostDetails?.cgst) + n(item.itemCostDetails?.sgst));
            const tax = `&#8377;${taxVal.toLocaleString("en-IN")}`;
            const itemPrice = `&#8377;${n(item.itemCostDetails?.totalSalePrice).toLocaleString("en-IN")}`;
            const rowBg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";

            return `<tr style="background-color:${rowBg}; border-bottom:1px solid #f1f5f9;">
              <td style="padding:6px 10px; white-space:nowrap;">
                <span style="background-color:#e2e8f0; padding:2px 6px; border-radius:4px; font-family:monospace; font-size:10px; font-weight:600; color:#334155;">${tag}</span>
              </td>
              <td style="padding:6px 10px; font-weight:600; color:#1e293b; font-size:10.5px;">${itemName}</td>
              <td style="padding:6px 10px; font-size:10.5px;">
                <span style="font-weight:600; color:#334155;">${metal}</span><span style="color:#94a3b8;">${category}</span>
              </td>
              <td style="padding:6px 10px;">
                <span style="background-color:#f1f5f9; padding:2px 6px; border-radius:4px; font-family:monospace; font-size:10px; color:#334155;">${purity}</span>
              </td>
              <td style="padding:6px 10px; text-align:center; font-weight:600; color:#334155; font-size:10.5px;">${qty}</td>
              <td style="padding:6px 10px; text-align:right; font-size:10.5px; color:#334155;">${grossWt}</td>
              <td style="padding:6px 10px; text-align:right; font-size:10.5px; font-weight:700; color:#0f172a;">${netWt}</td>
              <td style="padding:6px 10px; text-align:right; font-size:10.5px; color:#475569;">${stoneWt}</td>
              <td style="padding:6px 10px; text-align:right; font-size:10.5px; color:#475569;">${diamondWt}</td>
              <td style="padding:6px 10px; text-align:right; font-size:10.5px; color:#475569;">${making}</td>
              <td style="padding:6px 10px; text-align:right; font-size:10.5px; font-weight:600; color:#e11d48;">${discount}</td>
              <td style="padding:6px 10px; text-align:right; font-size:10.5px; color:#475569;">${tax}</td>
              <td style="padding:6px 10px; text-align:right; font-size:11px; font-weight:800; color:#b08d28;">${itemPrice}</td>
            </tr>`;
          })
          .join("");
      }

      return `<div style="border:1px solid #e2e8f0; border-radius:8px; margin-bottom:10px; overflow:hidden; page-break-inside:avoid; break-inside:avoid;">

        <!-- Order accordion header -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc; border-bottom:1px solid #e2e8f0; border-collapse:collapse;">
          <tr>

            <!-- ▼ Order No + Type badge + Status badge + Date -->
            <td style="padding:10px 12px; vertical-align:middle; width:28%; border-right:1px solid #e2e8f0;">
              <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td style="vertical-align:middle; padding-right:7px;">
                    <span style="display:inline-block; background-color:#ffffff; border:1px solid #e2e8f0; border-radius:5px; padding:3px 7px; font-size:10px; color:#d97706; font-weight:bold; line-height:1;">&#9660;</span>
                  </td>
                  <td style="vertical-align:middle;">
                    <div style="margin-bottom:3px;">
                      <span style="font-family:monospace; font-weight:800; font-size:12.5px; color:#0f172a;">${orderNo}</span>
                      &nbsp;
                      <span style="background-color:${typB.bg}; color:${typB.color}; border:1px solid ${typB.border}; padding:1px 7px; border-radius:10px; font-size:9px; font-weight:700;">${typB.label}</span>
                      &nbsp;
                      <span style="background-color:${statB.bg}; color:${statB.color}; border:1px solid ${statB.border}; padding:1px 7px; border-radius:10px; font-size:9px; font-weight:700;">${statB.label}</span>
                    </div>
                    <div style="font-size:10px; color:#64748b;">${orderDateStr}</div>
                  </td>
                </tr>
              </table>
            </td>

            <!-- 👤 Customer -->
            <td style="padding:10px 12px; vertical-align:middle; width:22%; border-right:1px solid #e2e8f0;">
              <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td style="vertical-align:top; padding-right:5px; padding-top:2px; line-height:0;">${personIcon}</td>
                  <td style="vertical-align:middle;">
                    <div style="font-weight:700; color:#1e293b; font-size:11px;">${custName}</div>
                    <div style="font-size:10px; color:#64748b;">${custPhone}</div>
                  </td>
                </tr>
              </table>
            </td>

            <!-- 📄 Invoice Ref -->
            <td style="padding:10px 12px; vertical-align:middle; width:20%; border-right:1px solid #e2e8f0;">
              <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td style="vertical-align:top; padding-right:5px; padding-top:2px; line-height:0;">${fileIcon}</td>
                  <td style="vertical-align:middle;">
                    <div style="font-size:9px; color:#64748b; font-weight:500; margin-bottom:1px;">Invoice</div>
                    <div style="font-family:monospace; font-weight:700; color:#1e293b; font-size:10.5px;">${invoiceNo}</div>
                  </td>
                </tr>
              </table>
            </td>

            <!-- Advance / Balance (only for advance orders) -->
            ${isAdv ? `
            <td style="padding:10px 12px; vertical-align:middle; text-align:right; width:12%; border-right:1px solid #e2e8f0;">
              <div style="font-size:9px; color:#64748b; font-weight:500; margin-bottom:2px;">Adv / Bal</div>
              <div style="font-size:10.5px; font-weight:700; color:#1d4ed8;">Adv: &#8377;${advAmt.toLocaleString("en-IN")}</div>
              <div style="font-size:10.5px; font-weight:700; color:#c2410c;">Bal: &#8377;${balAmt.toLocaleString("en-IN")}</div>
            </td>` : `<td style="width:12%; border-right:1px solid #e2e8f0;"></td>`}

            <!-- Items Count -->
            <td style="padding:10px 12px; vertical-align:middle; text-align:right; width:8%; border-right:2px solid #cbd5e1;">
              <div style="font-size:9px; color:#64748b; font-weight:500; margin-bottom:3px;">Items</div>
              <span style="background-color:#ffe4e6; color:#9f1239; border:1px solid #fecdd3; padding:2px 8px; border-radius:4px; font-size:10.5px; font-weight:700;">${items.length}&nbsp;${items.length === 1 ? "Item" : "Items"}</span>
            </td>

            <!-- Grand Total -->
            <td style="padding:10px 12px; vertical-align:middle; text-align:right; width:10%;">
              <div style="font-size:9px; color:#64748b; font-weight:500; margin-bottom:3px;">Total Amount</div>
              <div style="font-size:14px; font-weight:800; color:#059669;">${grandTotal}</div>
            </td>

          </tr>
        </table>

        <!-- Items sub-table -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; font-size:10.5px;">
          <thead>
            <tr style="background-color:#f1f5f9; border-bottom:1px solid #e2e8f0;">
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:left; white-space:nowrap;"># Tag / Code</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:left;">Item Name</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:left;">Metal / Category</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:left;">Purity</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:center;">Qty</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:right; white-space:nowrap;">Gross Wt. (g)</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:right; white-space:nowrap;">Net Wt. (g)</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:right; white-space:nowrap;">Stone Wt.</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:right; white-space:nowrap;">Diamond Wt.</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:right; white-space:nowrap;">Making Chg. (&#8377;)</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:right; white-space:nowrap;">Discount (&#8377;)</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:right; white-space:nowrap;">Tax (&#8377;)</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:right; white-space:nowrap;">Total Price (&#8377;)</th>
            </tr>
          </thead>
          <tbody>
            ${itemRowsHtml}
          </tbody>
        </table>

      </div>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    @page { size: landscape; margin: 8mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, Roboto, sans-serif;
      margin: 0;
      padding: 10px;
      color: #0f172a;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-size: 11px;
    }
    table { border-collapse: collapse; }
    tr { break-inside: avoid; }
  </style>
</head>
<body>

  <!-- Report header -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom:2px solid #d97706; margin-bottom:12px; padding-bottom:8px; border-collapse:collapse;">
    <tr>
      <td style="vertical-align:middle; width:30px; padding-right:10px; line-height:0;">${headerIconSvg}</td>
      <td style="vertical-align:middle;">
        <div style="font-size:19px; font-weight:800; color:#0f172a;">${title}</div>
        ${subtitle ? `<div style="font-size:10.5px; color:#64748b; margin-top:3px;">${subtitle}</div>` : ""}
      </td>
      <td style="vertical-align:bottom; text-align:right; white-space:nowrap;">
        <div style="font-size:9.5px; color:#94a3b8;">Printed on: ${printedAtStr}</div>
      </td>
    </tr>
  </table>

  <!-- Stat cards -->
  ${statsHtml}

  <!-- Order accordion cards -->
  ${ordersHtml}

</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 300);
};

/**
 * Shared accordion-style PDF printer for Stock Transfer reports.
 * Used by both ReceivedReport ("Received By" / emerald) and TransferReport ("Porter" / indigo).
 *
 * @param title          - Window/page title
 * @param subtitle       - Filter summary line shown under the title
 * @param stats          - Stat card items for the summary row
 * @param transfers      - Normalised transfer records (must have .items[], .totalItems, .totalGrossWeight)
 * @param selectedMetal  - Metal filter already applied on screen
 * @param accentColor    - Hex accent for status badge & chevron icon (e.g. "#059669" = emerald, "#4f46e5" = indigo)
 * @param thirdColLabel  - Label for the third info column ("Received By" | "Porter")
 * @param thirdColKey    - Key on the transfer object for that value ("receivedByUserName" | "porter.name")
 */
export const printGroupedTransferReport = (
  title: string,
  subtitle: string,
  stats: StatCardItem[],
  transfers: any[],
  selectedMetal: string = "ALL",
  accentColor: string = "#059669",
  thirdColLabel: string = "Received By",
  thirdColKey: string = "receivedByUserName"
) => {
  if (!transfers || transfers.length === 0) {
    alert("No data available to print.");
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Popup window was blocked by browser. Please allow popups to print reports.");
    return;
  }

  const n = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
  const fw = (v: unknown) => formatWeight(v as string | number | null | undefined);
  const printedAtStr = format(new Date(), "dd MMM yyyy, hh:mm a");

  // Header icon — arrows/transfer style
  const headerIconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${accentColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>`;

  // Small inline icons
  const storeIcon = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/></svg>`;

  const personIcon = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

  // Status badge colour helper
  const statusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s.includes("received") || s.includes("completed") || s.includes("closed"))
      return { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" };
    if (s.includes("pending"))
      return { bg: "#fef9c3", color: "#854d0e", border: "#fde047" };
    if (s.includes("reject") || s.includes("cancel"))
      return { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" };
    // default — use accent lightly
    return { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0" };
  };

  // ── Stat Cards ──────────────────────────────────────────────────────────
  const statsCellsHtml = stats
    .map(
      (s) => `
      <td style="background-color:#ffffff; border:1px solid #e2e8f0; border-radius:10px; padding:10px 14px; vertical-align:middle; white-space:nowrap;">
        <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
          <tr>
            ${s.iconSvg
              ? `<td style="vertical-align:middle; padding-right:8px; line-height:0;">
                   <span style="display:inline-block; background-color:${s.bgColor || "#f8fafc"}; border-radius:8px; padding:7px; line-height:0;">${s.iconSvg}</span>
                 </td>`
              : ""}
            <td style="vertical-align:middle;">
              <div style="font-size:8.5px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:3px;">${s.label}</div>
              <div style="font-size:15px; font-weight:800; color:${s.textColor || "#0f172a"};">${s.value}</div>
            </td>
          </tr>
        </table>
      </td>`
    )
    .join("");

  const statsHtml = statsCellsHtml
    ? `<table width="100%" cellpadding="0" cellspacing="8" border="0" style="margin-bottom:16px;"><tr>${statsCellsHtml}</tr></table>`
    : "";

  // ── Transfer Cards ───────────────────────────────────────────────────────
  const transfersHtml = transfers
    .map((t: any) => {
      const items = (t.items || []).filter((item: any) => {
        if (selectedMetal === "ALL") return true;
        const metal = item.metal || item.stockEntry?.metal;
        return metal?.toUpperCase() === selectedMetal.toUpperCase();
      });

      const rawDate = t.receivedDate || t.transferDate || t.createDate;
      const dateStr = rawDate ? format(new Date(rawDate), "dd MMM yyyy, hh:mm a") : "-";
      const transferNo = t.transferNumber || `TRF-${t.id}`;
      const challanNo = t.challanNumber ? ` · Challan: ${t.challanNumber}` : "";
      const sourceShop = t.sourceShop?.name || `Shop #${t.sourceShopId}`;
      const destShop = t.destinationShop?.name || `Shop #${t.destinationShopId}`;
      // third column value
      const thirdVal =
        thirdColKey === "porter.name"
          ? t.porter?.name || "-"
          : t[thirdColKey] || "-";

      const sb = statusBadge(t.status || "");

      // ── Item rows ─────────────────────────────────────────────────────
      let itemRowsHtml = "";
      if (items.length === 0) {
        itemRowsHtml = `<tr><td colspan="9" style="padding:12px; text-align:center; font-size:10px; color:#94a3b8; font-style:italic;">No items in this transfer record.</td></tr>`;
      } else {
        itemRowsHtml = items
          .map((item: any, idx: number) => {
            const tag = item.tagNumber || item.stockEntry?.tagNumber || `ITEM-${item.stockEntryId || item.id || idx + 1}`;
            const name = item.itemName || item.stockEntry?.itemName || "Jewelry Item";
            const metal = item.metal || item.stockEntry?.metal || "Gold";
            const cat = item.category || item.stockEntry?.category;
            const catStr = cat && cat !== "-" ? ` (${cat})` : "";
            const purity = item.caratOrKT || item.stockEntry?.caratOrKT || "22K";
            const qty = item.quantity || 1;
            const grossWt = fw(n(item.grossWeight || item.stockEntry?.grossWeight));
            const netWt = fw(n(item.netWeight || item.stockEntry?.netWeight));
            const stoneWt = fw(n(item.stoneWeight || item.stockEntry?.stoneWeight));
            const diamondWt = fw(n(item.diamondWeight || item.stockEntry?.diamondWeight));
            const rowBg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";

            return `<tr style="background-color:${rowBg}; border-bottom:1px solid #f1f5f9;">
              <td style="padding:6px 10px; white-space:nowrap;">
                <span style="background-color:#e2e8f0; padding:2px 6px; border-radius:4px; font-family:monospace; font-size:10px; font-weight:600; color:#334155;">${tag}</span>
              </td>
              <td style="padding:6px 10px; font-weight:600; color:#1e293b; font-size:10.5px;">${name}</td>
              <td style="padding:6px 10px; font-size:10.5px;">
                <span style="font-weight:600; color:#334155;">${metal}</span><span style="color:#94a3b8;">${catStr}</span>
              </td>
              <td style="padding:6px 10px;">
                <span style="background-color:#f1f5f9; padding:2px 6px; border-radius:4px; font-family:monospace; font-size:10px; color:#334155;">${purity}</span>
              </td>
              <td style="padding:6px 10px; text-align:center; font-weight:600; color:#334155; font-size:10.5px;">${qty}</td>
              <td style="padding:6px 10px; text-align:right; font-size:10.5px; color:#334155;">${grossWt}</td>
              <td style="padding:6px 10px; text-align:right; font-size:10.5px; font-weight:700; color:#0f172a;">${netWt}</td>
              <td style="padding:6px 10px; text-align:right; font-size:10.5px; color:#475569;">${stoneWt}</td>
              <td style="padding:6px 10px; text-align:right; font-size:10.5px; color:#475569;">${diamondWt}</td>
            </tr>`;
          })
          .join("");
      }

      return `<div style="border:1px solid #e2e8f0; border-radius:8px; margin-bottom:10px; overflow:hidden; page-break-inside:avoid; break-inside:avoid;">

        <!-- Transfer accordion header -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc; border-bottom:1px solid #e2e8f0; border-collapse:collapse;">
          <tr>

            <!-- ▼ Transfer No + Status + Date -->
            <td style="padding:10px 12px; vertical-align:middle; width:28%; border-right:1px solid #e2e8f0;">
              <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td style="vertical-align:middle; padding-right:7px;">
                    <span style="display:inline-block; background-color:#ffffff; border:1px solid #e2e8f0; border-radius:5px; padding:3px 7px; font-size:10px; color:${accentColor}; font-weight:bold; line-height:1;">&#9660;</span>
                  </td>
                  <td style="vertical-align:middle;">
                    <div style="margin-bottom:3px;">
                      <span style="font-family:monospace; font-weight:800; font-size:12.5px; color:#0f172a;">${transferNo}</span>
                      &nbsp;
                      <span style="background-color:${sb.bg}; color:${sb.color}; border:1px solid ${sb.border}; padding:1px 7px; border-radius:10px; font-size:9px; font-weight:700;">${t.status || "Completed"}</span>
                    </div>
                    <div style="font-size:9.5px; color:#64748b;">${dateStr}${challanNo}</div>
                  </td>
                </tr>
              </table>
            </td>

            <!-- 🏪 Source → Dest -->
            <td style="padding:10px 12px; vertical-align:middle; width:30%; border-right:1px solid #e2e8f0;">
              <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td style="vertical-align:top; padding-right:5px; padding-top:2px; line-height:0;">${storeIcon}</td>
                  <td style="vertical-align:middle; font-size:11px;">
                    <span style="font-weight:700; color:#1e293b;">${sourceShop}</span>
                    <span style="color:#94a3b8; margin:0 5px;">&#10132;</span>
                    <span style="font-weight:700; color:${accentColor};">${destShop}</span>
                  </td>
                </tr>
              </table>
            </td>

            <!-- 👤 Received By / Porter -->
            <td style="padding:10px 12px; vertical-align:middle; width:22%; border-right:1px solid #e2e8f0;">
              <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td style="vertical-align:top; padding-right:5px; padding-top:2px; line-height:0;">${personIcon}</td>
                  <td style="vertical-align:middle;">
                    <div style="font-size:9px; color:#64748b; font-weight:500; margin-bottom:1px;">${thirdColLabel}</div>
                    <div style="font-weight:700; color:#1e293b; font-size:11px;">${thirdVal}</div>
                  </td>
                </tr>
              </table>
            </td>

            <!-- Items / Weight summary -->
            <td style="padding:10px 12px; vertical-align:middle; text-align:right; width:20%;">
              <div style="font-size:9px; color:#64748b; font-weight:500; margin-bottom:3px;">Items / Weight</div>
              <div style="font-size:13px; font-weight:800; color:${accentColor};">${items.length}&nbsp;Items</div>
              <div style="font-size:10px; font-weight:600; color:#475569;">${fw(t.totalGrossWeight)}&nbsp;g</div>
            </td>

          </tr>
        </table>

        <!-- Items sub-table -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; font-size:10.5px;">
          <thead>
            <tr style="background-color:#f1f5f9; border-bottom:1px solid #e2e8f0;">
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:left; white-space:nowrap;"># Product Code</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:left;">Product Name</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:left;">Metal / Category</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:left;">Kt.</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:center;">Qty</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:right; white-space:nowrap;">Gross Wt. (g)</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:right; white-space:nowrap;">Net Wt. (g)</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:right; white-space:nowrap;">Stone Wt.</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:right; white-space:nowrap;">Diamond Wt.</th>
            </tr>
          </thead>
          <tbody>
            ${itemRowsHtml}
          </tbody>
        </table>

      </div>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    @page { size: landscape; margin: 8mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, Roboto, sans-serif;
      margin: 0;
      padding: 10px;
      color: #0f172a;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-size: 11px;
    }
    table { border-collapse: collapse; }
    tr { break-inside: avoid; }
  </style>
</head>
<body>

  <!-- Report header -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom:2px solid ${accentColor}; margin-bottom:12px; padding-bottom:8px; border-collapse:collapse;">
    <tr>
      <td style="vertical-align:middle; width:30px; padding-right:10px; line-height:0;">${headerIconSvg}</td>
      <td style="vertical-align:middle;">
        <div style="font-size:19px; font-weight:800; color:#0f172a;">${title}</div>
        ${subtitle ? `<div style="font-size:10.5px; color:#64748b; margin-top:3px;">${subtitle}</div>` : ""}
      </td>
      <td style="vertical-align:bottom; text-align:right; white-space:nowrap;">
        <div style="font-size:9.5px; color:#94a3b8;">Printed on: ${printedAtStr}</div>
      </td>
    </tr>
  </table>

  <!-- Stat cards -->
  ${statsHtml}

  <!-- Transfer accordion cards -->
  ${transfersHtml}

</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 300);
};

/**
 * Accordion-style PDF printer for Return Report.
 * Cyan accent (#0e7490). Header: Return #ID + status badge + date | 👤 Customer | 📄 Invoice | Total Return Value.
 * Items sub-table: Tag/Code | Item Name | Metal/Category | Purity | Qty | Gross Wt | Net Wt | Stone Wt | Diamond Wt | Making Chg | Discount (red) | Return Price (cyan).
 */
export const printGroupedReturnReport = (
  title: string,
  subtitle: string,
  stats: StatCardItem[],
  returns: any[],
  selectedMetal: string = "ALL"
) => {
  if (!returns || returns.length === 0) {
    alert("No data available to print.");
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Popup window was blocked by browser. Please allow popups to print reports.");
    return;
  }

  const n = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
  const fw = (v: unknown) => formatWeight(v as string | number | null | undefined);
  const printedAtStr = format(new Date(), "dd MMM yyyy, hh:mm a");
  const accent = "#0e7490"; // cyan-700

  // Header icon — rotate-ccw / return style
  const headerIconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`;

  // Small inline icons
  const personIcon = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  const fileIcon  = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>`;

  // Status badge
  const statusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s.includes("complet") || s.includes("approved")) return { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" };
    if (s.includes("pending")) return { bg: "#fef9c3", color: "#854d0e", border: "#fde047" };
    if (s.includes("reject") || s.includes("cancel")) return { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" };
    return { bg: "#cffafe", color: "#155e75", border: "#a5f3fc" }; // default cyan
  };

  // ── Stat Cards ──────────────────────────────────────────────────────────
  const statsCellsHtml = stats
    .map(s => `
      <td style="background-color:#ffffff; border:1px solid #e2e8f0; border-radius:10px; padding:10px 14px; vertical-align:middle; white-space:nowrap;">
        <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr>
          ${s.iconSvg
            ? `<td style="vertical-align:middle; padding-right:8px; line-height:0;"><span style="display:inline-block; background-color:${s.bgColor || "#f8fafc"}; border-radius:8px; padding:7px; line-height:0;">${s.iconSvg}</span></td>`
            : ""}
          <td style="vertical-align:middle;">
            <div style="font-size:8.5px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:3px;">${s.label}</div>
            <div style="font-size:15px; font-weight:800; color:${s.textColor || "#0f172a"};">${s.value}</div>
          </td>
        </tr></table>
      </td>`)
    .join("");

  const statsHtml = statsCellsHtml
    ? `<table width="100%" cellpadding="0" cellspacing="8" border="0" style="margin-bottom:16px;"><tr>${statsCellsHtml}</tr></table>`
    : "";

  // ── Return Cards ─────────────────────────────────────────────────────────
  const returnsHtml = returns
    .map((ret: any) => {
      const items = (ret.items || []).filter((item: any) => {
        if (selectedMetal === "ALL") return true;
        return item.metal?.toUpperCase() === selectedMetal.toUpperCase();
      });

      const rawDate = ret.returnDate || ret.createDate;
      const dateStr = rawDate ? format(new Date(rawDate), "dd MMM yyyy, hh:mm a") : "-";
      const returnId = `Return #${ret.id}`;
      const custName = ret.customer?.name || ret.customerName || "Guest Customer";
      const custPhone = ret.customer?.phone || ret.customerPhone || "-";
      const invoiceNo = ret.invoiceNo || ret.invoice?.invoiceNo || (ret.invoiceId ? `INV-${ret.invoiceId}` : "-");
      const totalReturn = `&#8377;${n(ret.totalReturnAmount).toLocaleString("en-IN")}`;
      const sb = statusBadge(ret.status || "");

      // ── Item rows ────────────────────────────────────────────────────────
      let itemRowsHtml = "";
      if (items.length === 0) {
        itemRowsHtml = `<tr><td colspan="12" style="padding:12px; text-align:center; font-size:10px; color:#94a3b8; font-style:italic;">No returned item details.</td></tr>`;
      } else {
        itemRowsHtml = items
          .map((item: any, idx: number) => {
            const tag = item.tagNumber || `ITEM-${item.itemId || idx + 1}`;
            const name = item.itemName || "Jewelry Item";
            const metal = item.metal || "Gold";
            const cat = item.category ? ` (${item.category})` : "";
            const purity = item.gPurityId || item.purityPercent || "22K";
            const qty = item.quantity || 1;
            const grossWt = fw(item.grossWeight);
            const netWt = fw(item.netWeight);
            const stoneWt = fw(item.stoneWeight);
            const diamondWt = fw(item.diamondWeight || item.diamondCarat);
            const making = `&#8377;${n(item.makingCharges).toLocaleString("en-IN")}`;
            const discount = `&#8377;${n(item.discount).toLocaleString("en-IN")}`;
            const returnPrice = `&#8377;${n(item.totalReturnPrice || item.totalSalePrice || item.price).toLocaleString("en-IN")}`;
            const rowBg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";

            return `<tr style="background-color:${rowBg}; border-bottom:1px solid #f1f5f9;">
              <td style="padding:6px 10px; white-space:nowrap;">
                <span style="background-color:#e2e8f0; padding:2px 6px; border-radius:4px; font-family:monospace; font-size:10px; font-weight:600; color:#334155;">${tag}</span>
              </td>
              <td style="padding:6px 10px; font-weight:600; color:#1e293b; font-size:10.5px;">${name}</td>
              <td style="padding:6px 10px; font-size:10.5px;">
                <span style="font-weight:600; color:#334155;">${metal}</span><span style="color:#94a3b8;">${cat}</span>
              </td>
              <td style="padding:6px 10px;">
                <span style="background-color:#f1f5f9; padding:2px 6px; border-radius:4px; font-family:monospace; font-size:10px; color:#334155;">${purity}</span>
              </td>
              <td style="padding:6px 10px; text-align:center; font-weight:600; color:#334155; font-size:10.5px;">${qty}</td>
              <td style="padding:6px 10px; text-align:right; font-size:10.5px; color:#334155;">${grossWt}</td>
              <td style="padding:6px 10px; text-align:right; font-size:10.5px; font-weight:700; color:#0f172a;">${netWt}</td>
              <td style="padding:6px 10px; text-align:right; font-size:10.5px; color:#475569;">${stoneWt}</td>
              <td style="padding:6px 10px; text-align:right; font-size:10.5px; color:#475569;">${diamondWt}</td>
              <td style="padding:6px 10px; text-align:right; font-size:10.5px; color:#475569;">${making}</td>
              <td style="padding:6px 10px; text-align:right; font-size:10.5px; font-weight:600; color:#e11d48;">${discount}</td>
              <td style="padding:6px 10px; text-align:right; font-size:11px; font-weight:800; color:${accent};">${returnPrice}</td>
            </tr>`;
          })
          .join("");
      }

      return `<div style="border:1px solid #e2e8f0; border-radius:8px; margin-bottom:10px; overflow:hidden; page-break-inside:avoid; break-inside:avoid;">

        <!-- Return accordion header -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc; border-bottom:1px solid #e2e8f0; border-collapse:collapse;">
          <tr>

            <!-- ▼ Return #ID + Status + Date -->
            <td style="padding:10px 12px; vertical-align:middle; width:26%; border-right:1px solid #e2e8f0;">
              <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr>
                <td style="vertical-align:middle; padding-right:7px;">
                  <span style="display:inline-block; background-color:#ffffff; border:1px solid #e2e8f0; border-radius:5px; padding:3px 7px; font-size:10px; color:${accent}; font-weight:bold; line-height:1;">&#9660;</span>
                </td>
                <td style="vertical-align:middle;">
                  <div style="margin-bottom:3px;">
                    <span style="font-family:monospace; font-weight:800; font-size:12.5px; color:#0f172a;">${returnId}</span>
                    &nbsp;
                    <span style="background-color:${sb.bg}; color:${sb.color}; border:1px solid ${sb.border}; padding:1px 7px; border-radius:10px; font-size:9px; font-weight:700;">${ret.status || "Completed"}</span>
                  </div>
                  <div style="font-size:10px; color:#64748b;">${dateStr}</div>
                </td>
              </tr></table>
            </td>

            <!-- 👤 Customer -->
            <td style="padding:10px 12px; vertical-align:middle; width:24%; border-right:1px solid #e2e8f0;">
              <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr>
                <td style="vertical-align:top; padding-right:5px; padding-top:2px; line-height:0;">${personIcon}</td>
                <td style="vertical-align:middle;">
                  <div style="font-weight:700; color:#1e293b; font-size:11px;">${custName}</div>
                  <div style="font-size:10px; color:#64748b;">${custPhone}</div>
                </td>
              </tr></table>
            </td>

            <!-- 📄 Invoice Reference -->
            <td style="padding:10px 12px; vertical-align:middle; width:24%; border-right:1px solid #e2e8f0;">
              <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr>
                <td style="vertical-align:top; padding-right:5px; padding-top:2px; line-height:0;">${fileIcon}</td>
                <td style="vertical-align:middle;">
                  <div style="font-size:9px; color:#64748b; font-weight:500; margin-bottom:1px;">Invoice</div>
                  <div style="font-family:monospace; font-weight:700; color:#1e293b; font-size:10.5px;">${invoiceNo}</div>
                </td>
              </tr></table>
            </td>

            <!-- Items Count -->
            <td style="padding:10px 12px; vertical-align:middle; text-align:right; width:10%; border-right:2px solid #cbd5e1;">
              <div style="font-size:9px; color:#64748b; font-weight:500; margin-bottom:3px;">Items</div>
              <span style="background-color:#ffe4e6; color:#9f1239; border:1px solid #fecdd3; padding:2px 8px; border-radius:4px; font-size:10.5px; font-weight:700;">${items.length}&nbsp;${items.length === 1 ? "Item" : "Items"}</span>
            </td>

            <!-- Total Return Value -->
            <td style="padding:10px 12px; vertical-align:middle; text-align:right; width:16%;">
              <div style="font-size:9px; color:#64748b; font-weight:500; margin-bottom:3px;">Total Return Value</div>
              <div style="font-size:14px; font-weight:800; color:${accent};">${totalReturn}</div>
            </td>

          </tr>
        </table>

        <!-- Items sub-table -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; font-size:10.5px;">
          <thead>
            <tr style="background-color:#f1f5f9; border-bottom:1px solid #e2e8f0;">
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:left; white-space:nowrap;"># Tag / Code</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:left;">Item Name</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:left;">Metal / Category</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:left;">Purity</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:center;">Qty</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:right; white-space:nowrap;">Gross Wt. (g)</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:right; white-space:nowrap;">Net Wt. (g)</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:right; white-space:nowrap;">Stone Wt.</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:right; white-space:nowrap;">Diamond Wt.</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:right; white-space:nowrap;">Making Chg. (&#8377;)</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:#64748b; text-align:right; white-space:nowrap;">Discount (&#8377;)</th>
              <th style="padding:7px 10px; font-size:10px; font-weight:700; color:${accent}; text-align:right; white-space:nowrap;">Return Price (&#8377;)</th>
            </tr>
          </thead>
          <tbody>
            ${itemRowsHtml}
          </tbody>
        </table>

      </div>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    @page { size: landscape; margin: 8mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, Roboto, sans-serif;
      margin: 0;
      padding: 10px;
      color: #0f172a;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-size: 11px;
    }
    table { border-collapse: collapse; }
    tr { break-inside: avoid; }
  </style>
</head>
<body>

  <!-- Report header -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom:2px solid ${accent}; margin-bottom:12px; padding-bottom:8px; border-collapse:collapse;">
    <tr>
      <td style="vertical-align:middle; width:30px; padding-right:10px; line-height:0;">${headerIconSvg}</td>
      <td style="vertical-align:middle;">
        <div style="font-size:19px; font-weight:800; color:#0f172a;">${title}</div>
        ${subtitle ? `<div style="font-size:10.5px; color:#64748b; margin-top:3px;">${subtitle}</div>` : ""}
      </td>
      <td style="vertical-align:bottom; text-align:right; white-space:nowrap;">
        <div style="font-size:9.5px; color:#94a3b8;">Printed on: ${printedAtStr}</div>
      </td>
    </tr>
  </table>

  <!-- Stat cards -->
  ${statsHtml}

  <!-- Return accordion cards -->
  ${returnsHtml}

</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 300);
};
