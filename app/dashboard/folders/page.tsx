'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Folder, Calendar, ChevronDown, FileText, Download, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Invoice {
  id: string;
  entreprise: string;
  montant_ht: number;
  total_amount: number;
  date_facture: string;
  created_at: string;
  description?: string;
  categorie?: string;
}

interface FolderData {
  monthKey: string;
  label: string;
  year: string;
  month: string;
  invoiceCount: number;
  totalHT: number;
  totalTTC: number;
  invoices: Invoice[];
}

export default function FoldersPage() {
  const router = useRouter();
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [showYearSelector, setShowYearSelector] = useState(false);
  const [showMonthSelector, setShowMonthSelector] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<FolderData | null>(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('scans')
        .select('*')
        .eq('user_id', user.id)
        .order('date_facture', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Erreur chargement factures:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMonthKey = (dateStr: string): string => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const getMonthLabel = (monthKey: string): string => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  const folders = useMemo(() => {
    const folderMap = new Map<string, FolderData>();

    invoices.forEach(invoice => {
      const monthKey = getMonthKey(invoice.date_facture || invoice.created_at);
      const [year, month] = monthKey.split('-');

      if (!folderMap.has(monthKey)) {
        folderMap.set(monthKey, {
          monthKey,
          label: getMonthLabel(monthKey),
          year,
          month,
          invoiceCount: 0,
          totalHT: 0,
          totalTTC: 0,
          invoices: []
        });
      }

      const folder = folderMap.get(monthKey)!;
      folder.invoiceCount++;
      folder.totalHT += parseFloat(String(invoice.montant_ht || 0));
      folder.totalTTC += parseFloat(String(invoice.total_amount || 0));
      folder.invoices.push(invoice);
    });

    return Array.from(folderMap.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [invoices]);

  const filteredFolders = useMemo(() => {
    return folders.filter(folder => {
      if (selectedYear !== 'all' && folder.year !== selectedYear) return false;
      if (selectedMonth !== 'all' && folder.month !== selectedMonth) return false;
      return true;
    });
  }, [folders, selectedYear, selectedMonth]);

  const availableYears = useMemo(() => {
    const years = new Set(folders.map(f => f.year));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [folders]);

  const availableMonths = [
    { value: '01', label: 'Janvier' },
    { value: '02', label: 'Février' },
    { value: '03', label: 'Mars' },
    { value: '04', label: 'Avril' },
    { value: '05', label: 'Mai' },
    { value: '06', label: 'Juin' },
    { value: '07', label: 'Juillet' },
    { value: '08', label: 'Août' },
    { value: '09', label: 'Septembre' },
    { value: '10', label: 'Octobre' },
    { value: '11', label: 'Novembre' },
    { value: '12', label: 'Décembre' },
  ];

  const totalStats = useMemo(() => {
    return filteredFolders.reduce((acc, folder) => ({
      invoices: acc.invoices + folder.invoiceCount,
      totalHT: acc.totalHT + folder.totalHT,
      totalTTC: acc.totalTTC + folder.totalTTC,
    }), { invoices: 0, totalHT: 0, totalTTC: 0 });
  }, [filteredFolders]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-slate-600 font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  if (selectedFolder) {
    return (
      <div className="min-h-screen bg-slate-50 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {/* Header avec retour */}
          <button
            onClick={() => setSelectedFolder(null)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour aux dossiers
          </button>

          {/* Titre du dossier */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Folder className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 capitalize">{selectedFolder.label}</h1>
                <p className="text-slate-500 mt-1">
                  {selectedFolder.invoiceCount} facture{selectedFolder.invoiceCount > 1 ? 's' : ''} • {selectedFolder.totalTTC.toFixed(2)} € TTC
                </p>
              </div>
            </div>
          </div>

          {/* Liste des factures */}
          <div className="space-y-3">
            {selectedFolder.invoices.map(invoice => {
              const ht = parseFloat(String(invoice.montant_ht || 0));
              const ttc = parseFloat(String(invoice.total_amount || 0));
              const tva = ttc - ht;

              return (
                <div key={invoice.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="w-5 h-5 text-orange-500 flex-shrink-0" />
                        <h3 className="font-bold text-slate-900">{invoice.entreprise}</h3>
                      </div>
                      {invoice.description && (
                        <p className="text-sm text-slate-600 ml-8">{invoice.description}</p>
                      )}
                      {invoice.categorie && (
                        <span className="inline-block ml-8 mt-2 text-xs font-medium px-2 py-1 bg-orange-50 text-orange-700 rounded">
                          {invoice.categorie}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-slate-900">{ttc.toFixed(2)} €</p>
                      <p className="text-xs text-slate-500">HT: {ht.toFixed(2)} €</p>
                      <p className="text-xs text-slate-500">TVA: {tva.toFixed(2)} €</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(invoice.date_facture).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour au Dashboard
          </button>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Mes Dossiers</h1>
          <p className="text-slate-500 mt-2">Classement automatique de vos factures par mois</p>
        </div>

        {/* Statistiques globales */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                <Folder className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dossiers</p>
                <p className="text-2xl font-black text-slate-900">{filteredFolders.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Factures</p>
                <p className="text-2xl font-black text-slate-900">{totalStats.invoices}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total TTC</p>
                <p className="text-2xl font-black text-slate-900">{totalStats.totalTTC.toFixed(2)} €</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-8 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            {/* Filtre Année */}
            <div className="relative">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Année</label>
              <button
                onClick={() => setShowYearSelector(!showYearSelector)}
                className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white text-sm font-bold shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2 min-w-[140px]"
              >
                <Calendar className="w-4 h-4 text-orange-500" />
                {selectedYear === 'all' ? 'Toutes' : selectedYear}
                <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${showYearSelector ? 'rotate-180' : ''}`} />
              </button>
              {showYearSelector && (
                <div className="absolute top-full left-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-10 min-w-[200px] py-2">
                  <button
                    onClick={() => {
                      setSelectedYear('all');
                      setShowYearSelector(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm font-medium hover:bg-slate-50 transition-colors"
                  >
                    Toutes les années
                  </button>
                  {availableYears.map(year => (
                    <button
                      key={year}
                      onClick={() => {
                        setSelectedYear(year);
                        setShowYearSelector(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                      {year}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filtre Mois */}
            <div className="relative">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mois</label>
              <button
                onClick={() => setShowMonthSelector(!showMonthSelector)}
                className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white text-sm font-bold shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2 min-w-[140px]"
              >
                <Calendar className="w-4 h-4 text-orange-500" />
                {selectedMonth === 'all' ? 'Tous' : availableMonths.find(m => m.value === selectedMonth)?.label}
                <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${showMonthSelector ? 'rotate-180' : ''}`} />
              </button>
              {showMonthSelector && (
                <div className="absolute top-full left-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-10 min-w-[200px] py-2 max-h-80 overflow-y-auto">
                  <button
                    onClick={() => {
                      setSelectedMonth('all');
                      setShowMonthSelector(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm font-medium hover:bg-slate-50 transition-colors"
                  >
                    Tous les mois
                  </button>
                  {availableMonths.map(month => (
                    <button
                      key={month.value}
                      onClick={() => {
                        setSelectedMonth(month.value);
                        setShowMonthSelector(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                      {month.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bouton Reset */}
            {(selectedYear !== 'all' || selectedMonth !== 'all') && (
              <button
                onClick={() => {
                  setSelectedYear('all');
                  setSelectedMonth('all');
                }}
                className="ml-auto px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        {/* Grille de dossiers */}
        {filteredFolders.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
            <Folder className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">Aucun dossier trouvé</h3>
            <p className="text-slate-500">Aucune facture ne correspond aux filtres sélectionnés.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFolders.map(folder => (
              <button
                key={folder.monthKey}
                onClick={() => setSelectedFolder(folder)}
                className="bg-white rounded-2xl border-2 border-slate-200 p-6 hover:border-orange-400 hover:shadow-xl transition-all text-left group"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Folder className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-black text-slate-900 capitalize truncate group-hover:text-orange-600 transition-colors">
                      {folder.label}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {folder.invoiceCount} facture{folder.invoiceCount > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 font-medium">Total HT</span>
                    <span className="text-sm font-bold text-slate-700">{folder.totalHT.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 font-medium">Total TTC</span>
                    <span className="text-lg font-black text-orange-600">{folder.totalTTC.toFixed(2)} €</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

