'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Camera, LayoutDashboard, Clock, ScanLine } from 'lucide-react';

export default function Dashboard() {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [currentView, setCurrentView] = useState('dashboard');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stats fictives pour démonstration
  const stats = {
    totalHT: 12450.00,
    tvaRecuperable: 2489.00,
    nombreFactures: 15
  };

  // Fonction de compression d'image
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

          // Redimensionner si trop grand
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

          // Compression qualité 0.7
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
      setError('Image trop lourde (>10MB). Essayez de reculer un peu votre appareil photo.');
      return;
    }

    setAnalyzing(true);
    setError('');
    setResult(null);

    try {
      // Compresser l'image
      const compressedImage = await compressImage(file);
      
      // Vérifier la taille après compression
      const compressedSize = (compressedImage.length * 3) / 4 / (1024 * 1024);
      if (compressedSize > 4) {
        setError('Image toujours trop lourde après compression. Essayez de reculer un peu.');
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
        }]);
      }

      // Haptic feedback sur mobile
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }

    } catch (err: any) {
      console.error('Erreur:', err);
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
          <h1 className="text-2xl font-bold text-slate-900">ArtisScan</h1>
          <p className="text-sm text-slate-500 mt-1">Gestion de factures intelligente</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {currentView === 'dashboard' && (
          <div className="space-y-6 fade-in">
            {/* Deux grandes cartes stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Total HT ce mois */}
              <div className="card-clean rounded-2xl p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Total HT ce mois</p>
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
                  <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                    <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* TVA à récupérer */}
              <div className="card-clean rounded-2xl p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">TVA à récupérer</p>
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
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Section Scanner */}
            <div className="card-clean rounded-2xl p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-50 flex items-center justify-center">
                <ScanLine className="w-10 h-10 text-slate-400" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Scanner une facture</h2>
              <p className="text-sm text-slate-500 mb-6">
                Prenez une photo de votre facture pour l'analyser automatiquement
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
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyse en cours...
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
                    <span className="text-sm font-semibold text-emerald-600">
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

        {currentView === 'historique' && (
          <div className="fade-in">
            <div className="card-clean rounded-2xl p-8 text-center">
              <Clock className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Historique</h2>
              <p className="text-slate-500">Vos factures apparaîtront ici</p>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-around py-2">
            {/* Tableau de bord */}
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex flex-col items-center justify-center py-2 px-4 transition-colors ${
                currentView === 'dashboard' 
                  ? 'text-emerald-600' 
                  : 'text-slate-400'
              }`}
            >
              <LayoutDashboard className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Tableau de bord</span>
            </button>

            {/* Scanner (bouton central plus gros) */}
            <button
              onClick={triggerFileInput}
              disabled={analyzing}
              className="flex flex-col items-center justify-center -mt-6 bg-emerald-600 text-white rounded-full p-4 shadow-lg hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50"
            >
              <Camera className="w-8 h-8" />
            </button>

            {/* Historique */}
            <button
              onClick={() => setCurrentView('historique')}
              className={`flex flex-col items-center justify-center py-2 px-4 transition-colors ${
                currentView === 'historique' 
                  ? 'text-emerald-600' 
                  : 'text-slate-400'
              }`}
            >
              <Clock className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Historique</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}
