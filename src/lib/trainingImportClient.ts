import { extractHandwrittenReport } from './data';
import {
  buildImportedTrainingDraft,
  inferTrainingImportKind,
  type ImportedTrainingDraft,
  type TrainingImportKind,
} from './trainingImportDomain';
import type { TrainingPlanSourceDraftInput } from './trainingData';

const MAX_PDF_IMPORT_PAGES = 4;

type PreparedTrainingImportDraft = {
  source: TrainingPlanSourceDraftInput;
  draft: ImportedTrainingDraft;
  intakeMode: TrainingImportKind;
};

function mapOcrImportError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');

  if (
    message.includes('GOOGLE_CLOUD_VISION_API_KEY') ||
    message.toLowerCase().includes('vision ocr') ||
    message.toLowerCase().includes('ocr')
  ) {
    return new Error(
      'Photo scan is not configured on this environment yet. Use PDF import for now or continue in the manual editor.',
    );
  }

  return error instanceof Error ? error : new Error(message || 'The source could not be imported.');
}

function joinTextBlocks(blocks: string[]) {
  return blocks.map((block) => block.trim()).filter(Boolean).join('\n\n');
}

async function fileToArrayBuffer(file: File) {
  return await file.arrayBuffer();
}

async function loadPdfJs() {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
  return pdfjs;
}

async function renderPageToImageFile(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof loadPdfJs>>['getDocument']>['promise']>['getPage'] extends (...args: any[]) => Promise<infer T> ? T : never,
  pageNumber: number,
) {
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('The PDF page could not be rendered for OCR.');
  }

  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  await page.render({
    canvas,
    canvasContext: context,
    viewport,
  }).promise;

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    throw new Error('The PDF page could not be converted into an image.');
  }

  return new File([blob], `training-page-${pageNumber}.png`, { type: 'image/png' });
}

async function extractTextFromPdf(file: File) {
  try {
    const pdfjs = await loadPdfJs();
    const pdf = await pdfjs.getDocument({ data: await fileToArrayBuffer(file) }).promise;
    const textParts: string[] = [];

    for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, MAX_PDF_IMPORT_PAGES); pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => ('str' in item ? String(item.str || '') : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (pageText.length >= 40) {
        textParts.push(pageText);
        continue;
      }

      const pageImage = await renderPageToImageFile(page as any, pageNumber);
      const ocr = await extractHandwrittenReport(pageImage);
      if (ocr.text.trim()) {
        textParts.push(ocr.text.trim());
      }
    }

    return joinTextBlocks(textParts);
  } catch (error) {
    throw mapOcrImportError(error);
  }
}

async function extractTextFromImage(file: File) {
  try {
    const ocr = await extractHandwrittenReport(file);
    return ocr.text.trim();
  } catch (error) {
    throw mapOcrImportError(error);
  }
}

export async function prepareTrainingImportDraft(file: File, weekStart: string): Promise<PreparedTrainingImportDraft> {
  const intakeMode = inferTrainingImportKind(file.type);

  if (intakeMode === 'manual') {
    throw new Error('Only PDF or image files can be imported.');
  }

  const extractedText =
    intakeMode === 'pdf_import'
      ? await extractTextFromPdf(file)
      : await extractTextFromImage(file);

  if (!extractedText.trim()) {
    throw new Error('No readable training text was detected. Try a clearer file or continue manually.');
  }

  const draft = buildImportedTrainingDraft({
    fileName: file.name,
    mimeType: file.type,
    extractedText,
    weekStart,
  });

  return {
    intakeMode,
    draft,
    source: {
      sourceKind: intakeMode,
      file,
      fileName: file.name,
      mimeType: file.type,
      previewText: draft.source.previewText,
      extractedText: draft.source.rawText,
      extractionStatus: 'draft_generated',
    },
  };
}
