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
    console.error("Erro ao gerar planilha Excel:", err);
    alert("Erro ao exportar arquivo Excel. Verifique se o SheetJS está carregado corretamente.");
  }
}
