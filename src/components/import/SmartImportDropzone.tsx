import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Sparkles,
  FileSpreadsheet,
  AlertCircle,
  FileCode,
  CheckCircle,
  Clock,
  Zap,
} from 'lucide-react';
import { readFileContent } from '../../services/fileReaders';
import { parseSalesTextDocument } from '../../services/smartImportEngine';
import { useApp } from '../../context/AppContext';
import { SmartImportPayload } from '../../types';

interface SmartImportDropzoneProps {
  onParsed: (payload: SmartImportPayload) => void;
  isProcessing: boolean;
  setIsProcessing: (val: boolean) => void;
}

export const SmartImportDropzone: React.FC<SmartImportDropzoneProps> = ({
  onParsed,
  isProcessing,
  setIsProcessing,
}) => {
  const { companies, branches, sellers, sellerAliases, companyAliases, importTemplates } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const processText = (text: string, fileName?: string) => {
    try {
      setIsProcessing(true);
      setErrorMsg(null);

      const parsedPayload = parseSalesTextDocument(text, {
        companies,
        branches,
        sellers,
        sellerAliases,
        companyAliases,
        templates: importTemplates,
      });

      if (fileName && !parsedPayload.header.fileName) {
        parsedPayload.header.fileName = fileName;
      }

      onParsed(parsedPayload);
    } catch (err: any) {
      console.error('Erro ao processar documento', err);
      setErrorMsg(err?.message || 'Falha ao processar o formato do documento.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFile = async (file: File) => {
    try {
      setIsProcessing(true);
      setErrorMsg(null);
      const res = await readFileContent(file);
      processText(res.rawText, file.name);
    } catch (err: any) {
      console.error('Erro ao ler arquivo', err);
      setErrorMsg(`Erro ao ler arquivo: ${err?.message || 'Formato não suportado'}`);
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Drag & Drop Area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 ${
          isDragOver
            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 scale-[1.01]'
            : 'border-slate-300 dark:border-slate-700 hover:border-emerald-400 bg-white dark:bg-slate-900/60 hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.xlsx,.xls,.csv,.txt"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFile(e.target.files[0]);
            }
          }}
        />

        <div className="max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
            {isProcessing ? (
              <Clock className="w-8 h-8 animate-spin" />
            ) : (
              <Upload className="w-8 h-8" />
            )}
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              {isProcessing
                ? 'Analisando e Extraindo Dados...'
                : 'Arraste seu relatório ou clique para selecionar'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Suporta relatórios em <strong>PDF</strong>, planilhas <strong>Excel (XLSX/XLS)</strong>, <strong>CSV</strong> e arquivos de <strong>Texto</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/40">
              <FileText className="w-3.5 h-3.5" /> PDF
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40">
              <FileSpreadsheet className="w-3.5 h-3.5" /> Excel XLSX/XLS
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40">
              <FileCode className="w-3.5 h-3.5" /> CSV / TXT
            </span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-300 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Atenção ao importar</p>
            <p className="text-sm">{errorMsg}</p>
          </div>
        </div>
      )}
    </div>
  );
};
