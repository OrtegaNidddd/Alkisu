import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export interface LightboxProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
  description?: string;
}

export const Lightbox: React.FC<LightboxProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title,
  description,
}) => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (isOpen) {
      setScale(1);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const zoomIn = () => setScale((s) => Math.min(s + 0.5, 4));
  const zoomOut = () => setScale((s) => Math.max(s - 0.5, 0.75));
  const resetZoom = () => setScale(1);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between p-4 bg-[#111815]/95 backdrop-blur-md select-none animate-in fade-in duration-200">
      {/* Barra superior */}
      <div className="w-full max-w-6xl flex items-center justify-between py-2 px-4 border-b border-[#3E564C] text-[#EDF5F2]">
        <div>
          <h4 className="font-semibold text-sm tracking-wide text-[#EDF5F2]">{title || 'Inspección Óptica de Joya'}</h4>
          {description && <p className="text-xs text-[#9CA9A3]">{description}</p>}
        </div>

        <div className="flex items-center space-x-2">
          {/* Controles de Zoom */}
          <div className="flex items-center bg-[#22332C] border border-[#3E564C] rounded-lg p-1 space-x-1">
            <button
              onClick={zoomOut}
              className="p-1.5 text-[#9CA9A3] hover:text-[#EDF5F2] hover:bg-[#3E564C] rounded transition"
              title="Alejar"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-[#EDF5F2] px-2">{Math.round(scale * 100)}%</span>
            <button
              onClick={zoomIn}
              className="p-1.5 text-[#9CA9A3] hover:text-[#EDF5F2] hover:bg-[#3E564C] rounded transition"
              title="Acercar (Detalle microengaste)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={resetZoom}
              className="p-1.5 text-[#9CA9A3] hover:text-[#EDF5F2] hover:bg-[#3E564C] rounded transition"
              title="Restablecer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Botón cerrar */}
          <button
            onClick={onClose}
            className="p-2 text-[#9CA9A3] hover:text-[#EDF5F2] hover:bg-[#B42318] rounded-lg transition"
            title="Cerrar visor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Área de Visualización */}
      <div className="flex-1 w-full flex items-center justify-center overflow-auto p-4 cursor-grab active:cursor-grabbing">
        <div
          className="transition-transform duration-150 ease-out origin-center"
          style={{ transform: `scale(${scale})` }}
        >
          <img
            src={imageUrl}
            alt={title || 'Detalle de joya'}
            className="max-h-[75vh] max-w-[85vw] object-contain rounded-lg shadow-2xl border border-[#3E564C]"
            onDoubleClick={() => setScale((s) => (s === 1 ? 2 : 1))}
          />
        </div>
      </div>

      {/* Barra de pie */}
      <div className="py-2 text-center text-xs text-[#9CA9A3]">
        Tip de orfebre: Haz doble clic en la imagen o usa los controles para inspeccionar garfios, soldaduras y engaste óptico.
      </div>
    </div>
  );
};
