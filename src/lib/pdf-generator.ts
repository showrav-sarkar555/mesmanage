// ─── Client-Side PDF Report Generator ───────────────────────────────────────
// Using jsPDF and jsPDF-AutoTable for pixel-perfect monthly export

import type { MonthCycle, Member, MonthSummary, MemberSummary } from './types';
import { calcMonthSummary } from './calculations';
import { formatCurrency } from './utils';

export async function generateMonthlyPDF(month: MonthCycle, members: Member[]) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Load custom font for Bengali and English support
  let fontName = 'helvetica';
  try {
    const fontResponse = await fetch('/fonts/kalpurush.ttf');
    if (fontResponse.ok) {
      const fontBuffer = await fontResponse.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(fontBuffer);
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const fontBase64 = window.btoa(binary);
      doc.addFileToVFS('kalpurush.ttf', fontBase64);
      doc.addFont('kalpurush.ttf', 'kalpurush', 'normal');
      doc.addFont('kalpurush.ttf', 'kalpurush', 'bold');
      fontName = 'kalpurush';
    }
  } catch (err) {
    console.error('Failed to load Bengali font', err);
  }

  const summary = calcMonthSummary(month, members);
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 20;

  const addTitle = (text: string, size = 16) => {
    doc.setFontSize(size);
    doc.setFont(fontName, 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(text, margin, y);
    y += size * 0.5 + 2;
  };

  const addSubtitle = (text: string) => {
    doc.setFontSize(11);
    doc.setFont(fontName, 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(text, margin, y);
    y += 6;
  };

  const addSectionTitle = (text: string) => {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    y += 4;
    doc.setFontSize(13);
    doc.setFont(fontName, 'bold');
    doc.setTextColor(41, 98, 255);
    doc.text(text, margin, y);
    y += 8;
  };

  // ── 1. Header ─────────────────────────────────────────
  doc.setFillColor(41, 98, 255);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setFontSize(22);
  doc.setFont(fontName, 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Mess Manager', margin, 18);
  doc.setFontSize(12);
  doc.setFont(fontName, 'normal');
  doc.text(`Monthly Financial Statement — ${month.monthName}`, margin, 28);
  doc.setFontSize(9);
  const manager = members.find((m) => m.id === month.managerId);
  doc.text(
    `Manager: ${manager?.name || 'N/A'} | Generated: ${new Date().toLocaleDateString('en-GB')}`,
    margin,
    35
  );
  y = 50;

  // ── 2. Summary Section ────────────────────────────────
  addSectionTitle('Monthly Summary');

  const summaryData = [
    ['Total Meals', summary.totalMeals.toFixed(2)],
    ['Meal Rate', `${formatCurrency(summary.mealRate)} / meal`],
    ['Total Meal Cost', formatCurrency(summary.totalMealCost)],
    ['Total Shared Costs', formatCurrency(summary.totalSharedCosts)],
    ['Total Individual Costs', formatCurrency(summary.totalIndividualCosts)],
    ['Total Expenses', formatCurrency(summary.totalExpenses)],
    ['Total Deposits', formatCurrency(summary.totalDeposits)],
    ['Mess Balance (Cash in Hand)', formatCurrency(summary.messBalance)],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Item', 'Value']],
    body: summaryData,
    margin: { left: margin, right: margin },
    styles: { font: fontName, fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [41, 98, 255], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 255] },
    theme: 'grid',
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // ── 3. Member Financial Statement ─────────────────────
  addSectionTitle('Member Financial Statement');

  const memberTableHead = [
    ['Name', 'Meals', 'Deposit', 'Meal Cost', 'Shared', 'Individual', 'Total Cost', 'Balance'],
  ];
  const memberTableBody = summary.memberSummaries.map((ms: MemberSummary) => [
    ms.memberName,
    ms.totalMeals.toFixed(2),
    formatCurrency(ms.totalDeposit),
    formatCurrency(ms.mealCost),
    formatCurrency(ms.sharedCost),
    formatCurrency(ms.individualCost),
    formatCurrency(ms.totalCost),
    formatCurrency(ms.balance),
  ]);

  autoTable(doc, {
    startY: y,
    head: memberTableHead,
    body: memberTableBody,
    margin: { left: margin, right: margin },
    styles: { font: fontName, fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [41, 98, 255], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 255] },
    columnStyles: {
      7: {
        fontStyle: 'bold',
      },
    },
    didParseCell: (data: any) => {
      if (data.column.index === 7 && data.section === 'body') {
        const val = summary.memberSummaries[data.row.index]?.balance ?? 0;
        data.cell.styles.textColor = val >= 0 ? [0, 150, 50] : [220, 30, 30];
      }
    },
    theme: 'grid',
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // ── 4. Daily Meal Matrix ──────────────────────────────
  doc.addPage();
  y = 20;
  addSectionTitle('Daily Meal Matrix');

  // Collect unique dates
  const dates = [...new Set(month.meals.map((m) => m.date))].sort();

  if (dates.length > 0) {
    const mealMatrixHead = [['Date', ...members.map((m) => m.name)]];
    const mealMatrixBody = dates.map((date) => {
      const row = [date.slice(5)]; // MM-DD
      for (const member of members) {
        const entry = month.meals.find(
          (e) => e.date === date && e.memberId === member.id
        );
        if (entry) {
          const total = entry.breakfast + entry.lunch + entry.dinner;
          row.push(`${total} (${entry.breakfast}/${entry.lunch}/${entry.dinner})`);
        } else {
          row.push('0');
        }
      }
      return row;
    });

    autoTable(doc, {
      startY: y,
      head: mealMatrixHead,
      body: mealMatrixBody,
      margin: { left: margin, right: margin },
      styles: { font: fontName, fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [41, 98, 255], textColor: 255, fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: [245, 247, 255] },
      theme: 'grid',
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── 5. Deposit Ledger ─────────────────────────────────
  if (y > 240) {
    doc.addPage();
    y = 20;
  }
  addSectionTitle('Deposit Ledger');

  if (month.deposits.length > 0) {
    const depositHead = [['Date', 'Member', 'Amount', 'Note']];
    const depositBody = month.deposits
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => [
        d.date,
        members.find((m) => m.id === d.memberId)?.name || 'Unknown',
        formatCurrency(d.amount),
        d.note || '',
      ]);

    autoTable(doc, {
      startY: y,
      head: depositHead,
      body: depositBody,
      margin: { left: margin, right: margin },
      styles: { font: fontName, fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [41, 98, 255], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 255] },
      theme: 'grid',
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── 6. Bazar / Meal Cost Log ──────────────────────────
  if (y > 240) {
    doc.addPage();
    y = 20;
  }
  addSectionTitle('Bazar / Meal Cost Log');

  if (month.mealCosts.length > 0) {
    const bazarHead = [['Date', 'Shopper', 'Items', 'Amount']];
    const bazarBody = month.mealCosts
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((c) => [
        c.date,
        members.find((m) => m.id === c.shopperMemberId)?.name || 'Unknown',
        c.bazarList || '-',
        formatCurrency(c.amount),
      ]);

    autoTable(doc, {
      startY: y,
      head: bazarHead,
      body: bazarBody,
      margin: { left: margin, right: margin },
      styles: { font: fontName, fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [41, 98, 255], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 255] },
      columnStyles: { 2: { cellWidth: 60 } },
      theme: 'grid',
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── 7. Shared Cost Breakdown ──────────────────────────
  if (y > 240) {
    doc.addPage();
    y = 20;
  }
  addSectionTitle('Other Cost Breakdown');

  if (month.otherCosts.length > 0) {
    const otherHead = [['Title', 'Type', 'Date', 'Split Members', 'Amount']];
    const otherBody = month.otherCosts.map((c) => [
      c.costTitle,
      c.costType,
      c.date,
      c.targetMemberIds
        .map((id) => members.find((m) => m.id === id)?.name || 'Unknown')
        .join(', '),
      formatCurrency(c.amount),
    ]);

    autoTable(doc, {
      startY: y,
      head: otherHead,
      body: otherBody,
      margin: { left: margin, right: margin },
      styles: { font: fontName, fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [41, 98, 255], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 255] },
      theme: 'grid',
    });
  }

  // ── Footer on all pages ───────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont(fontName, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Mess Manager Report — Page ${i} of ${totalPages}`,
      pageWidth / 2,
      290,
      { align: 'center' }
    );
  }

  // Save
  doc.save(`Mess_Report_${month.monthName.replace(/\s+/g, '_')}.pdf`);
}
