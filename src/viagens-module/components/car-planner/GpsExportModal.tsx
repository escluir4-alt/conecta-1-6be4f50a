import { useState } from 'react';
import { 
  X, 
  Navigation, 
  ExternalLink, 
  Copy, 
  Check, 
  Smartphone, 
  Compass, 
  Share2, 
  QrCode,
  MapPin
} from 'lucide-react';
import { CalculatedRouteResult } from '../../services/tollEngine';

interface GpsExportModalProps {
  route: CalculatedRouteResult;
  isOpen: boolean;
  onClose: () => void;
}

export function GpsExportModal({ route, isOpen, onClose }: GpsExportModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  // Build Google Maps Navigation URL with chained waypoints
  const waypointsParam = route.waypoints.length > 0 
    ? `&waypoints=${route.waypoints.map(w => `${w.lat},${w.lng}`).join('|')}` 
    : '';
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${route.origin.lat},${route.origin.lng}&destination=${route.destination.lat},${route.destination.lng}${waypointsParam}&travelmode=driving`;

  // Waze URL (navigates to next destination)
  const wazeUrl = `https://waze.com/ul?ll=${route.destination.lat},${route.destination.lng}&navigate=yes`;

  // Apple Maps URL
  const appleMapsUrl = `https://maps.apple.com/?saddr=${route.origin.lat},${route.origin.lng}&daddr=${route.destination.lat},${route.destination.lng}&dirflg=d`;

  // QR Code URL for direct scanning via mobile camera
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(googleMapsUrl)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(googleMapsUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleOpenGoogleMaps = () => {
    window.open(googleMapsUrl, '_blank');
  };

  const handleOpenWaze = () => {
    window.open(wazeUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Enviar Rota para GPS</h3>
              <p className="text-xs text-slate-500">Navegação passo a passo no seu celular ou multimídia</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="my-4 space-y-4 text-xs">
          {/* Summary Route Strip */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="min-w-0">
              <span className="font-extrabold text-slate-900 block truncate">
                {route.origin.name} ➔ {route.destination.name}
              </span>
              <span className="text-slate-500 text-[11px]">
                {route.distanceKm} km · {route.formattedDuration} · {route.tollPlazasCount} pedágios
              </span>
            </div>
            <div className="text-right shrink-0">
              <span className="text-emerald-700 font-extrabold text-xs">
                R$ {route.totalTripCostBRL.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>

          {/* Quick Open Buttons */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              Escolha seu aplicativo de GPS preferido:
            </label>

            {/* Google Maps Option */}
            <button
              type="button"
              onClick={handleOpenGoogleMaps}
              className="w-full p-3 rounded-xl border border-sky-200 bg-sky-50/70 hover:bg-sky-100/80 transition-colors flex items-center justify-between text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                  G
                </div>
                <div>
                  <strong className="text-xs font-bold text-slate-900 block">
                    Google Maps (Navegação GPS)
                  </strong>
                  <span className="text-[11px] text-slate-600">
                    Abre rota com todas as paradas e cálculo em tempo real
                  </span>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-sky-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>

            {/* Waze Option */}
            <button
              type="button"
              onClick={handleOpenWaze}
              className="w-full p-3 rounded-xl border border-cyan-200 bg-cyan-50/70 hover:bg-cyan-100/80 transition-colors flex items-center justify-between text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                  W
                </div>
                <div>
                  <strong className="text-xs font-bold text-slate-900 block">
                    Waze (Alertas de Trânsito e Radares)
                  </strong>
                  <span className="text-[11px] text-slate-600">
                    Navega direto para o destino no Waze
                  </span>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-cyan-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          </div>

          {/* QR Code for scanning directly inside car */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center gap-4">
            <div className="w-24 h-24 bg-white p-1 rounded-lg border border-slate-300 shrink-0 flex items-center justify-center shadow-xs">
              <img 
                src={qrCodeUrl} 
                alt="QR Code Rota GPS" 
                className="w-full h-full object-contain"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                <QrCode className="w-4 h-4 text-slate-700" />
                <span>Escanear no Smartphone / Central Multimídia</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Aponte a câmera do seu celular para abrir a rota instantaneamente no seu GPS veicular.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Link Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copiar Link de Navegação</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
