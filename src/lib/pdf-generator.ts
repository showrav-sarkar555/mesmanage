// ─── Client-Side PDF Report Generator ───────────────────────────────────────
// Redesigned to match the messmanager.app reference PDF style:
// Coral/red headers, plain text summary, tabular data sections, watermark, footer

import type { MonthCycle, Member, MemberSummary } from './types';
import { calcMonthSummary } from './calculations';
import { formatCurrency } from './utils';

export async function generateMonthlyPDF(
  month: MonthCycle,
  members: Member[],
  messName = 'Castle Black'
) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const summary = calcMonthSummary(month, members);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = 20;

  // ── Colors ─────────────────────────────────────────────
  const coralRed: [number, number, number] = [229, 83, 83]; // #E55353
  const darkText: [number, number, number] = [30, 30, 30];
  const mutedText: [number, number, number] = [120, 120, 120];
  const headerBg: [number, number, number] = [245, 245, 245];

  // ── Helper: Add watermark to current page ─────────────
  const addWatermark = () => {
    doc.saveGraphicsState();
    // @ts-expect-error: jsPDF internal API for setting transparency
    doc.setGState(new doc.GState({ opacity: 0.06 }));
    doc.setFontSize(60);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(200, 200, 200);
    // Diagonal watermark
    const cx = pageWidth / 2;
    const cy = pageHeight / 2;
    doc.text('messmanager', cx, cy - 40, { align: 'center', angle: 35 });
    doc.text('messmanager', cx, cy + 40, { align: 'center', angle: 35 });
    doc.restoreGraphicsState();
  };

  // ── Helper: Add footer to current page ────────────────
  const addFooter = (pageNum: number, totalPages: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...coralRed);
    const genDate = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
    doc.text(`By MESS MANAGER, ${genDate}`, margin, pageHeight - 8);
    doc.text('Download Mobile App', pageWidth - margin, pageHeight - 8, {
      align: 'right',
    });
    doc.setTextColor(...mutedText);
    doc.text(
      `Page ${pageNum} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  };

  // ── Helper: Check page break ──────────────────────────
  const checkPageBreak = (needed = 30) => {
    if (y > pageHeight - needed - 20) {
      doc.addPage();
      y = 20;
    }
  };

  // ── 1. Page 1: Header + Summary + Member Table ────────

  // Title
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...coralRed);
  doc.text('Mess Manager: Find Meal Expense Easily', pageWidth / 2, y, {
    align: 'center',
  });
  y += 14;

  // Subtitle
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...coralRed);
  doc.text('Active Month Details', pageWidth / 2, y, { align: 'center' });
  y += 10;

  // Month title (underlined)
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...coralRed);
  const monthTitleText = `Month Title: ${month.monthName}`;
  doc.text(monthTitleText, pageWidth / 2, y, { align: 'center' });
  const mtw = doc.getTextWidth(monthTitleText);
  doc.setDrawColor(...coralRed);
  doc.line(
    pageWidth / 2 - mtw / 2,
    y + 1,
    pageWidth / 2 + mtw / 2,
    y + 1
  );
  y += 14;

  // Summary info lines
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkText);

  const summaryLines = [
    `Mess Name: ${messName}`,
    `Mess Balance: ${summary.messBalance.toFixed(2)} ৳`,
    `Mess Total Meal: ${summary.totalMeals.toFixed(2)}`,
    `Mess Total Deposit: ${summary.totalDeposits.toFixed(2)} ৳`,
    `Mess Total Meal Cost: ${summary.totalMealCost.toFixed(2)} ৳`,
    `Mess Meal Rate: ${summary.mealRate.toFixed(2)} ৳`,
    `Total Shared Cost: ${summary.totalSharedCosts.toFixed(2)} ৳`,
    `Total Individual Cost: ${summary.totalIndividualCosts.toFixed(2)} ৳`,
    `Mess Total Cost(Meal+Other): ${summary.totalExpenses.toFixed(2)} ৳`,
  ];

  for (const line of summaryLines) {
    doc.text(line, margin, y);
    y += 7;
  }
  y += 6;

  // ── Member Summary Info Table ─────────────────────────
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...coralRed);
  doc.text('Member Summary Info Table', margin, y);
  y += 8;

  const memberTableHead = [
    ['Member\nName', 'Total Meal', 'Total\nDeposit', 'Total\nCost(Meal+Shared+Individual)', 'Balance'],
  ];
  const memberTableBody = summary.memberSummaries.map(
    (ms: MemberSummary) => [
      ms.memberName,
      ms.totalMeals.toFixed(2),
      ms.totalDeposit.toFixed(2),
      ms.totalCost.toFixed(2),
      ms.balance.toFixed(2),
    ]
  );

  autoTable(doc, {
    startY: y,
    head: memberTableHead,
    body: memberTableBody,
    margin: { left: margin, right: margin },
    styles: { fontSize: 10, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.3 },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    bodyStyles: {
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    didParseCell: (data: any) => {
      // Color negative balances red
      if (data.column.index === 4 && data.section === 'body') {
        const val = summary.memberSummaries[data.row.index]?.balance ?? 0;
        if (val < 0) {
          data.cell.styles.textColor = [220, 30, 30];
        }
      }
    },
    theme: 'grid',
  });
  y = (doc as any).lastAutoTable.finalY + 12;

  // ── Section Divider ───────────────────────────────────
  checkPageBreak(20);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...coralRed);
  const dividerText = 'Meal, Deposit, Cost, OtherCost Details';
  doc.text(dividerText, pageWidth / 2, y, { align: 'center' });
  const dw = doc.getTextWidth(dividerText);
  doc.setDrawColor(...coralRed);
  doc.line(pageWidth / 2 - dw / 2, y + 1, pageWidth / 2 + dw / 2, y + 1);
  y += 12;

  // ── 2. Meal Table ─────────────────────────────────────
  checkPageBreak(20);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...coralRed);
  doc.text('Meal Table', margin, y);
  y += 8;

  // Build meal table: one row per member per day, sorted by date descending
  const mealRows: string[][] = [];
  const dates = [...new Set(month.meals.map((m) => m.date))].sort().reverse();

  for (const date of dates) {
    const dayMeals = month.meals.filter((m) => m.date === date);
    for (const entry of dayMeals) {
      const member = members.find((m) => m.id === entry.memberId);
      if (!member) continue;
      // Format date as "Nth Mon" style
      const d = new Date(date + 'T00:00:00');
      const day = d.getDate();
      const suffix = day === 1 || day === 21 || day === 31 ? 'st'
        : day === 2 || day === 22 ? 'nd'
          : day === 3 || day === 23 ? 'rd' : 'th';
      const monthStr = d.toLocaleDateString('en-US', { month: 'short' });
      const dateLabel = `${day}${suffix} ${monthStr}`;

      mealRows.push([
        dateLabel,
        member.name,
        entry.breakfast.toString(),
        entry.lunch.toString(),
        entry.dinner.toString(),
      ]);
    }
  }

  if (mealRows.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Date', 'Member Name', 'Breakfast', 'Lunch', 'Dinner']],
      body: mealRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 2.5, lineColor: [0, 0, 0], lineWidth: 0.3 },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        lineColor: [0, 0, 0],
        lineWidth: 0.3,
      },
      bodyStyles: {
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.3,
      },
      alternateRowStyles: { fillColor: [255, 255, 255] },
      theme: 'grid',
    });
    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // ── 3. Deposit Table ──────────────────────────────────
  checkPageBreak(20);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...coralRed);
  doc.text('Deposit Table', margin, y);
  y += 8;

  if (month.deposits.length > 0) {
    const depositBody = month.deposits
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((d) => {
        const member = members.find((m) => m.id === d.memberId);
        const dt = new Date(d.date + 'T00:00:00');
        const day = dt.getDate();
        const suffix = day === 1 || day === 21 || day === 31 ? 'st'
          : day === 2 || day === 22 ? 'nd'
            : day === 3 || day === 23 ? 'rd' : 'th';
        const monthStr = dt.toLocaleDateString('en-US', { month: 'short' });
        return [
          member?.name || 'Unknown',
          d.amount.toString(),
          `${day}${suffix} ${monthStr}`,
        ];
      });

    autoTable(doc, {
      startY: y,
      head: [['Member Name', 'Deposit Amount', 'Date']],
      body: depositBody,
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 2.5, lineColor: [0, 0, 0], lineWidth: 0.3 },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        lineColor: [0, 0, 0],
        lineWidth: 0.3,
      },
      bodyStyles: {
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.3,
      },
      alternateRowStyles: { fillColor: [255, 255, 255] },
      theme: 'grid',
    });
    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // ── 4. Meal/Bazar Cost Table ──────────────────────────
  checkPageBreak(20);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...coralRed);
  doc.text('Meal/Bazar Cost Table', margin, y);
  y += 8;

  if (month.mealCosts.length > 0) {
    const bazarBody = month.mealCosts
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((c) => {
        const shopper = members.find((m) => m.id === c.shopperMemberId);
        const dt = new Date(c.date + 'T00:00:00');
        const day = dt.getDate();
        const suffix = day === 1 || day === 21 || day === 31 ? 'st'
          : day === 2 || day === 22 ? 'nd'
            : day === 3 || day === 23 ? 'rd' : 'th';
        const monthStr = dt.toLocaleDateString('en-US', { month: 'short' });
        return [
          shopper?.name || 'Unknown',
          c.amount.toString(),
          c.bazarList || '',
          `${day}${suffix} ${monthStr}`,
        ];
      });

    autoTable(doc, {
      startY: y,
      head: [["Shopper's Name", 'Bazar/Meal Cost Amount', 'Cost Details', 'Date']],
      body: bazarBody,
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 2.5, lineColor: [0, 0, 0], lineWidth: 0.3 },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        lineColor: [0, 0, 0],
        lineWidth: 0.3,
      },
      bodyStyles: {
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.3,
      },
      alternateRowStyles: { fillColor: [255, 255, 255] },
      theme: 'grid',
    });
    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // ── 5. Individual Other Cost Table ────────────────────
  checkPageBreak(20);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...coralRed);
  doc.text('Individual Other Cost Table', margin, y);
  y += 8;

  const individualCosts = month.otherCosts.filter(
    (c) => c.costType === 'INDIVIDUAL'
  );

  if (individualCosts.length > 0) {
    const indBody = individualCosts.map((c) => {
      const dt = new Date(c.date + 'T00:00:00');
      const day = dt.getDate();
      const suffix = day === 1 || day === 21 || day === 31 ? 'st'
        : day === 2 || day === 22 ? 'nd'
          : day === 3 || day === 23 ? 'rd' : 'th';
      const monthStr = dt.toLocaleDateString('en-US', { month: 'short' });
      const memberNames = c.targetMemberIds
        .map((id) => members.find((m) => m.id === id)?.name || 'Unknown')
        .join(', ');
      return [memberNames, c.amount.toString(), c.costTitle, `${day}${suffix} ${monthStr}`];
    });

    autoTable(doc, {
      startY: y,
      head: [['Member Name', 'Cost Amount', 'Individual Cost Details', 'Date']],
      body: indBody,
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 2.5, lineColor: [0, 0, 0], lineWidth: 0.3 },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        lineColor: [0, 0, 0],
        lineWidth: 0.3,
      },
      bodyStyles: {
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.3,
      },
      alternateRowStyles: { fillColor: [255, 255, 255] },
      theme: 'grid',
    });
    y = (doc as any).lastAutoTable.finalY + 12;
  } else {
    // Empty table with headers only + horizontal line
    autoTable(doc, {
      startY: y,
      head: [['Member Name', 'Cost Amount', 'Individual Cost Details', 'Date']],
      body: [],
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 2.5, lineColor: [0, 0, 0], lineWidth: 0.3 },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        lineColor: [0, 0, 0],
        lineWidth: 0.3,
      },
      theme: 'grid',
    });
    y = (doc as any).lastAutoTable.finalY + 4;
    // Horizontal line under empty table
    doc.setDrawColor(0, 0, 0);
    doc.line(margin, y, pageWidth - margin, y);
    y += 12;
  }

  // ── 6. Shared Other Cost Table ────────────────────────
  checkPageBreak(20);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...coralRed);
  doc.text('Shared Other Cost Table', margin, y);
  y += 8;

  const sharedCosts = month.otherCosts.filter(
    (c) => c.costType === 'SHARED'
  );

  if (sharedCosts.length > 0) {
    const sharedBody = sharedCosts
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((c) => {
        const dt = new Date(c.date + 'T00:00:00');
        const day = dt.getDate();
        const suffix = day === 1 || day === 21 || day === 31 ? 'st'
          : day === 2 || day === 22 ? 'nd'
            : day === 3 || day === 23 ? 'rd' : 'th';
        const monthStr = dt.toLocaleDateString('en-US', { month: 'short' });
        const numMembers = c.targetMemberIds.length;
        const perMember = c.amount / numMembers;
        const memberList = `Divided into ${numMembers} members (\n${c.targetMemberIds
          .map(
            (id) =>
              `${members.find((m) => m.id === id)?.name || 'Unknown'} : ${perMember.toFixed(2)}`
          )
          .join(', ')}\n)`;
        return [
          c.amount.toString(),
          c.costTitle,
          memberList,
          `${day}${suffix} ${monthStr}`,
        ];
      });

    autoTable(doc, {
      startY: y,
      head: [['Total Amount', 'Shared Cost Details', 'Member List', 'Date']],
      body: sharedBody,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 2.5, lineColor: [0, 0, 0], lineWidth: 0.3 },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        lineColor: [0, 0, 0],
        lineWidth: 0.3,
      },
      bodyStyles: {
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.3,
      },
      alternateRowStyles: { fillColor: [255, 255, 255] },
      columnStyles: { 2: { cellWidth: 80 } },
      theme: 'grid',
    });
  }

  // ── Add watermark + footer to all pages ───────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addWatermark();
    addFooter(i, totalPages);
  }

  // Save
  doc.save(`Mess_Report_${month.monthName.replace(/\s+/g, '_')}.pdf`);
}
