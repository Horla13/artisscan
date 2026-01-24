'use client';

// Centralise l'initialisation PDF.js (pdfjs-dist) côté client.
// Objectif: éviter l'erreur "No GlobalWorkerOptions.workerSrc specified"
// et garder un pipeline PDF -> image stable en prod (Next.js App Router + Vercel).

let workerInitialized = false;

export async function getPdfjs() {
  const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf');

  // Init worker une seule fois (par onglet).
  if (!workerInitialized) {
    const version = '5.4.530';
    // CDN fiable + compatible ESM worker (pdf.worker.min.mjs)
    const workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

    try {
      if (pdfjs?.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
      }
      workerInitialized = true;
    } catch {
      // En cas d'environnement atypique, on évite de casser l'app.
      workerInitialized = true;
    }
  }

  return pdfjs;
}


