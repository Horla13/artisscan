'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Camera, LayoutDashboard, Clock, ScanLine, Trash2, Settings, Download, X, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Invoice {
  id: string;
  entreprise: string;
  montant_ht: number;
  montant_ttc: number;
  date_facture: string;
  description: string;
  categorie?: string;
  created_at: string;
}

const LOADING_MESSAGES = [
  'Analyse de la facture...',
  'Extraction des données...',
  'Calcul de la TVA...',
  'Reconnaissance du texte...',
  'Finalisation...'
];

export default function Dashboard() {
  const [analyzing, setAnalyzing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [currentView, setCurrentView] = useState('dashboard');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'montant' | 'categorie'>('date');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rotation des messages de chargement
  useEffect(() => {
    if (analyzing) {
      let index = 0;
      const interval = setInterval(() => {
        index = (index + 1) % LOADING_MESSAGES.length;
        setLoadingMessage(LOADING_MESSAGES[index]);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [analyzing]);

  // Stats calculées depuis les factures
  const stats = {
    totalHT: invoices.reduce((sum, inv) => sum + inv.montant_ht, 0),
    tvaRecuperable: invoices.reduce((sum, inv) => sum + (inv.montant_ttc - inv.montant_ht), 0),
    nombreFactures: invoices.length
  };

  // Données pour le graphique des 7 derniers jours
  const getLast7DaysData = () => {
    const last7Days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayInvoices = invoices.filter(inv => 
        inv.date_facture.startsWith(dateStr)
      );
      
      const total = dayInvoices.reduce((sum, inv) => sum + inv.montant_ht, 0);
      
      last7Days.push({
        date: date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
        montant: total
      });
    }
    
    return last7Days;
  };

  // Toast helper
  const showToastMessage = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Charger les factures depuis Supabase
  const loadInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('scans')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setInvoices(data || []);
      }
    } catch (err) {
      console.error('Erreur chargement factures:', err);
    } finally {
      setLoadingInvoices(false);
    }
  };

  // Charger au montage et changement de vue
  useEffect(() => {
    if (currentView === 'historique' || currentView === 'dashboard') {
      loadInvoices();
    }
  }, [currentView]);

  // Tri des factures
  const getSortedInvoices = () => {
    const sorted = [...invoices];
    
    switch (sortBy) {
      case 'date':
        return sorted.sort((a, b) => 
          new Date(b.date_facture).getTime() - new Date(a.date_facture).getTime()
        );
      case 'montant':
        return sorted.sort((a, b) => b.montant_ttc - a.montant_ttc);
      case 'categorie':
        return sorted.sort((a, b) => 
          (a.categorie || '').localeCompare(b.categorie || '')
        );
      default:
        return sorted;
    }
  };

  // Confirmer suppression
  const confirmDelete = (id: string) => {
    setInvoiceToDelete(id);
    setShowDeleteModal(true);
  };

  // Supprimer une facture
  const deleteInvoice = async () => {
    if (!invoiceToDelete) return;
    
    try {
      const { error } = await supabase
        .from('scans')
        .delete()
        .eq('id', invoiceToDelete);
      
      if (error) throw error;
      
      await loadInvoices();
      showToastMessage('Facture supprimée !', 'success');
      setShowDeleteModal(false);
      setInvoiceToDelete(null);
    } catch (err) {
      console.error('Erreur suppression:', err);
      showToastMessage('Erreur lors de la suppression', 'error');
    }
  };

  // Export CSV
  const exportToCSV = () => {
    const headers = ['Date', 'Libellé', 'Catégorie', 'Montant HT', 'TVA', 'Montant TTC'];
    const rows = invoices.map(inv => [
      new Date(inv.date_facture).toLocaleDateString('fr-FR'),
      inv.entreprise,
      inv.categorie || 'Non classé',
      inv.montant_ht.toFixed(2),
      (inv.montant_ttc - inv.montant_ht).toFixed(2),
      inv.montant_ttc.toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `factures_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToastMessage('Export CSV réussi !', 'success');
  };

  // Compression d'image optimisée
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img: HTMLImageElement = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Redimensionner si trop grand (optimisé pour chantiers)
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Compression optimisée (0.7 pour équilibre qualité/taille)
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(compressedDataUrl);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleAnalyze = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérification taille fichier original
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > 10) {
      showToastMessage('Image trop lourde (>10MB). Essayez de reculer un peu.', 'error');
      return;
    }

    setAnalyzing(true);
    setError('');
    setResult(null);
    setLoadingMessage(LOADING_MESSAGES[0]);

    try {
      // Compresser l'image
      const compressedImage = await compressImage(file);
      
      // Vérifier la taille après compression
      const compressedSize = (compressedImage.length * 3) / 4 / (1024 * 1024);
      if (compressedSize > 4) {
        showToastMessage('Image toujours trop lourde. Essayez de reculer.', 'error');
        setAnalyzing(false);
        return;
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: compressedImage }),
      });

      const text = await response.text();
      
      // Parser le JSON de manière robuste
      let data;
      try {
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          const jsonString = text.substring(firstBrace, lastBrace + 1);
          data = JSON.parse(jsonString);
        } else {
          throw new Error('Pas de JSON dans la réponse');
        }
      } catch (parseError) {
        console.error('Erreur parsing:', text);
        throw new Error('Réponse invalide du serveur');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'analyse');
      }

      setResult(data);

      // Sauvegarder dans Supabase
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase.from('scans').insert([{
          user_id: user.id,
          entreprise: data.entreprise || 'Non spécifié',
          montant_ht: data.montant_ht || 0,
          montant_ttc: data.montant_ttc || 0,
          date_facture: data.date || new Date().toISOString(),
          description: data.description || '',
          categorie: data.categorie || 'Non classé',
        }]);
      }

      // Toast de succès
      showToastMessage('✅ Facture enregistrée !', 'success');

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }

      // Recharger les factures
      await loadInvoices();

    } catch (err: any) {
      console.error('Erreur:', err);
      showToastMessage(err.message || 'Erreur lors de l\'analyse', 'error');
      setError(err.message || 'Erreur lors de l\'analyse de la facture');
    } finally {
      setAnalyzing(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-slate-900">ArtisScan Expert</h1>
          <p className="text-sm text-slate-500 mt-1">Gestion comptable intelligente</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* DASHBOARD */}
        {currentView === 'dashboard' && (
          <div className="space-y-6 fade-in">
            {/* Stats principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card-clean rounded-2xl p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Total HT (Mois)</p>
                    <p className="text-4xl font-bold text-slate-900">
                      {stats.totalHT.toLocaleString('fr-FR', { 
                        style: 'currency', 
                        currency: 'EUR',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      })}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">{stats.nombreFactures} factures</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center">
                    <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="card-clean rounded-2xl p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">TVA récupérable</p>
                    <p className="text-4xl font-bold text-slate-900">
                      {stats.tvaRecuperable.toLocaleString('fr-FR', { 
                        style: 'currency', 
                        currency: 'EUR',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      })}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">TVA 20%</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Graphique 7 derniers jours */}
            <div className="card-clean rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Dépenses des 7 derniers jours</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={getLast7DaysData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #f1f5f9',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                    formatter={(value: number | undefined) => {
                      if (value === undefined) return ['0.00 €', 'Montant HT'];
                      return [`${value.toFixed(2)} €`, 'Montant HT'];
                    }}
                  />
                  <Bar dataKey="montant" fill="#f97316" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Section Scanner */}
            <div className="card-clean rounded-2xl p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-50 flex items-center justify-center">
                <ScanLine className="w-10 h-10 text-slate-400" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Scanner une facture</h2>
              <p className="text-sm text-slate-500 mb-6">
                Prenez une photo ou sélectionnez depuis votre galerie
              </p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleAnalyze}
                className="hidden"
              />
              
              <button
                onClick={triggerFileInput}
                disabled={analyzing}
                className="btn-primary w-full max-w-xs mx-auto py-4 px-6 rounded-full font-semibold text-base shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {analyzing ? (
                  <span className="flex items-center justify-center">
                    <div className="spinner w-5 h-5 mr-3"></div>
                    {loadingMessage}
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <Camera className="w-5 h-5 mr-2" />
                    Prendre une photo
                  </span>
                )}
              </button>
            </div>

            {/* Erreur */}
            {error && (
              <div className="card-clean rounded-xl p-4 border-red-200 bg-red-50">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Résultat */}
            {result && (
              <div className="card-clean rounded-2xl p-6 slide-up">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">✅ Facture analysée</h3>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-sm font-medium text-slate-600">Entreprise</span>
                    <span className="text-sm font-semibold text-slate-900">{result.entreprise || 'N/A'}</span>
                  </div>
                  {result.categorie && (
                    <div className="flex justify-between py-2 border-b border-slate-100">
                      <span className="text-sm font-medium text-slate-600">Catégorie</span>
                      <span className="text-sm font-semibold text-orange-600">{result.categorie}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-sm font-medium text-slate-600">Montant HT</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {result.montant_ht ? `${result.montant_ht.toFixed(2)} €` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-sm font-medium text-slate-600">Montant TTC</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {result.montant_ttc ? `${result.montant_ttc.toFixed(2)} €` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-sm font-medium text-slate-600">TVA</span>
                    <span className="text-sm font-semibold text-orange-600">
                      {result.montant_ttc && result.montant_ht 
                        ? `${(result.montant_ttc - result.montant_ht).toFixed(2)} €` 
                        : 'N/A'}
                    </span>
                  </div>
                  {result.date && (
                    <div className="flex justify-between py-2 border-b border-slate-100">
                      <span className="text-sm font-medium text-slate-600">Date</span>
                      <span className="text-sm font-semibold text-slate-900">{result.date}</span>
                    </div>
                  )}
                  {result.description && (
                    <div className="py-2">
                      <span className="text-sm font-medium text-slate-600 block mb-1">Description</span>
                      <p className="text-sm text-slate-700">{result.description}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* HISTORIQUE */}
        {currentView === 'historique' && (
          <div className="fade-in space-y-4">
            {/* Header avec export et tri */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Historique des factures</h2>
              <button
                onClick={exportToCSV}
                disabled={invoices.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>

            {/* Boutons de tri */}
            <div className="flex gap-2">
              <button
                onClick={() => setSortBy('date')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'date' 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Date (récent)
              </button>
              <button
                onClick={() => setSortBy('montant')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'montant' 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Montant
              </button>
              <button
                onClick={() => setSortBy('categorie')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'categorie' 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Catégorie
              </button>
            </div>
            
            {loadingInvoices ? (
              <div className="card-clean rounded-2xl p-8 text-center">
                <div className="spinner w-8 h-8 mx-auto"></div>
                <p className="text-slate-500 mt-4">Chargement...</p>
              </div>
            ) : invoices.length === 0 ? (
              <div className="card-clean rounded-2xl p-8 text-center">
                <Clock className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Aucune facture</h3>
                <p className="text-slate-500">Vos factures scannées apparaîtront ici</p>
              </div>
            ) : (
              <div className="space-y-3">
                {getSortedInvoices().map((invoice) => (
                  <div key={invoice.id} className="card-clean rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-slate-900">{invoice.entreprise}</h4>
                            {invoice.categorie && (
                              <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-orange-50 text-orange-700 rounded">
                                {invoice.categorie}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => confirmDelete(invoice.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-slate-500">HT:</span>
                            <span className="font-medium text-slate-900 ml-1">
                              {invoice.montant_ht.toFixed(2)} €
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">TTC:</span>
                            <span className="font-medium text-slate-900 ml-1">
                              {invoice.montant_ttc.toFixed(2)} €
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 mt-2">
                          {new Date(invoice.date_facture).toLocaleDateString('fr-FR')}
                        </p>
                        {invoice.description && (
                          <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                            {invoice.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PARAMÈTRES */}
        {currentView === 'parametres' && (
          <div className="fade-in space-y-4">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Paramètres</h2>
            
            <div className="card-clean rounded-2xl p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Export & Données</h3>
              <button
                onClick={exportToCSV}
                disabled={invoices.length === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-5 h-5" />
                Exporter toutes les factures (CSV)
              </button>
              <p className="text-sm text-slate-500 mt-2">
                Format compatible avec votre comptable
              </p>
            </div>

            <div className="card-clean rounded-2xl p-6">
              <h3 className="font-semibold text-slate-900 mb-2">À propos</h3>
              <p className="text-sm text-slate-600">
                ArtisScan Expert v1.0
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Analyse intelligente de factures avec IA
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Modale de confirmation suppression */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full slide-up">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Confirmer la suppression</h3>
            <p className="text-sm text-slate-600 mb-6">
              Êtes-vous sûr de vouloir supprimer cette facture ? Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={deleteInvoice}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast de confirmation */}
      {showToast && (
        <div className={`toast ${toastType === 'error' ? 'bg-red-500' : 'bg-green-600'}`}>
          {toastMessage}
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <div className="max-w-7xl mx-auto px-2">
          <div className="flex items-center justify-around py-2">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex flex-col items-center justify-center py-2 px-3 transition-colors ${
                currentView === 'dashboard' 
                  ? 'text-orange-600' 
                  : 'text-slate-400'
              }`}
            >
              <LayoutDashboard className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Dashboard</span>
            </button>

            <button
              onClick={triggerFileInput}
              disabled={analyzing}
              className="flex flex-col items-center justify-center -mt-6 bg-orange-500 text-white rounded-full p-4 shadow-lg hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-50"
            >
              {analyzing ? (
                <div className="spinner w-8 h-8 border-white border-opacity-20" style={{ borderTopColor: 'white' }}></div>
              ) : (
                <Camera className="w-8 h-8" />
              )}
            </button>

            <button
              onClick={() => setCurrentView('historique')}
              className={`flex flex-col items-center justify-center py-2 px-3 transition-colors ${
                currentView === 'historique' 
                  ? 'text-orange-600' 
                  : 'text-slate-400'
              }`}
            >
              <Clock className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Historique</span>
            </button>

            <button
              onClick={() => setCurrentView('parametres')}
              className={`flex flex-col items-center justify-center py-2 px-3 transition-colors ${
                currentView === 'parametres' 
                  ? 'text-orange-600' 
                  : 'text-slate-400'
              }`}
            >
              <Settings className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Paramètres</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}
