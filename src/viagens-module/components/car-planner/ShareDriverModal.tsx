import { useState } from 'react';
import { X, Copy, Check, MessageSquare, Share2, Send, QrCode } from 'lucide-react';
import { CalculatedRouteResult, generateDriverShareText } from '../../services/tollEngine';

interface ShareDriverModalProps {
  route: CalculatedRouteResult;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareDriverModal({ route, isOpen, onClose }: ShareDriverModalProps) {
  const [copied, setCopied] = useState(false);
  const shareText = generateDriverShareText(route);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const encoded = encodeURIComponent(shareText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Enviar Rota para o Motorista</h3>
              <p className="text-xs text-slate-500">Compartilhe o itinerário completo, custos e pedágios</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preview of the formatted message */}
        <div className="mt-4">
          <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
            Pré-visualização da Mensagem (WhatsApp / SMS / Copiar):
          </label>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 font-mono whitespace-pre-wrap max-h-56 overflow-y-auto">
            {shareText}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleWhatsAppShare}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Enviar no WhatsApp</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Copiado com Sucesso!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copiar Texto Completo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
