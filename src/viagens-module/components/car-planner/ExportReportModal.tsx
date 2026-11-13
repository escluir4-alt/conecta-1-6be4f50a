import { X, Printer, Download, FileSpreadsheet, FileText, CheckCircle2 } from 'lucide-react';
import { CalculatedRouteResult } from '../../services/tollEngine';
import { VEHICLE_CATEGORIES, FUEL_OPTIONS } from '../../data/tollPlazasData';

interface ExportReportModalProps {
  route: CalculatedRouteResult;
  isOpen: boolean;
  onClose: () => void;
}

export function ExportReportModal({ route, isOpen, onClose }: ExportReportModalProps) {
  if (!isOpen) return null;

  const vehicle = VEHICLE_CATEGORIES.find(v => v.id === route.vehicleCategory)?.name || 'Veículo';
  const fuel = FUEL_OPTIONS.find(f => f.id === route.fuelType)?.name || 'Combustível';

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCSV = () => {
    let csv = `RELATORIO DE VIAGEM E PEDAGIOS - MODULO VIAGENS\n`;
    csv += `Origem;${route.origin.name}\n`;
    csv += `Destino;${route.destination.name}\n`;
    csv += `Distancia (KM);${route.distanceKm}\n`;
    csv += `Duracao Estimada;${route.formattedDuration}\n`;
    csv += `Veiculo;${vehicle}\n`;
    csv += `Combustivel;${fuel}\n`;
    csv += `Custo Combustivel (R$);${route.fuelTotalBRL.toFixed(2)}\n`;
    csv += `Custo Pedagios (R$);${route.tollTotalBRL.toFixed(2)}\n`;
    csv += `CUSTO TOTAL (R$);${route.totalTripCostBRL.toFixed(2)}\n\n`;
    csv += `PRACAS DE PEDAGIO:\n`;
    csv += `Nome;Rodovia;Concessionaria;Tarifa (R$);Meios de Pagamento\n`;
    route.tollPlazas.forEach(p => {
      csv += `${p.name};${p.highway};${p.concessionaire};${p.rates.car.toFixed(2)};${p.paymentMethods.join(',')}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `planejamento_viagem_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Relatório Completo de Viagem e Custos</h3>
              <p className="text-xs text-slate-500">Planilha de despesas para prestação de contas e logística</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Content */}
        <div className="my-4 overflow-y-auto flex-1 space-y-4 pr-1 text-slate-800 text-xs">
          {/* Summary Card */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <span className="text-[11px] text-slate-500 block">Distância Total</span>
              <strong className="text-sm font-bold text-slate-900">{route.distanceKm} km</strong>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">Tempo Estimado</span>
              <strong className="text-sm font-bold text-slate-900">{route.formattedDuration}</strong>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">Total Pedágio</span>
              <strong className="text-sm font-bold text-amber-700">R$ {route.tollTotalBRL.toFixed(2).replace('.', ',')}</strong>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">Custo Total</span>
              <strong className="text-sm font-bold text-emerald-700">R$ {route.totalTripCostBRL.toFixed(2).replace('.', ',')}</strong>
            </div>
          </div>

          {/* Details breakdown */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-3 py-2 font-bold text-slate-700 text-xs flex justify-between">
              <span>Praça de Pedágio & Concessionária</span>
              <span>Tarifa</span>
            </div>
            <div className="divide-y divide-slate-100">
              {route.tollPlazas.map((p, idx) => (
                <div key={p.id} className="p-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{idx + 1}. {p.name}</span>
                    <span className="text-slate-500 block text-[11px]">{p.highway} · {p.concessionaire} · km {p.km}</span>
                  </div>
                  <span className="font-bold text-slate-800">R$ {p.rates.car.toFixed(2).replace('.', ',')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV (Excel)</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Relatório</span>
          </button>
        </div>
      </div>
    </div>
  );
}
