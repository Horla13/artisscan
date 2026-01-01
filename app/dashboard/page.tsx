'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Camera, LayoutDashboard, Clock, ScanLine, Trash2, Settings, Download, X, TrendingUp, Crown, AlertCircle, Receipt, FolderKanban, Plus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getUserProfile, canUserScan, canExportCSV, hasChantierAccess, getTierDisplayName, getTierBadgeColor, updateSubscriptionTier, type SubscriptionTier } from '@/lib/subscription';

interface Invoice {
  id: string;
  entreprise: string;
  montant_ht: number;
  montant_ttc: number;
  date_facture: string;
  description: string;
  categorie?: string;
  nom_chantier?: string;
  project_id?: string;
  created_at: string;
}

interface Project {
  id: string;
  user_id: string;
  nom: string;
  client: string;
  budget_alloue: number;
  statut: 'en_cours' | 'termine' | 'annule';
  date_debut: string;
  date_fin?: string;
  created_at: string;
  updated_at: string;
}

interface ProjectStats {
  id: string;
  nom: string;
  client: string;
  budget_alloue: number;
  budget_consomme: number;
  budget_restant: number;
  nombre_factures: number;
  pourcentage_consomme: number;
  statut: string;
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
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [pendingInvoiceData, setPendingInvoiceData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // États pour la gestion des projets
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsStats, setProjectsStats] = useState<ProjectStats[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [newProject, setNewProject] = useState({
    nom: '',
    client: '',
    budget_alloue: ''
  });

  // États pour la gestion des abonnements
  const [userTier, setUserTier] = useState<SubscriptionTier>('free');
  const [canScan, setCanScan] = useState(true);
  const [remainingScans, setRemainingScans] = useState(5);
  const [nomChantier, setNomChantier] = useState('');
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Charger le profil utilisateur et vérifier les limites dès que la session est prête
  useEffect(() => {
    const initializeProfile = async () => {
      setIsLoadingProfile(true);
      
      // Attendre que la session soit confirmée
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        await checkSubscriptionLimits();
      }
      
      setIsLoadingProfile(false);
    };

    initializeProfile();

    // Écouter les changements de session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        checkSubscriptionLimits();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkSubscriptionLimits = async () => {
    try {
      const profile = await getUserProfile();
      if (profile) {
        setUserTier(profile.subscription_tier);
      }

      const scanStatus = await canUserScan();
      // Ne pas bloquer si les données sont undefined
      setCanScan(scanStatus.canScan !== false); // true par défaut
      setRemainingScans(scanStatus.remaining >= 0 ? scanStatus.remaining : 5);
      if (scanStatus.tier) {
        setUserTier(scanStatus.tier);
      }
    } catch (error) {
      console.error('Erreur checkSubscriptionLimits:', error);
      // En cas d'erreur, ne JAMAIS bloquer l'utilisateur
      setCanScan(true);
      setRemainingScans(5);
      setUserTier('free');
    } finally {
      setIsLoadingProfile(false);
    }
  };

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

  // Stats calculées depuis les factures - SOURCE UNIQUE
  const stats = {
    totalHT: invoices.reduce((sum, inv) => sum + inv.montant_ht, 0),
    totalTTC: invoices.reduce((sum, inv) => sum + inv.montant_ttc, 0),
    tvaRecuperable: invoices.reduce((sum, inv) => sum + (inv.montant_ttc - inv.montant_ht), 0),
    nombreFactures: invoices.length
  };

  // Log des stats pour diagnostic
  useEffect(() => {
    console.log('📊 === STATS CALCULÉES ===');
    console.log('Nombre de factures dans invoices:', invoices.length);
    console.log('Total HT:', stats.totalHT, '€');
    console.log('Total TTC:', stats.totalTTC, '€');
    console.log('TVA récupérable:', stats.tvaRecuperable, '€');
  }, [invoices]);

  // Données pour le graphique des 7 derniers jours (TTC) - VERSION CORRIGÉE
  const getLast7DaysData = () => {
    console.log('🔍 === DÉBUT GÉNÉRATION GRAPHIQUE 7 JOURS ===');
    console.log('📊 Nombre total de factures chargées:', invoices.length);
    
    // 🔍 DIAGNOSTIC : Afficher TOUTES les dates de factures
    console.log('📅 === TOUTES LES DATES DE FACTURES DANS LA BASE ===');
    invoices.forEach((inv, index) => {
      if (inv.date_facture) {
        const factureDate = new Date(inv.date_facture);
        console.log(`${index + 1}. ${inv.entreprise}: ${inv.date_facture} → ${factureDate.toLocaleDateString('fr-FR')} (${inv.montant_ttc}€)`);
      } else {
        console.log(`${index + 1}. ${inv.entreprise}: PAS DE DATE`);
      }
    });
    console.log('📅 === FIN LISTE DES DATES ===');
    
    // 1️⃣ CRÉER LE TABLEAU DES 7 DERNIERS JOURS
    const chartData = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset à minuit pour comparaison propre
    
    console.log('📅 Aujourd\'hui (minuit):', today.toLocaleDateString('fr-FR'));
    
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - i);
      targetDate.setHours(0, 0, 0, 0); // Reset à minuit
      
      // Format français COMPLET pour comparaison (ex: "01/01/2025")
      const targetDateStr = targetDate.toLocaleDateString('fr-FR');
      
      // Format court pour affichage (lun. 26, mar. 27...)
      const displayDate = targetDate.toLocaleDateString('fr-FR', { 
        weekday: 'short', 
        day: 'numeric' 
      });
      
      // 2️⃣ CHERCHER TOUTES LES FACTURES DE CE JOUR (IGNORER L'HEURE)
      let dayTotal = 0;
      let dayCount = 0;
      
      invoices.forEach(invoice => {
        if (invoice.date_facture) {
          // ✅ CORRECTION : Créer un objet Date et utiliser toLocaleDateString
          const invoiceDate = new Date(invoice.date_facture);
          invoiceDate.setHours(0, 0, 0, 0); // Reset à minuit
          const invoiceDateStr = invoiceDate.toLocaleDateString('fr-FR');
          
          // Comparaison STRICTE des dates (format français DD/MM/YYYY)
          if (invoiceDateStr === targetDateStr) {
            dayTotal += invoice.montant_ttc || 0;
            dayCount++;
            console.log(`  ✅ Match trouvé: ${invoice.entreprise} - ${invoice.montant_ttc}€ (${invoiceDateStr})`);
          }
        }
      });
      
      console.log(`📅 ${displayDate} (${targetDateStr}): ${dayCount} facture(s) = ${dayTotal.toFixed(2)}€`);
      
      // 3️⃣ AJOUTER AU TABLEAU (0 si pas de facture)
      chartData.push({
        date: displayDate,
        montant: dayTotal
      });
    }
    
    console.log('📊 === DONNÉES FINALES POUR LE GRAPHIQUE ===');
    console.log('Données graphique:', chartData);
    console.log('✅ Total des 7 jours:', chartData.reduce((sum, day) => sum + day.montant, 0).toFixed(2), '€');
    console.log('✅ === FIN GÉNÉRATION ===');
    
    return chartData;
  };

  // Toast helper
  const showToastMessage = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Charger les factures depuis Supabase - SOURCE UNIQUE DE DONNÉES
  const loadInvoices = async () => {
    console.log('📥 === DÉBUT CHARGEMENT FACTURES SUPABASE ===');
    setLoadingInvoices(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 User ID:', user?.id);
      
      if (user) {
        console.log('🔍 Requête Supabase: scans WHERE user_id =', user.id);
        const { data, error } = await supabase
          .from('scans')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('❌ Erreur Supabase:', error);
          throw error;
        }
        
        console.log('✅ Factures reçues de Supabase:', data?.length || 0);
        console.log('📋 Détail des factures:', data?.map(inv => ({
          id: inv.id,
          entreprise: inv.entreprise,
          date_facture: inv.date_facture,
          created_at: inv.created_at,
          montant_ht: inv.montant_ht,
          montant_ttc: inv.montant_ttc
        })));
        
        setInvoices(data || []);
        console.log('💾 État invoices mis à jour avec', data?.length || 0, 'factures');
      } else {
        console.warn('⚠️ Aucun utilisateur connecté');
      }
    } catch (err) {
      console.error('❌ Erreur chargement factures:', err);
    } finally {
      setLoadingInvoices(false);
      console.log('✅ === FIN CHARGEMENT FACTURES ===');
    }
  };

  // Charger les projets depuis Supabase
  const loadProjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setProjects(data || []);
      }
    } catch (err) {
      console.error('Erreur chargement projets:', err);
    }
  };

  // Charger les stats des projets
  const loadProjectsStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Charger les projets avec leurs stats
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', user.id)
          .eq('statut', 'en_cours')
          .order('created_at', { ascending: false });

        if (projectsError) throw projectsError;

        // Pour chaque projet, calculer les stats
        const statsPromises = (projectsData || []).map(async (project) => {
          const { data: scansData, error: scansError } = await supabase
            .from('scans')
            .select('montant_ttc')
            .eq('project_id', project.id);

          if (scansError) throw scansError;

          const budget_consomme = (scansData || []).reduce((sum, scan) => sum + (scan.montant_ttc || 0), 0);
          const budget_restant = project.budget_alloue - budget_consomme;
          const pourcentage_consomme = project.budget_alloue > 0 
            ? (budget_consomme / project.budget_alloue * 100) 
            : 0;

          return {
            id: project.id,
            nom: project.nom,
            client: project.client,
            budget_alloue: project.budget_alloue,
            budget_consomme,
            budget_restant,
            nombre_factures: scansData?.length || 0,
            pourcentage_consomme,
            statut: project.statut
          };
        });

        const stats = await Promise.all(statsPromises);
        setProjectsStats(stats);
      }
    } catch (err) {
      console.error('Erreur chargement stats projets:', err);
    }
  };

  // Créer un nouveau projet
  const createProject = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const budget = parseFloat(newProject.budget_alloue);
      if (isNaN(budget) || budget <= 0) {
        showToastMessage('Budget invalide', 'error');
        return;
      }

      const { error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          nom: newProject.nom,
          client: newProject.client,
          budget_alloue: budget
        });

      if (error) throw error;

      showToastMessage('Projet créé avec succès !', 'success');
      setShowCreateProjectModal(false);
      setNewProject({ nom: '', client: '', budget_alloue: '' });
      await loadProjects();
      await loadProjectsStats();
    } catch (err) {
      console.error('Erreur création projet:', err);
      showToastMessage('Erreur lors de la création du projet', 'error');
    }
  };

  // Charger au montage ET changement de vue
  useEffect(() => {
    console.log('🔄 useEffect déclenché - currentView:', currentView);
    if (currentView === 'historique' || currentView === 'dashboard' || currentView === 'projets') {
      console.log('📥 Chargement des factures depuis Supabase...');
      loadInvoices();
      loadProjects();
      loadProjectsStats();
    }
  }, [currentView]);

  // Charger les factures et projets au montage initial
  useEffect(() => {
    console.log('🚀 Montage initial du Dashboard');
    console.log('📥 Chargement initial des factures et projets...');
    loadInvoices();
    loadProjects();
    loadProjectsStats();
  }, []);

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
    // ✅ CORRECTION 2: Dégrisé si Pro ou Business
    const canExport = userTier === 'pro' || userTier === 'business';
    
    if (!canExport) {
      showToastMessage('📊 Export CSV disponible uniquement en Pro et Business', 'error');
      return;
    }

    if (invoices.length === 0) {
      showToastMessage('❌ Aucune facture à exporter', 'error');
      return;
    }

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

    showToastMessage('✅ Export CSV réussi !', 'success');
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

      // NE PAS sauvegarder automatiquement - Ouvrir la modale de validation
      setPendingInvoiceData(data);
      setShowValidationModal(true);

    } catch (err: any) {
      console.error('Erreur:', err);
      showToastMessage(err.message || 'Erreur lors de l\'analyse', 'error');
      setError(err.message || 'Erreur lors de l\'analyse de la facture');
    } finally {
      setAnalyzing(false);
    }
  };

  // Nouvelle fonction : Valider et enregistrer la facture
  const validateAndSaveInvoice = async () => {
    if (!pendingInvoiceData) return;

    try {
      // Sauvegarder dans Supabase
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        showToastMessage('❌ Utilisateur non connecté', 'error');
        return;
      }

      // Validation des données
      const montantHT = parseFloat(pendingInvoiceData.montant_ht);
      const montantTTC = parseFloat(pendingInvoiceData.montant_ttc);

      if (isNaN(montantHT) || montantHT < 0) {
        showToastMessage('❌ Montant HT invalide', 'error');
        return;
      }

      if (isNaN(montantTTC) || montantTTC < 0) {
        showToastMessage('❌ Montant TTC invalide', 'error');
        return;
      }

      // Préparer les données pour l'insertion
      const invoiceData = {
        user_id: user.id,
        entreprise: pendingInvoiceData.entreprise || 'Non spécifié',
        montant_ht: montantHT,
        montant_ttc: montantTTC,
        date_facture: pendingInvoiceData.date || new Date().toISOString(),
        description: pendingInvoiceData.description || '',
        categorie: pendingInvoiceData.categorie || 'Non classé',
        nom_chantier: nomChantier || null,
        project_id: selectedProjectId || null, // ✅ NOUVEAU : Affecter au projet sélectionné
      };

      console.log('📤 Envoi données à Supabase:', invoiceData);

      const { data, error } = await supabase
        .from('scans')
        .insert([invoiceData])
        .select();

      if (error) {
        console.error('❌ Erreur Supabase:', error);
        // ✅ CORRECTION 4: Message d'erreur précis
        if (error.code === '400' || error.code === 'PGRST116') {
          showToastMessage(`❌ Erreur 400: ${error.message || 'Données invalides'}. Vérifiez les champs.`, 'error');
        } else {
          showToastMessage(`❌ Erreur: ${error.message || 'Erreur base de données'}`, 'error');
        }
        return;
      }

      console.log('✅ Facture enregistrée:', data);

      // Fermer la modale
      setShowValidationModal(false);
      setPendingInvoiceData(null);

      // Toast de succès
      showToastMessage('✅ Facture enregistrée !', 'success');

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }

      // ✅ Rafraîchissement immédiat + Reload pour compteur
      console.log('🔄 Rafraîchissement des données...');
      await loadInvoices();
      await loadProjectsStats(); // ✅ Rafraîchir les stats des projets
      await checkSubscriptionLimits();
      console.log('✅ Données rafraîchies');
      
      // ✅ Force le rechargement complet pour garantir la mise à jour du compteur
      setTimeout(() => {
        window.location.reload();
      }, 1500); // Délai pour voir le toast de succès

    } catch (err: any) {
      console.error('❌ Erreur sauvegarde:', err);
      // ✅ CORRECTION 4: Message d'erreur détaillé
      showToastMessage(`❌ Erreur: ${err.message || 'Erreur lors de l\'enregistrement'}`, 'error');
    }
  };
  

  const triggerFileInput = () => {
    // Vérifier SEULEMENT si on affiche la modale (ne pas bloquer le bouton)
    // La modale s'affiche uniquement si vraiment >= 5 scans
    if (!isLoadingProfile && userTier === 'free' && remainingScans === 0 && stats.nombreFactures >= 5) {
      setShowLimitModal(true);
      return;
    }
    // Sinon, toujours permettre le scan
    fileInputRef.current?.click();
  };

    return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">ArtisScan Expert</h1>
              <p className="text-sm text-slate-500 mt-1">Gestion comptable intelligente</p>
      </div>
            {/* Badge du plan à droite */}
            {!isLoadingProfile && (
              <div>
                {userTier === 'free' ? (
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 mb-1">
                      <span className="text-sm font-semibold">Plan Gratuit</span>
                    </div>
                    {remainingScans >= 0 && (
                      <span className="text-xs text-slate-500">{remainingScans}/5 scans restants</span>
                    )}
                  </div>
                ) : (
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${getTierBadgeColor(userTier)}`}>
                    <Crown className="w-4 h-4" />
                    <span className="text-sm font-semibold">Plan {getTierDisplayName(userTier)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 pb-24">
        {/* DASHBOARD */}
        {currentView === 'dashboard' && (
          <div className="space-y-6 fade-in">
            {/* Stats principales - 3 cartes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Carte 1 : Total HT */}
              <div className="card-clean rounded-2xl p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Total HT (Mois)</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {stats.totalHT.toLocaleString('fr-FR', { 
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })} €
                    </p>
                    <p className="text-xs text-slate-400 mt-2">{stats.nombreFactures} factures</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#ff6600">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Carte 2 : TVA récupérable */}
              <div className="card-clean rounded-2xl p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">TVA récupérable</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {stats.tvaRecuperable.toLocaleString('fr-FR', { 
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })} €
                    </p>
                    <p className="text-xs text-slate-400 mt-2">TVA 20%</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6" style={{ color: '#ff6600' }} />
                  </div>
                </div>
              </div>

              {/* Carte 3 : Total TTC (HARMONISÉE) */}
              <div className="card-clean rounded-2xl p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Total TTC (Mois)</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {stats.totalTTC.toLocaleString('fr-FR', { 
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })} €
                    </p>
                    <p className="text-xs text-slate-400 mt-2">Total à payer</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center">
                    <Receipt className="w-6 h-6" style={{ color: '#ff6600' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Graphique 7 derniers jours (TTC) */}
            <div className="card-clean rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Dépenses TTC des 7 derniers jours</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={(() => {
                  const chartData = getLast7DaysData();
                  console.log('🎨 Rendu graphique avec données:', chartData);
                  return chartData;
                })()}>
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
                      if (value === undefined) return ['0.00 €', 'Montant TTC'];
                      return [`${value.toFixed(2)} €`, 'Montant TTC'];
                    }}
                  />
                  <Bar dataKey="montant" fill="#ff6600" radius={[8, 8, 0, 0]} />
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
              
              {/* Champ Chantier pour Business */}
              {hasChantierAccess(userTier) && (
                <div className="mb-6 max-w-md mx-auto">
                  <label htmlFor="nomChantier" className="block text-sm font-medium text-slate-700 mb-2 text-left">
                    Nom du Chantier (optionnel)
                  </label>
                  <input
                    id="nomChantier"
                    type="text"
                    value={nomChantier}
                    onChange={(e) => setNomChantier(e.target.value)}
                    placeholder="Ex: Rénovation Appartement Paris 15"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-white text-slate-900"
                  />
                  <p className="text-xs text-slate-500 mt-2 text-left">
                    Permet de filtrer et analyser la rentabilité par chantier
                  </p>
          </div>
        )}

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
                disabled={invoices.length === 0 || (userTier === 'free')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
                  invoices.length === 0 || userTier === 'free'
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-orange-500 text-white hover:bg-orange-600'
                }`}
                title={userTier === 'free' ? 'Export CSV disponible en Pro et Business' : 'Exporter en CSV'}
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
                  <div key={invoice.id} className="card-clean rounded-xl p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-slate-900 text-lg">{invoice.entreprise}</h4>
                          {invoice.categorie && (
                            <span className="inline-block px-2 py-1 text-xs font-medium bg-orange-50 text-orange-700 rounded">
                              {invoice.categorie}
                      </span>
                          )}
                    </div>
                        <p className="text-xs text-slate-400">
                          {new Date(invoice.date_facture).toLocaleDateString('fr-FR')}
                        </p>
                    </div>
                      <button
                        onClick={() => confirmDelete(invoice.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>

                    {/* ✅ Tableau responsive avec colonnes cachées sur mobile */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-3 p-3 bg-slate-50 rounded-lg">
                      <div>
                        <span className="text-xs text-slate-500 uppercase font-medium block mb-1">Montant HT</span>
                        <span className="font-semibold text-slate-900 text-base">
                          {invoice.montant_ht.toLocaleString('fr-FR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })} €
                      </span>
                    </div>
                      <div className="hidden md:block">
                        <span className="text-xs text-slate-500 uppercase font-medium block mb-1">TVA</span>
                        <span className="font-semibold text-orange-600 text-base">
                          {(invoice.montant_ttc - invoice.montant_ht).toLocaleString('fr-FR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })} €
                      </span>
                    </div>
                      <div>
                        <span className="text-xs text-slate-500 uppercase font-medium block mb-1">Montant TTC</span>
                        <span className="font-semibold text-slate-900 text-lg md:text-base">
                          {invoice.montant_ttc.toLocaleString('fr-FR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })} €
                      </span>
                    </div>
                  </div>

                    {/* ✅ Description cachée sur mobile pour gagner de l'espace */}
                    {invoice.description && (
                      <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded hidden md:block">
                        <p className="text-xs text-blue-700 font-medium mb-1">DESCRIPTION</p>
                        <p className="text-sm text-slate-700">
                          {invoice.description}
                        </p>
                </div>
              )}

                    {/* Nom du chantier si présent */}
                    {invoice.nom_chantier && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-medium">Chantier:</span>
                        <span>{invoice.nom_chantier}</span>
            </div>
          )}
        </div>
                ))}
              </div>
            )}
            </div>
          )}

        {/* PROJETS / CHANTIERS */}
        {currentView === 'projets' && (
          <div className="fade-in space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Gestion des Projets</h2>
              <button
                onClick={() => setShowCreateProjectModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Nouveau Projet
              </button>
            </div>

            {/* Stats des projets */}
            {projectsStats.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projectsStats.map((project) => (
                  <div key={project.id} className="card-clean rounded-2xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 mb-1">{project.nom}</h3>
                        <p className="text-sm text-slate-500">Client : {project.client}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        project.statut === 'en_cours' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {project.statut === 'en_cours' ? '🟢 En cours' : 'Terminé'}
                      </div>
                    </div>

                    {/* Budget */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Budget alloué</span>
                        <span className="font-semibold text-slate-900">
                          {project.budget_alloue.toLocaleString('fr-FR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })} €
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Budget consommé</span>
                        <span className="font-semibold text-orange-600">
                          {project.budget_consomme.toLocaleString('fr-FR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })} €
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-700">Budget restant</span>
                        <span className={`font-bold text-lg ${
                          project.budget_restant < 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {project.budget_restant.toLocaleString('fr-FR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })} €
                        </span>
                      </div>

                      {/* Barre de progression */}
                      <div className="pt-2">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs text-slate-500">Consommation</span>
                          <span className={`text-xs font-semibold ${
                            project.pourcentage_consomme > 100 ? 'text-red-600' : 
                            project.pourcentage_consomme > 80 ? 'text-amber-600' : 
                            'text-green-600'
                          }`}>
                            {project.pourcentage_consomme.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              project.pourcentage_consomme > 100 ? 'bg-red-500' : 
                              project.pourcentage_consomme > 80 ? 'bg-amber-500' : 
                              'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(project.pourcentage_consomme, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Nombre de factures */}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">Factures associées</span>
                          <span className="font-medium text-slate-900">{project.nombre_factures}</span>
                        </div>
                      </div>

                      {/* Alerte si budget dépassé */}
                      {project.budget_restant < 0 && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-700 font-medium">
                            ⚠️ Budget dépassé de {Math.abs(project.budget_restant).toLocaleString('fr-FR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })} €
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card-clean rounded-2xl p-12 text-center">
                <FolderKanban className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Aucun projet actif</h3>
                <p className="text-slate-500 mb-6">
                  Créez votre premier projet pour suivre vos budgets et dépenses par chantier
                </p>
                <button
                  onClick={() => setShowCreateProjectModal(true)}
                  className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
                >
                  + Créer mon premier projet
                </button>
              </div>
            )}
          </div>
        )}

        {/* PARAMÈTRES */}
        {currentView === 'parametres' && (
          <div className="fade-in space-y-4">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Paramètres</h2>
            
            {/* Informations sur le plan actuel */}
            <div className="card-clean rounded-2xl p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Votre Abonnement</h3>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Plan actuel</p>
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${getTierBadgeColor(userTier)}`}>
                    <Crown className="w-4 h-4" />
                    <span className="font-semibold">{getTierDisplayName(userTier)}</span>
                  </div>
        </div>
                {userTier === 'free' && (
                  <Link
                    href="/#tarification"
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                  >
                    Passer à Pro
                  </Link>
                )}
              </div>
              {userTier === 'free' && (
                <p className="text-sm text-slate-500">
                  {remainingScans >= 0 ? `${remainingScans} scans restants ce mois` : 'Limite de scans atteinte'}
                </p>
          )}
        </div>

            {/* Simulateur de Test - Mode Développeur */}
            <div className="card-clean rounded-2xl p-6 border-2 border-amber-200 bg-amber-50">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-slate-900">Mode Test (Développeur)</h3>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Testez les différents plans d'abonnement en simulant un changement de tier
              </p>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    await updateSubscriptionTier('free');
                    await checkSubscriptionLimits();
                    showToastMessage('Plan changé en FREE', 'success');
                  }}
                  className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                >
                  FREE
                </button>
                <button
                  onClick={async () => {
                    await updateSubscriptionTier('pro');
                    await checkSubscriptionLimits();
                    showToastMessage('Plan changé en PRO 🎉', 'success');
                  }}
                  className="flex-1 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  PRO
                </button>
                <button
                  onClick={async () => {
                    await updateSubscriptionTier('business');
                    await checkSubscriptionLimits();
                    showToastMessage('Plan changé en BUSINESS 👑', 'success');
                  }}
                  className="flex-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  BUSINESS
                </button>
              </div>
              <p className="text-xs text-amber-700 mt-3">
                ⚠️ Cette section est uniquement pour tester les fonctionnalités. À supprimer en production.
                </p>
              </div>

            <div className="card-clean rounded-2xl p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Export & Données</h3>
              <button
                onClick={exportToCSV}
                disabled={invoices.length === 0 || userTier === 'free'}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors font-medium ${
                  invoices.length === 0 || userTier === 'free'
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-orange-500 text-white hover:bg-orange-600'
                }`}
                title={userTier === 'free' ? 'Export CSV disponible en Pro et Business' : 'Exporter en CSV'}
              >
                <Download className="w-5 h-5" />
                Exporter toutes les factures (CSV)
              </button>
              {userTier === 'free' ? (
                <p className="text-sm text-amber-600 mt-2 font-medium">
                  ⚠️ Export CSV disponible en plan Pro ou Business
                </p>
              ) : (
                <p className="text-sm text-slate-500 mt-2">
                  Format compatible avec votre comptable
                </p>
              )}
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

      {/* Modale de limitation Free */}
      {showLimitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full slide-up">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Limite de scans atteinte</h3>
              <p className="text-slate-600">
                Vous avez utilisé vos <strong>5 scans gratuits</strong> ce mois.
              </p>
            </div>

            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-6">
              <h4 className="font-semibold text-slate-900 mb-2">Passez au plan Pro pour :</h4>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                  <span><strong>Scans illimités</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                  <span>Export CSV illimité</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                  <span>Catégorisation IA automatique</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                  <span>Graphiques & statistiques avancées</span>
                </li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowLimitModal(false)}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
              >
                Plus tard
              </button>
              <Link
                href="/#tarification"
                className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-semibold text-center"
              >
                Passer à Pro
              </Link>
          </div>
            </div>
            </div>
      )}

      {/* Modale de validation des données scannées */}
      {showValidationModal && pendingInvoiceData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Vérification de la facture</h3>
              <button
                onClick={() => {
                  setShowValidationModal(false);
                  setPendingInvoiceData(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <p className="text-sm text-slate-600 mb-6">
              Vérifiez et modifiez les informations si nécessaire avant de valider l'enregistrement.
            </p>

            <div className="space-y-4">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Date de la facture
                </label>
                <input
                  type="date"
                  value={pendingInvoiceData.date ? pendingInvoiceData.date.split('T')[0] : ''}
                  onChange={(e) => setPendingInvoiceData({
                    ...pendingInvoiceData,
                    date: e.target.value
                  })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {/* Nom du fournisseur / Entreprise */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nom du fournisseur
                </label>
                <input
                  type="text"
                  value={pendingInvoiceData.entreprise || ''}
                  onChange={(e) => setPendingInvoiceData({
                    ...pendingInvoiceData,
                    entreprise: e.target.value
                  })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Nom de l'entreprise"
                />
              </div>

              {/* Montant HT */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Montant HT (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={pendingInvoiceData.montant_ht || ''}
                  onChange={(e) => setPendingInvoiceData({
                    ...pendingInvoiceData,
                    montant_ht: e.target.value
                  })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              {/* TVA calculée automatiquement */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  TVA (€) - Calculée automatiquement
                </label>
                <input
                  type="text"
                  value={pendingInvoiceData.montant_ttc && pendingInvoiceData.montant_ht 
                    ? (parseFloat(pendingInvoiceData.montant_ttc) - parseFloat(pendingInvoiceData.montant_ht)).toFixed(2)
                    : '0.00'}
                  readOnly
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-600"
                />
              </div>

              {/* Montant TTC */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Montant TTC (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={pendingInvoiceData.montant_ttc || ''}
                  onChange={(e) => setPendingInvoiceData({
                    ...pendingInvoiceData,
                    montant_ttc: e.target.value
                  })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              {/* Catégorie */}
              {pendingInvoiceData.categorie && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Catégorie
                  </label>
                  <input
                    type="text"
                    value={pendingInvoiceData.categorie || ''}
                    onChange={(e) => setPendingInvoiceData({
                      ...pendingInvoiceData,
                      categorie: e.target.value
                    })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Ex: Matériaux, Carburant..."
                  />
                </div>
              )}

              {/* Sélection du Projet/Chantier */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  🏗️ Affecter à un projet (optionnel)
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                >
                  <option value="">Aucun projet</option>
                  {projects.filter(p => p.statut === 'en_cours').map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.nom} ({project.client})
                    </option>
                  ))}
                </select>
                {projects.filter(p => p.statut === 'en_cours').length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Aucun projet actif. Créez-en un dans l'onglet Projets.
                  </p>
                )}
              </div>

              {/* Description */}
              {pendingInvoiceData.description && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={pendingInvoiceData.description || ''}
                    onChange={(e) => setPendingInvoiceData({
                      ...pendingInvoiceData,
                      description: e.target.value
                    })}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                    placeholder="Description de la facture..."
                  />
                      </div>
              )}
                    </div>

            {/* Bouton de validation */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <button
                onClick={validateAndSaveInvoice}
                className="w-full px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-semibold"
              >
                ✓ Valider et Enregistrer
              </button>
              <button
                onClick={() => {
                  setShowValidationModal(false);
                  setPendingInvoiceData(null);
                }}
                className="w-full mt-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
              >
                Annuler
              </button>
                      </div>
          </div>
        </div>
      )}

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

      {/* Modale de création de projet */}
      {showCreateProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Créer un nouveau projet</h3>
              <button
                onClick={() => {
                  setShowCreateProjectModal(false);
                  setNewProject({ nom: '', client: '', budget_alloue: '' });
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Nom du projet */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nom du projet / chantier *
                </label>
                <input
                  type="text"
                  value={newProject.nom}
                  onChange={(e) => setNewProject({ ...newProject, nom: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Ex: Rénovation Appartement Paris 15"
                  required
                />
              </div>

              {/* Client */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Client *
                </label>
                <input
                  type="text"
                  value={newProject.client}
                  onChange={(e) => setNewProject({ ...newProject, client: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Ex: M. Dupont"
                  required
                />
              </div>

              {/* Budget alloué */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Budget alloué (€) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newProject.budget_alloue}
                  onChange={(e) => setNewProject({ ...newProject, budget_alloue: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Ex: 50000.00"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  Le budget total prévu pour ce projet
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateProjectModal(false);
                  setNewProject({ nom: '', client: '', budget_alloue: '' });
                }}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={createProject}
                disabled={!newProject.nom || !newProject.client || !newProject.budget_alloue}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Créer le projet
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

            {/* Scanner central plus gros */}
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
              onClick={() => setCurrentView('projets')}
              className={`flex flex-col items-center justify-center py-2 px-3 transition-colors ${
                currentView === 'projets' 
                  ? 'text-orange-600' 
                  : 'text-slate-400'
              }`}
            >
              <FolderKanban className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Projets</span>
            </button>
      </div>
    </div>
      </nav>
    </div>
  );
}
