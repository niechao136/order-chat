import * as XLSX from 'xlsx';

export const readExcelFile = (file: File): Promise<Record<string, unknown>[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet);
          resolve(jsonData as Record<string, unknown>[]);
        } catch {
          reject(new Error('无法解析 Excel 文件，请检查格式'));
        }
      };
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsArrayBuffer(file);
    });
  };

export const downloadExcelFile = (data: string[][], file_name = 'file.xlsx', sheet_name = 'Sheet') => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);

  XLSX.utils.book_append_sheet(wb, ws, sheet_name);

  XLSX.writeFile(wb, file_name);
}
