import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';

// Configura o worker do pdfjs se disponível no browser
if (typeof window !== 'undefined' && (pdfjsLib as any).GlobalWorkerOptions) {
  try {
    (pdfjsLib as any).GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).href;
  } catch {
    (pdfjsLib as any).GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || '6.2.108'}/build/pdf.worker.min.mjs`;
  }
}

export interface FileReadResult {
  rawText: string;
  fileType: 'pdf_text' | 'pdf_ocr' | 'excel_xlsx' | 'excel_xls' | 'csv' | 'txt';
  sheetsData?: any[][];
}

/**
 * Lê o arquivo fornecido pelo usuário e extrai o texto completo
 * Suporta PDF (extração de texto nativo com ordenação espacial), XLSX, XLS, CSV e TXT.
 */
export async function readFileContent(file: File): Promise<FileReadResult> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  // 1. Arquivos de Texto ou CSV
  if (extension === 'txt' || extension === 'csv') {
    const text = await file.text();
    return {
      rawText: text,
      fileType: extension === 'csv' ? 'csv' : 'txt',
    };
  }

  // 2. Arquivos de Planilha Excel (XLSX, XLS)
  if (extension === 'xlsx' || extension === 'xls') {
    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
    
    let combinedText = '';
    const allSheetsData: any[][] = [];

    wb.SheetNames.forEach((sheetName) => {
      const sheet = wb.Sheets[sheetName];
      const jsonRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
      allSheetsData.push(jsonRows);

      // Converte matriz de células em texto estruturado
      jsonRows.forEach((row) => {
        if (Array.isArray(row) && row.some((cell) => String(cell).trim() !== '')) {
          const rowLine = row
            .map((cell) => {
              if (cell instanceof Date) {
                return cell.toLocaleDateString('pt-BR');
              }
              return String(cell).trim();
            })
            .filter((cell) => cell !== '')
            .join(' | ');
          
          combinedText += rowLine + '\n';
        }
      });
    });

    return {
      rawText: combinedText,
      fileType: extension === 'xlsx' ? 'excel_xlsx' : 'excel_xls',
      sheetsData: allSheetsData[0] || [],
    };
  }

  // 3. Arquivos PDF
  if (extension === 'pdf') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfDoc = await loadingTask.promise;
      
      let pdfFullText = '';

      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Ordena itens de texto por posição Y (de cima para baixo) e depois X (da esquerda para direita)
        const items = (textContent.items as any[]).map((item) => ({
          text: item.str,
          x: item.transform[4],
          y: item.transform[5],
          height: item.height || 10,
        }));

        // Agrupa em linhas por proximidade de Y
        items.sort((a, b) => b.y - a.y || a.x - b.x);

        let currentY = -9999;
        let lineBuffer: string[] = [];

        items.forEach((item) => {
          if (Math.abs(item.y - currentY) > 5) {
            if (lineBuffer.length > 0) {
              pdfFullText += lineBuffer.join(' ') + '\n';
              lineBuffer = [];
            }
            currentY = item.y;
          }
          if (item.text.trim()) {
            lineBuffer.push(item.text.trim());
          }
        });

        if (lineBuffer.length > 0) {
          pdfFullText += lineBuffer.join(' ') + '\n';
        }
      }

      if (pdfFullText.trim().length > 20) {
        return {
          rawText: pdfFullText,
          fileType: 'pdf_text',
        };
      }
    } catch (err) {
      console.warn('Falha na extração direta de PDF com pdfjs-dist. Tentando fallback...', err);
    }

    // Fallback de leitura binária/texto se pdfjs falhar
    const textFallback = await file.text();
    return {
      rawText: textFallback,
      fileType: 'pdf_text',
    };
  }

  // Fallback padrão
  const text = await file.text();
  return {
    rawText: text,
    fileType: 'txt',
  };
}
