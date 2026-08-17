/* ==========================================================================
   WMS RECEBIMENTO DE UNIDADES - EXCEL REPORT EXPORTER (SHEETJS)
   ========================================================================== */

/**
 * Export data array to Excel (.xlsx) file.
 * @param {Array<object>} data Array of objects to write to sheet
 * @param {string} fileName Name of exported file (without extension)
 * @param {string} sheetName Sheet tab name
 */
function generateExcelFile(data, fileName, sheetName = "Relatório") {
  if (!data || data.length === 0) {
    alert("Nenhum dado disponível para exportar no período selecionado!");
    return;
  }

  // Check if SheetJS library is available
  if (typeof XLSX === 'undefined' || !XLSX.utils || !XLSX.writeFile) {
    console.warn("SheetJS offline/indisponível. Utilizando gerador CSV nativo.");
    downloadCsvFallback(data, fileName);
    return;
  }

  try {
    // Create a new workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Auto-fit columns width
    const objectKeys = Object.keys(data[0]);
    const colsWidths = objectKeys.map(key => {
      let maxLen = key.length;
      data.forEach(row => {
        const val = row[key] ? String(row[key]) : '';
        if (val.length > maxLen) maxLen = val.length;
      });
      return { wch: Math.min(Math.max(maxLen + 4, 12), 40) };
    });
    worksheet['!cols'] = colsWidths;

    // Trigger browser download
    const fullFileName = `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fullFileName);
  } catch (err) {
    console.warn("Falha no SheetJS, alternando para CSV fallback:", err);
    downloadCsvFallback(data, fileName);
  }
}

function downloadCsvFallback(data, fileName) {
  try {
    const keys = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(keys.map(k => `"${String(k).replace(/"/g, '""')}"`).join(';'));

    data.forEach(row => {
      const values = keys.map(k => {
        const val = row[k] != null ? String(row[k]) : '';
        return `"${val.replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(';'));
    });

    const csvContent = "\uFEFF" + csvRows.join("\r\n"); // UTF-8 BOM for Microsoft Excel compatibility
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${fileName}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (e) {
    console.error("Erro no fallback CSV:", e);
    alert("Erro ao gerar arquivo de exportação.");
  }
}
