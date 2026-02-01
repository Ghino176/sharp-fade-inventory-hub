import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportData {
  headers: string[];
  rows: (string | number)[][];
  title: string;
}

export const useExport = () => {
  const exportToExcel = (data: ExportData, filename: string) => {
    const worksheet = XLSX.utils.aoa_to_sheet([data.headers, ...data.rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, data.title);
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  const exportToPDF = (data: ExportData, filename: string) => {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text(data.title, 14, 20);
    
    autoTable(doc, {
      head: [data.headers],
      body: data.rows,
      startY: 30,
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    });

    doc.save(`${filename}.pdf`);
  };

  return { exportToExcel, exportToPDF };
};
