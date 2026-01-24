import { useEffect } from 'react';
import { RotateCw, ZoomIn, ZoomOut, X } from 'lucide-react';

export type PreviewModalProps = {
  open: boolean;
  title?: string;
  src: string | null;
  kind: 'image' | 'pdf';
  zoom: number;
  rotation: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRotate: () => void;
  onReset: () => void;
  onClose: () => void;
};

export function PreviewModal({
  open,
  title = 'Aperçu',
  src,
  kind,
  zoom,
  rotation,
  onZoomIn,
  onZoomOut,
  onRotate,
  onReset,
  onClose,
}: PreviewModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open || !src) return null;

  const transform = `scale(${zoom}) rotate(${rotation}deg)`;

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/55 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="as-card w-full max-w-4xl bg-white border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-200 bg-white">
          <div className="min-w-0">
            <div className="text-sm font-black text-slate-900 truncate">{title}</div>
            <div className="text-xs font-bold text-slate-500">Zoom {Math.round(zoom * 100)}% • Rotation {rotation}°</div>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" className="as-btn as-btn-secondary px-3 py-2" onClick={onZoomOut} aria-label="Zoom -">
              <ZoomOut className="w-4 h-4" />
            </button>
            <button type="button" className="as-btn as-btn-secondary px-3 py-2" onClick={onZoomIn} aria-label="Zoom +">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button type="button" className="as-btn as-btn-secondary px-3 py-2" onClick={onRotate} aria-label="Rotation">
              <RotateCw className="w-4 h-4" />
            </button>
            <button type="button" className="as-btn as-btn-secondary px-3 py-2" onClick={onReset}>
              Reset
            </button>
            <button type="button" className="as-btn as-btn-secondary px-3 py-2" onClick={onClose} aria-label="Fermer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-slate-50 p-4">
          <div className="relative w-full h-[70vh] overflow-auto rounded-2xl border border-slate-200 bg-white">
            <div className="min-h-full min-w-full flex items-center justify-center p-6">
              {kind === 'image' ? (
                <img
                  src={src}
                  alt="Aperçu du document"
                  className="max-w-full max-h-full rounded-xl border border-slate-200 shadow-sm"
                  style={{ transform, transformOrigin: 'center center' }}
                />
              ) : (
                <div
                  className="w-full h-[62vh] rounded-xl border border-slate-200 overflow-hidden bg-white"
                  style={{ transform, transformOrigin: 'center center' }}
                >
                  <iframe title="Aperçu PDF" src={src} className="w-full h-full" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


