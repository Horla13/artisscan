'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Camera, LayoutDashboard, Clock, ScanLine, Trash2, Settings, Download, X, TrendingUp, Crown, AlertCircle, Receipt, FolderKanban, Plus, FileDown, LogOut, Zap, Calendar, ChevronDown, Mail, Package, FileText, Folder } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getUserProfile, canUserScan, canExportCSV, getTierDisplayName, getTierBadgeColor, updateSubscriptionTier, type SubscriptionTier } from '@/lib/subscription';

interface Invoice {
  id: string;
  entreprise: string;
  montant_ht: number;
  total_amount: number;
  date_facture: string;
  description: string;
  categorie?: string;
  nom_chantier?: string;
  project_id?: string;
  created_at: string;
  moyen_paiement?: string;
}

interface Project {
  id: string;
  user_id: string;
  name: string;
  client: string;
  // @ts-ignore
  budget_alloue: number;
  status: 'en_cours' | 'termine' | 'annule' | 'archive';
  date_debut: string;
  date_fin?: string;
  created_at: string;
  updated_at: string;
}

interface ProjectStats {
  id: string;
  name: string;
  client: string;
  // @ts-ignore
  budget_alloue: number;
  total_expenses: number; // TTC
  budget_restant: number;
  nombre_factures: number;
  pourcentage_consomme: number;
  status: string;
}

const LOADING_MESSAGES = [
  'Analyse de la facture...',
  'Extraction des données...',
  'Calcul de la TVA...',
  'Reconnaissance du texte...',
  'Finalisation...'
];

export default function Dashboard() {
  const router = useRouter();
  const [analyzing, setAnalyzing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [currentView, setCurrentView] = useState('dashboard');
  const [showArchived, setShowArchived] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date_facture' | 'date_scan' | 'montant_ht' | 'total_amount' | 'categorie'>('date_facture');
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companySiret, setCompanySiret] = useState('');
  const [companyProfession, setCompanyProfession] = useState('');
  const [activationPending, setActivationPending] = useState(false);
  const [showForceAccess, setShowForceAccess] = useState(false);
  const [forceAccessClicks, setForceAccessClicks] = useState(0);

  // Charger les infos de l'entreprise depuis le localStorage au démarrage
  useEffect(() => {
    const savedLogo = localStorage.getItem('artisscan_company_logo');
    const savedName = localStorage.getItem('artisscan_company_name');
    const savedAddress = localStorage.getItem('artisscan_company_address');
    const savedSiret = localStorage.getItem('artisscan_company_siret');
    const savedProfession = localStorage.getItem('artisscan_company_profession');
    
    if (savedLogo) setCompanyLogo(savedLogo);
    if (savedName) setCompanyName(savedName);
    if (savedAddress) setCompanyAddress(savedAddress);
    if (savedSiret) setCompanySiret(savedSiret);
    if (savedProfession) setCompanyProfession(savedProfession);
  }, []);

  const handleLogout = async () => {
    if (window.confirm('🔒 Souhaitez-vous vraiment vous déconnecter ?')) {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        window.location.href = '/'; // Redirection vers l'accueil/login
      } catch (err: any) {
        showToastMessage(`Erreur: ${err.message}`, 'error');
      }
    }
  };

  // Helper pour formater les montants avec espaces (pas de /)
  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('fr-FR', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true 
    }).replace(/\u202F/g, ' ').replace(/\u00A0/g, ' ') + ' €';
  };

  // Composants Skeleton Loaders
  const ProjectCardSkeleton = () => (
    <div className="card-clean rounded-2xl p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="h-6 bg-slate-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-slate-100 rounded w-1/2"></div>
        </div>
        <div className="h-6 w-20 bg-slate-200 rounded-full"></div>
      </div>
      <div className="space-y-4 mt-6">
        <div className="h-4 bg-slate-200 rounded w-full"></div>
        <div className="h-4 bg-slate-200 rounded w-5/6"></div>
        <div className="h-16 bg-slate-100 rounded-lg"></div>
      </div>
    </div>
  );

  const InvoiceCardSkeleton = () => (
    <div className="card-clean rounded-xl p-4 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-5 bg-slate-200 rounded w-1/3"></div>
        <div className="h-4 w-16 bg-slate-100 rounded-full"></div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-slate-100 rounded w-full"></div>
        <div className="h-4 bg-slate-100 rounded w-2/3"></div>
      </div>
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
        <div className="h-6 bg-slate-200 rounded w-24"></div>
        <div className="h-4 w-12 bg-slate-100 rounded"></div>
      </div>
    </div>
  );

  const StatsCardSkeleton = () => (
    <div className="card-clean rounded-2xl p-6 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-4 bg-slate-200 rounded w-20 mb-2"></div>
          <div className="h-8 bg-slate-200 rounded w-32 mb-2"></div>
          <div className="h-3 bg-slate-100 rounded w-24"></div>
        </div>
        <div className="w-12 h-12 rounded-full bg-slate-100"></div>
      </div>
    </div>
  );

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [showDeleteProjectModal, setShowDeleteProjectModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [pendingInvoiceData, setPendingInvoiceData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // États pour la gestion des dossiers
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsStats, setProjectsStats] = useState<ProjectStats[]>([]);
  // Multi-sélection mois (Chronologie avancée)
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [showMonthSelector, setShowMonthSelector] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [comptableEmail, setComptableEmail] = useState('');
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [newProject, setNewProject] = useState({
    nom: '',
    client: '',
    // @ts-ignore
    budget_alloue: ''
  });

  // États pour la gestion des abonnements
  const [userTier, setUserTier] = useState<SubscriptionTier>('pro');
  const [canScan, setCanScan] = useState(true);
  const [remainingScans, setRemainingScans] = useState(-1);
  // (Dossiers supprimés : organisation automatique par mois)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // États pour les filtres de l'historique (Bloc 3)
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [customCategory, setCustomCategory] = useState('');

  // --- Chronologie (Mois/Année) ---
  const getMonthKey = (raw: string | undefined) => {
    if (!raw) return '';
    if (typeof raw === 'string' && /^\d{4}-\d{2}/.test(raw)) return raw.substring(0, 7); // YYYY-MM
    const d = new Date(raw);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const getMonthLabel = (monthKey: string) => {
    // monthKey = YYYY-MM
    if (!/^\d{4}-\d{2}$/.test(monthKey)) return monthKey || 'Mois inconnu';
    const d = new Date(`${monthKey}-01T00:00:00`);
    const label = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(d);
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const availableMonths = useMemo(() => {
    const keys = invoices
      .map((inv) => getMonthKey(inv.date_facture || inv.created_at))
      .filter(Boolean);
    return Array.from(new Set(keys)).sort((a, b) => b.localeCompare(a));
  }, [invoices]);

  // Par défaut: sélectionner le mois courant ou le plus récent
  useEffect(() => {
    if (selectedMonths.length > 0) return;
    if (availableMonths.length === 0) return;
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const defaultMonth = availableMonths.includes(currentKey) ? currentKey : availableMonths[0];
    setSelectedMonths([defaultMonth]);
  }, [availableMonths, selectedMonths.length]);

  // Fonction pour tout rafraîchir (Données)
  const refreshAllData = async () => {
    console.log('🔄 Rafraîchissement global des données demandé...');
    setLoadingInvoices(true);
    try {
      await Promise.all([
        loadInvoices(),
        checkSubscriptionLimits()
      ]);
      showToastMessage('Données actualisées', 'success');
    } catch (err) {
      showToastMessage('Erreur lors de l\'actualisation', 'error');
    } finally {
      setLoadingInvoices(false);
    }
  };

  // 🔒 SÉCURITÉ DASHBOARD : Vérification stricte de l'authentification et du plan PRO
  useEffect(() => {
    const secureAccess = async () => {
      setIsLoadingProfile(true);
      
      try {
        console.log('🔒 SÉCURITÉ: Vérification accès Dashboard...');
        
        // 1. Vérifier l'utilisateur connecté avec getUser() (plus fiable)
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('❌ SÉCURITÉ: Erreur auth:', JSON.stringify(authError));
          setError(`Erreur authentification: ${authError.message}`);
        }
        
        if (!user) {
          console.log('🚫 SÉCURITÉ: Aucun utilisateur connecté → Redirection /login');
          window.location.href = '/login?redirect=/dashboard';
          return;
        }
        
        console.log('✅ SÉCURITÉ: Utilisateur connecté:', user.email);
        setUserEmail(user.email || null);
        
        // 2. Vérifier le plan dans la table profiles
        console.log('📊 SÉCURITÉ: Récupération du profil...');
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profileError) {
          console.error('❌ SÉCURITÉ: Erreur profil:', JSON.stringify(profileError));
          setError(`Erreur récupération profil: ${profileError.message} - ${JSON.stringify(profileError)}`);
          setIsLoadingProfile(false);
          return;
        }
        
        console.log('📋 SÉCURITÉ: Profil récupéré:', JSON.stringify(profile, null, 2));
        
        // 3. Vérification STRICTE du plan PRO
        const planExact = profile?.plan;
        console.log('🔍 SÉCURITÉ: Plan exact:', `"${planExact}"`, typeof planExact);
        
        if (planExact !== 'pro') {
          console.log('⛔ SÉCURITÉ: Plan non-PRO détecté, blocage accès');
          setError(`⛔ Accès refusé : Votre plan est "${planExact}" mais doit être exactement "pro". Profil complet: ${JSON.stringify(profile)}`);
          setUserTier('free');
          setCanScan(false);
          setRemainingScans(0);
          setIsLoadingProfile(false);
          return;
        }
        
        // 4. Accès PRO confirmé
        console.log('🎉 SÉCURITÉ: Plan PRO confirmé → Accès autorisé');
        setUserTier('pro');
        setCanScan(true);
        setRemainingScans(-1);
        setActivationPending(false);
        
        await checkSubscriptionLimits();
        router.refresh?.();
        
      } catch (err: any) {
        console.error('💥 SÉCURITÉ: Exception:', err);
        setError(`Exception sécurité: ${err.message} - ${JSON.stringify(err)}`);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    secureAccess();

    // Écouter les changements de session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 SÉCURITÉ: Auth state change:', event);
      if (event === 'SIGNED_OUT') {
        setUserEmail(null);
        window.location.href = '/login';
      } else if (session) {
        setUserEmail(session.user.email || null);
        secureAccess(); // Re-vérifier l'accès
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Polling automatique pendant l'activation pour détecter plan='pro' et rediriger
  useEffect(() => {
    if (!activationPending) return;

    console.log('🔄 Démarrage du polling automatique (vérification toutes les 2s)');

    const interval = setInterval(async () => {
      console.log('🔍 Polling: Vérification statut PRO...');
      
      try {
        const profile = await getUserProfile();
        console.log('📊 Polling: Profil récupéré:', profile);
        
        // Vérification insensible à la casse
        const planLower = profile?.plan?.toLowerCase();
        const tierLower = profile?.subscription_tier?.toLowerCase();
        const statusLower = profile?.subscription_status?.toLowerCase();
        
        const isPro = planLower === 'pro' || 
                      tierLower === 'pro' || 
                      statusLower === 'active' ||
                      statusLower === 'trialing';
        
        if (profile && isPro) {
          console.log('✅ Statut PRO détecté (plan:', profile.plan, 'tier:', profile.subscription_tier, 'status:', profile.subscription_status, ')');
          
          // 1. Rafraîchir la session Supabase (VITAL)
          console.log('📡 Rafraîchissement de la session Supabase...');
          const { data, error } = await supabase.auth.refreshSession();
          
          if (error) {
            console.error('❌ Erreur refresh session:', error);
          } else {
            console.log('✅ Session rafraîchie avec succès');
          }
          
          // 2. Redirection automatique vers le Dashboard
          console.log('🚀 Redirection automatique vers /dashboard...');
          clearInterval(interval);
          setActivationPending(false);
          setUserTier('pro');
          window.location.href = '/dashboard';
        } else {
          console.log('⏳ Polling: Pas encore PRO, réessai dans 2s...');
        }
      } catch (err) {
        console.error('❌ Erreur polling:', err);
      }
    }, 2000);

    // Bouton de secours après 10 secondes
    const timer = setTimeout(() => {
      console.log('⏰ 10 secondes écoulées, affichage bouton secours');
      setShowForceAccess(true);
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [activationPending]);

  const checkSubscriptionLimits = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('session_id');

      console.log('🔍 checkSubscriptionLimits: Vérification utilisateur...');

      // Si retour de Stripe avec session_id, afficher l'écran d'activation
      if (sessionId) {
        console.log('🎯 Retour Stripe détecté (ID: ' + sessionId + ')');
        
        // Mise à jour préventive du profil (toujours en minuscules)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('profiles').update({ 
            plan: 'pro', // Toujours en minuscules
            updated_at: new Date().toISOString()
          }).eq('id', user.id);
        }

        setUserTier('pro');
        setCanScan(true);
        setRemainingScans(-1);
        setActivationPending(true); // Afficher l'écran d'activation temporaire
        setIsLoadingProfile(false);
        return;
      }

      // ✅ MODE PRO-ONLY: Tout utilisateur connecté est PRO
      console.log('✅ MODE PRO-ONLY: Utilisateur connecté → Accès PRO complet');
      
      setUserTier('pro');
      setCanScan(true);
      setRemainingScans(-1);
      setActivationPending(false);

    } catch (error) {
      console.error('❌ Erreur checkSubscriptionLimits:', error);
      // En cas d'erreur, on donne quand même l'accès PRO (mode PRO-only)
      console.log('⚠️ Erreur mais accès PRO accordé par défaut');
      setUserTier('pro');
      setCanScan(true);
      setRemainingScans(-1);
      setActivationPending(false);
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

  // Filtrer les factures (Chronologie + Recherche + Catégorie)
  const filteredInvoices = invoices.filter((inv) => {
    // 1. Filtre temporel multi-mois
    const invMonthKey = getMonthKey(inv.date_facture || inv.created_at);
    const matchMonth = selectedMonths.length === 0 || selectedMonths.includes(invMonthKey);
    
    // 2. Filtre par catégorie (Dropdown) - Version Robuste & Insensible à la casse
    const matchCategory = !categoryFilter || (() => {
      // Normalisation poussée : enlève TOUS les emojis et caractères spéciaux de ponctuation, puis minuscule
      const normalize = (text: string) => {
        if (!text) return '';
        return text
          .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02B}\u{1F030}-\u{1F093}\u{1F1E6}-\u{1F1FF}\u{1F191}-\u{1F251}\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu, '')
          .trim()
          .toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Enlever les accents
      };
      
      const filterNorm = normalize(categoryFilter);
      const invCatNorm = normalize(inv.categorie || 'non classe');

      // Si on filtre par "Autre", on montre "Autre" ET les catégories personnalisées
      if (filterNorm === 'autre') {
        const standards = ['materiaux', 'carburant', 'restaurant', 'outillage', 'fournitures', 'location', 'sous-traitance'];
        return invCatNorm === 'autre' || !standards.includes(invCatNorm);
      }

      return invCatNorm === filterNorm;
    })();
    
    // 3. Filtre par recherche (Barre de recherche)
    const searchLower = searchQuery.toLowerCase().trim();
    if (!searchLower) return matchMonth && matchCategory;

    // On cherche dans TOUS les champs textuels pour une flexibilité maximale
    const searchFields = [
      inv.entreprise || '',
      inv.description || '',
      inv.categorie || '',
      inv.nom_chantier || ''
    ].map(f => f.toLowerCase());

    const matchSearch = searchFields.some(field => field.includes(searchLower));

    return matchMonth && matchCategory && matchSearch;
  });

  // Fonction helper pour parser n'importe quel montant en nombre (Bloc 2)
  const parseAmount = (val: any) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const str = String(val).replace(',', '.').replace(/[^\d.-]/g, '');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  };

  // Formatage des montants pour affichage (Espace pour les milliers, signe € à la fin)
  const formatDisplayAmount = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseAmount(amount) : amount;
    return num.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + ' €';
  };

  // Stats calculées depuis les factures filtrées
  const stats = {
    totalHT: filteredInvoices.reduce((sum: number, inv: Invoice) => sum + parseAmount(inv.montant_ht), 0),
    totalTTC: filteredInvoices.reduce((sum: number, inv: Invoice) => sum + parseAmount(inv.total_amount), 0),
    tvaRecuperable: filteredInvoices.reduce((sum: number, inv: Invoice) => {
      const ttc = parseAmount(inv.total_amount);
      const ht = parseAmount(inv.montant_ht);
      return sum + (ttc - ht);
    }, 0),
    nombreFactures: filteredInvoices.length
  };

  // Log des stats pour diagnostic
  useEffect(() => {
    console.log('📊 === STATS CALCULÉES ===');
    console.log('Mois sélectionnés:', selectedMonths.length === 0 ? 'Tous' : selectedMonths.join(', '));
    console.log('Nombre de factures filtrées:', filteredInvoices.length);
    console.log('Total HT:', stats.totalHT, '€');
    console.log('Total TTC:', stats.totalTTC, '€');
    console.log('TVA récupérable:', stats.tvaRecuperable, '€');
  }, [filteredInvoices, selectedMonths]);

  // Données pour le graphique des 7 derniers jours (TTC) - VERSION DYNAMIQUE
  const getLast7DaysData = () => {
    console.log('🔍 === GÉNÉRATION GRAPHIQUE (DYNAMIQUE) ===');
    
    // Helper pour extraire YYYY-MM-DD sans décalage de fuseau horaire
    const getPureISODate = (raw: string | Date) => {
      if (!raw) return null;
      // Si c'est déjà une chaîne type "2021-01-01...", on prend les 10 premiers caractères
      if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
        return raw.substring(0, 10);
      }
      // Sinon on convertit en date et on prend les composants locaux
      const d = new Date(raw);
      if (isNaN(d.getTime())) return null;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const processedData: any[] = [];
    const now = new Date();
    
    // Générer les 7 derniers jours au format YYYY-MM-DD
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() - i);
      const targetDateStr = getPureISODate(targetDate);
      
      const label = targetDate.toLocaleDateString('fr-FR', { 
        weekday: 'short', 
        day: 'numeric' 
      });

      let dayTotal = 0;

      filteredInvoices.forEach(s => {
        const scanDateStr = getPureISODate(s.date_facture || s.created_at);
        if (scanDateStr === targetDateStr) {
          dayTotal += parseAmount(s.total_amount);
        }
      });

      processedData.push({
        date: label,
        montant: dayTotal,
        _iso: targetDateStr
      });
    }

    console.log("📊 Données du graphique:", processedData);
    return processedData;
  };

  // Mémoriser les données du graphique pour éviter les calculs inutiles et assurer la réactivité
  const chartData = useMemo(() => {
    return getLast7DaysData();
  }, [filteredInvoices]);

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
        
        console.log('Toutes les factures:', data);
        console.log('✅ Factures reçues de Supabase:', data?.length || 0);
        console.log('📋 Détail des factures:', data?.map(inv => ({
          id: inv.id,
          entreprise: inv.entreprise,
          date_facture: inv.date_facture,
          created_at: inv.created_at,
          montant_ht: inv.montant_ht,
          total_amount: inv.total_amount
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
    setLoadingProjects(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.log('💡 Info: Table projects non disponible');
          setProjects([]);
          return;
        }
        setProjects(data || []);
      }
    } catch (err) {
      console.log('💡 Info: Erreur silencieuse chargement projets');
    } finally {
      setLoadingProjects(false);
    }
  };

  // Charger les stats des projets
  const loadProjectsStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (projectsError) {
          // Silent log instead of console.error to avoid "red errors" in some environments
          console.log('💡 Info: Projets non chargés (table absente ou vide)');
          setProjectsStats([]);
          return;
        }

        if (!projectsData || projectsData.length === 0) {
          setProjectsStats([]);
          return;
        }

        const statsPromises = projectsData.map(async (project) => {
          try {
            console.log(`📊 Calcul des stats pour le projet: ${project.name} (${project.id})`);
            
            const { data: scansData, error: scansError } = await supabase
              .from('scans')
              .select('total_amount')
              .eq('project_id', project.id);

            if (scansError) {
              console.log(`💡 Info: Erreur scans pour projet ${project.id}:`, scansError);
            }

            // Robustesse maximale pour les calculs
            const invoicesList = scansData || [];
            const budgetConsomme = invoicesList.reduce((sum: number, scan: any) => sum + (Number(scan?.total_amount) || 0), 0);
            
            // @ts-ignore
            const budgetAlloue = Number(project?.budget_alloue) || 0;
            const budgetRestant = budgetAlloue - budgetConsomme;
            const pourcentageConsomme = budgetAlloue > 0 ? (budgetConsomme / budgetAlloue * 100) : 0;

            console.log(`✅ Stats projet ${project.name}: HT=${budgetConsomme}, Alloué=${budgetAlloue}, %=${pourcentageConsomme}`);

            return {
              id: project.id,
              name: project.name || 'Sans nom',
              client: project.client || 'Sans client',
              // @ts-ignore
              budget_alloue: budgetAlloue,
              total_expenses: budgetConsomme, // TTC
              budget_restant: budgetRestant,
              nombre_factures: invoicesList.length,
              pourcentage_consomme: pourcentageConsomme,
              status: project.status || 'en_cours'
            };
          } catch (err) {
            console.error(`❌ Erreur dans map stats projet:`, err);
            return null;
          }
        });

        const stats = (await Promise.all(statsPromises)).filter(s => s !== null) as ProjectStats[];
        setProjectsStats(stats);
      }
    } catch (err) {
      console.log('💡 Info: Erreur silencieuse calcul stats');
    }
  };

  // Créer un nouveau projet
  // Archiver/Désarchiver un projet
  const toggleArchiveProject = async (projectId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'archive' ? 'en_cours' : 'archive';
    const actionText = newStatus === 'archive' ? 'archiver' : 'restaurer';
    
    // Confirmation avant archivage
    if (window.confirm(`Êtes-vous sûr de vouloir ${actionText} ce projet ?`)) {
      try {
        const { error } = await supabase
          .from('projects')
          .update({ status: newStatus })
          .eq('id', projectId);

        if (error) throw error;

        showToastMessage(
          newStatus === 'archive' ? '📦 Projet archivé avec succès' : '✅ Projet restauré',
          'success'
        );
        
        await loadProjects();
        await loadProjectsStats();
      } catch (err: any) {
        console.error('Erreur archivage:', err);
        showToastMessage(`Erreur: ${err.message}`, 'error');
      }
    }
  };

  const createProject = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // @ts-ignore
      const budget = parseFloat(newProject.budget_alloue);
      if (isNaN(budget) || budget < 0) {
        showToastMessage('Budget invalide', 'error');
        return;
      }

      if (!newProject.nom.trim() || !newProject.client.trim()) {
        showToastMessage('Nom et Client sont obligatoires', 'error');
        return;
      }

      console.log('🏗️ Envoi des données:', { 
        name: newProject.nom.trim(), 
        client: newProject.client.trim(), 
        budget_alloue: budget,
        status: 'en_cours'
      });

      const { error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: newProject.nom.trim(),
          client: newProject.client.trim(),
          // @ts-ignore
          budget_alloue: budget,
          status: 'en_cours' // Forcer le statut à la création
        });

      if (error) {
        console.error('❌ Erreur DÉTAILLÉE création projet:', JSON.stringify(error, null, 2));
        throw error;
      }

      showToastMessage('Dossier créé avec succès !', 'success');
      // @ts-ignore
      setNewProject({ nom: '', client: '', budget_alloue: '' });
      
      console.log('🔄 Rechargement de la page pour actualiser l\'interface...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      console.error('❌ Erreur CAPTURÉE création projet:', err);
      showToastMessage(`Erreur lors de la création du dossier: ${err.message || 'Erreur inconnue'}`, 'error');
    }
  };

  // Charger au changement de vue (Chronologie)
  useEffect(() => {
    console.log('🔄 useEffect déclenché - currentView:', currentView);
    if (currentView === 'historique' || currentView === 'dashboard') {
      console.log('📥 Chargement des factures depuis Supabase...');
      loadInvoices();
    }
  }, [currentView]);

  // Charger les factures au montage initial
  useEffect(() => {
    console.log('🚀 Montage initial du Dashboard');
    console.log('📥 Chargement initial des factures...');
    loadInvoices();
  }, []);

  // Tri des factures
  const getSortedInvoices = () => {
    const sorted = [...filteredInvoices];
    
    switch (sortBy) {
      case 'date_facture':
        return sorted.sort((a, b) => 
          new Date(b.date_facture).getTime() - new Date(a.date_facture).getTime()
        );
      case 'date_scan':
        return sorted.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case 'montant_ht':
        return sorted.sort((a, b) => b.montant_ht - a.montant_ht);
      case 'total_amount':
        return sorted.sort((a, b) => b.total_amount - a.total_amount);
      case 'categorie':
        return sorted.sort((a, b) => 
          (a.categorie || '').localeCompare(b.categorie || '')
        );
      default:
        return sorted;
    }
  };

  // Résumé Chronologie (mois sélectionné via filtre)
  const monthSummary = {
    totalHT: stats.totalHT,
    totalTTC: stats.totalTTC,
    tva: stats.tvaRecuperable,
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

  // Confirmer suppression projet
  const confirmDeleteProject = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setProjectToDelete(id);
    setShowDeleteProjectModal(true);
  };

  // Supprimer un projet
  const deleteProject = async (deleteAll: boolean = false) => {
    if (!projectToDelete) return;

    try {
      if (deleteAll) {
        // Option B : Tout supprimer (Chantier + Factures)
        const { error: deleteScansError } = await supabase
          .from('scans')
          .delete()
          .eq('project_id', projectToDelete);

        if (deleteScansError) throw deleteScansError;
      } else {
        // Option A : Supprimer uniquement le chantier (préserver les factures)
        const { error: updateError } = await supabase
          .from('scans')
          .update({ project_id: null })
          .eq('project_id', projectToDelete);

        if (updateError) throw updateError;
      }

      // Supprimer le projet
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectToDelete);

      if (deleteError) throw deleteError;

      // Recharger les données
      await loadProjects();
      await loadProjectsStats();
      await loadInvoices();
      
      showToastMessage(deleteAll ? 'Dossier et factures supprimés !' : 'Dossier supprimé (factures conservées) !', 'success');
      setShowDeleteProjectModal(false);
      setProjectToDelete(null);
      
      // Reset sélection si le projet supprimé était dans les mois affichés
      setSelectedMonths([]);
    } catch (err) {
      console.error('Erreur suppression projet:', err);
      showToastMessage('Erreur lors de la suppression du dossier', 'error');
    }
  };

  // Export CSV
  const exportToCSV = (projectId?: string) => {
    const canExport = userTier === 'pro';
    
    if (!canExport) {
      showToastMessage('📊 Export CSV disponible uniquement en plan PRO', 'error');
      return;
    }

    // Export = ce que l'utilisateur voit (filtre mois + recherche + catégorie)
    const invoicesToExport = getSortedInvoices();

    if (invoicesToExport.length === 0) {
      showToastMessage('❌ Aucune facture à exporter', 'error');
      return;
    }

    const headers = ['Date Facture', 'Mois', 'Fournisseur', 'Catégorie', 'Description', 'Montant HT', 'Montant TVA', 'Montant TTC'];
    const rows = invoicesToExport.map((inv: Invoice) => {
      const monthKey = getMonthKey(inv.date_facture || inv.created_at);
      return [
        new Date(inv.date_facture).toLocaleDateString('fr-FR'),
        monthKey ? getMonthLabel(monthKey) : 'Mois inconnu',
        `"${inv.entreprise}"`,
        `"${inv.categorie || 'Non classé'}"`,
        `"${inv.description || ''}"`,
        inv.montant_ht.toFixed(2),
        (inv.total_amount - inv.montant_ht).toFixed(2),
        inv.total_amount.toFixed(2)
      ];
    });

    const csvContent = "\uFEFF" + [
      headers.join(';'),
      ...rows.map((row: string[]) => row.join(';'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const fileName = selectedMonths.length === 1
      ? `ArtisScan_Export_${getMonthLabel(selectedMonths[0])}.csv`
      : `ArtisScan_Export_Global_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToastMessage('✅ Export CSV réussi !', 'success');
  };

  // Export Excel (.xlsx) - Version Multi-Mois avec onglets
  const exportToExcel = () => {
    const canExport = userTier === 'pro';
    
    if (!canExport) {
      showToastMessage('📊 Export Excel disponible uniquement en plan PRO', 'error');
      return;
    }

    const sortedInvoices = getSortedInvoices();
    if (sortedInvoices.length === 0) {
      showToastMessage('❌ Aucune facture à exporter', 'error');
      return;
    }

    const wb = XLSX.utils.book_new();

    // Fonction helper pour formater les données d'une facture
    const formatInvoiceData = (inv: Invoice) => {
      const monthKey = getMonthKey(inv.date_facture || inv.created_at);
      const ht = parseAmount(inv.montant_ht);
      const ttc = parseAmount(inv.total_amount);
      const tvaAmount = ttc - ht;
      const tvaPercent = ht > 0 ? Math.round((tvaAmount / ht) * 100) : 0;
      
      return {
        'Date Facture': new Date(inv.date_facture).toLocaleDateString('fr-FR'),
        'Mois': monthKey ? getMonthLabel(monthKey) : 'Mois inconnu',
        'Fournisseur': inv.entreprise,
        'Catégorie': inv.categorie || 'Non classé',
        'Description': inv.description || '',
        'Moyen de paiement': inv.moyen_paiement || '-',
        'Montant HT (€)': ht,
        'TVA (%)': tvaPercent + '%',
        'Montant TVA (€)': tvaAmount,
        'Montant TTC (€)': ttc
      };
    };

    // Fonction helper pour ajouter une ligne de TOTAL
    const addTotalRow = (data: any[]) => {
      const totalHT = data.reduce((sum: number, row: any) => sum + (parseAmount(row['Montant HT (€)']) || 0), 0);
      const totalTVA = data.reduce((sum: number, row: any) => sum + (parseAmount(row['Montant TVA (€)']) || 0), 0);
      const totalTTC = data.reduce((sum: number, row: any) => sum + (parseAmount(row['Montant TTC (€)']) || 0), 0);
      
      return [
        ...data,
        {
          'Date Facture': '',
          'Mois': '',
          'Fournisseur': '',
          'Catégorie': '',
          'Description': '',
          'Moyen de paiement': '',
          'Montant HT (€)': 0,
          'TVA (%)': '',
          'Montant TVA (€)': 0,
          'Montant TTC (€)': 0
        }, // Ligne vide simulée
        {
          'Date Facture': 'TOTAL',
          'Mois': '',
          'Fournisseur': '',
          'Catégorie': '',
          'Description': '',
          'Moyen de paiement': '',
          'Montant HT (€)': totalHT,
          'TVA (%)': '',
          'Montant TVA (€)': totalTVA,
          'Montant TTC (€)': totalTTC
        }
      ];
    };

    // Si plusieurs mois sélectionnés : 1 onglet par mois + 1 récapitulatif
    if (selectedMonths.length > 1) {
      // Onglet récapitulatif
      const recapData = selectedMonths.map(mk => {
        const monthInvoices = sortedInvoices.filter(inv => getMonthKey(inv.date_facture || inv.created_at) === mk);
        const totalHT = monthInvoices.reduce((sum, inv) => sum + parseAmount(inv.montant_ht), 0);
        const totalTTC = monthInvoices.reduce((sum, inv) => sum + parseAmount(inv.total_amount), 0);
        const totalTVA = totalTTC - totalHT;
        return {
          'Mois': getMonthLabel(mk),
          'Factures': monthInvoices.length,
          'Total HT (€)': totalHT,
          'Total TVA (€)': totalTVA,
          'Total TTC (€)': totalTTC
        };
      });
      const wsRecap = XLSX.utils.json_to_sheet(recapData);
      wsRecap['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsRecap, '📊 Récapitulatif');

      // 1 onglet par mois
      selectedMonths.forEach(mk => {
        const monthInvoices = sortedInvoices.filter(inv => getMonthKey(inv.date_facture || inv.created_at) === mk);
        if (monthInvoices.length > 0) {
          const data = addTotalRow(monthInvoices.map(formatInvoiceData));
          const ws = XLSX.utils.json_to_sheet(data);
          ws['!cols'] = [
            { wch: 14 }, { wch: 18 }, { wch: 24 }, { wch: 18 }, 
            { wch: 36 }, { wch: 18 }, { wch: 14 }, { wch: 10 }, 
            { wch: 14 }, { wch: 14 }
          ];
          const sheetName = `📅 ${getMonthLabel(mk)}`.substring(0, 31);
          XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }
      });
    } else {
      // 1 seul mois ou aucun filtre : export classique
      const data = addTotalRow(sortedInvoices.map(formatInvoiceData));
      const ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = [
        { wch: 14 }, { wch: 18 }, { wch: 24 }, { wch: 18 }, 
        { wch: 36 }, { wch: 18 }, { wch: 14 }, { wch: 10 }, 
        { wch: 14 }, { wch: 14 }
      ];
      const sheetName = selectedMonths.length === 1 
        ? `📅 ${getMonthLabel(selectedMonths[0])}`.substring(0, 31)
        : 'Toutes les factures';
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }

    // Ajouter les infos de l'entreprise si configurées
    if (companyName) {
      wb.Props = {
        Title: `Bilan ArtisScan - ${companyName}`,
        Author: companyName,
        Company: companyName
      };
    }

    const fileName = selectedMonths.length > 1
      ? `ArtisScan_Export_${selectedMonths.length}mois_${new Date().toISOString().split('T')[0]}.xlsx`
      : `ArtisScan_Export_${new Date().toISOString().split('T')[0]}.xlsx`;

    XLSX.writeFile(wb, fileName);
    showToastMessage('✅ Export Excel Pro réussi !', 'success');
  };

  // Générer Bilan PDF Global - Version Sublime Finale
  const generateGlobalPDF = () => {
    if (userTier !== 'pro') {
      showToastMessage('📊 Export PDF disponible uniquement en plan PRO', 'error');
      return;
    }
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const sortedInvoices = getSortedInvoices();
    
    // 1. Logo et En-tête
    if (companyLogo) {
      try {
        doc.addImage(companyLogo, 'PNG', 14, 10, 28, 18);
      } catch (e) {
        console.error('Erreur logo PDF Global:', e);
      }
    }

    // Infos Entreprise
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    const companyInfoY = companyLogo ? 32 : 15;
    if (companyName) doc.text(companyName.toUpperCase(), 14, companyInfoY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    let currentY = companyInfoY + 5;
    if (companyProfession) {
      doc.text(companyProfession, 14, currentY);
      currentY += 4;
    }
    if (companyAddress) {
      doc.text(companyAddress, 14, currentY);
      currentY += 4;
    }
    if (companySiret) doc.text(`SIRET: ${companySiret}`, 14, currentY);
    
    // Branding ArtisScan
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(249, 115, 22);
    doc.text('ArtisScan', pageWidth - 14, 20, { align: 'right' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('RÉCAPITULATIF GLOBAL DES DÉPENSES', pageWidth - 14, 25, { align: 'right' });

    doc.setDrawColor(241, 245, 249);
    doc.line(14, 48, pageWidth - 14, 48);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`RÉCAPITULATIF GLOBAL AU ${new Date().toLocaleDateString('fr-FR')}`, 14, 60);

    // 2. Tableau Global
    const headers = [['DATE', 'FOURNISSEUR', 'MOIS', 'CATÉGORIE', 'TTC']];
    const tableData = sortedInvoices.map((inv: Invoice) => {
      const monthKey = getMonthKey(inv.date_facture || inv.created_at);
      return [
        new Date(inv.date_facture).toLocaleDateString('fr-FR'),
        inv.entreprise,
        monthKey ? getMonthLabel(monthKey) : 'Mois inconnu',
        inv.categorie || 'Non classé',
        formatPDFCurrency(parseAmount(inv.total_amount))
      ];
    });

    const totalTTC = sortedInvoices.reduce((sum: number, inv: Invoice) => sum + parseAmount(inv.total_amount), 0);
    tableData.push(['', '', '', 'TOTAL GLOBAL TTC', formatPDFCurrency(totalTTC)]);

    autoTable(doc, {
      startY: 70,
      head: [['DATE', 'FOURNISSEUR', 'MOIS', 'CATÉGORIE', 'TTC']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 8 },
      footStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3, font: 'helvetica' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 22 },
        4: { halign: 'right', fontStyle: 'bold', cellWidth: 40 }
      }
    });

    // Pied de page
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('ArtisScan - Document généré automatiquement. Copie certifiée conforme.', pageWidth / 2, 285, { align: 'center' });

    doc.save(`ArtisScan_Bilan_Global_${new Date().toISOString().split('T')[0]}.pdf`);
    showToastMessage('✅ PDF Global généré !', 'success');
  };

  // Générer Bilan PDF par Projet (Bloc 3 - Version Sublime)
  // Helper pour formater les montants dans le PDF (ex: 7 000,00 € sans slash)
  const formatPDFCurrency = (amount: number) => {
    const formatted = amount.toLocaleString('fr-FR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
    // Remplacer tous les caractères d'espace non-breaking par des espaces normaux
    return formatted.replace(/\u202F/g, ' ').replace(/\u00A0/g, ' ') + ' €';
  };

  // Générer Bilan PDF par Projet (Bloc 3 - Version Sublime Finale)
  const generateProjectPDF = (projectStats: ProjectStats) => {
    if (userTier !== 'pro') {
      showToastMessage('📊 Export PDF disponible uniquement en plan PRO', 'error');
      return;
    }
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // 1. Logo et En-tête Entreprise
    if (companyLogo) {
      try {
        doc.addImage(companyLogo, 'PNG', 14, 10, 28, 18);
      } catch (e) {
        console.error('Erreur logo PDF:', e);
      }
    }
    
    // Infos Entreprise (Haut Gauche, en dessous du logo pour éviter chevauchement)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    const companyInfoY = companyLogo ? 32 : 15;
    if (companyName) doc.text(companyName.toUpperCase(), 14, companyInfoY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    let currentY = companyInfoY + 5;
    if (companyProfession) {
      doc.text(companyProfession, 14, currentY);
      currentY += 4;
    }
    if (companyAddress) {
      doc.text(companyAddress, 14, currentY);
      currentY += 4;
    }
    if (companySiret) doc.text(`SIRET: ${companySiret}`, 14, currentY);
    
    // Branding ArtisScan (Haut Droite)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(249, 115, 22);
    doc.text('ArtisScan', pageWidth - 14, 20, { align: 'right' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('EXPERT COMPTABILITÉ UNIVERSEL', pageWidth - 14, 25, { align: 'right' });

    doc.setDrawColor(241, 245, 249);
    doc.line(14, 48, pageWidth - 14, 48);

    // 2. Titre du Bilan
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`RÉCAPITULATIF DE DÉPENSES : ${projectStats.name.toUpperCase()}`, 14, 60);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`CLIENT : ${projectStats.client.toUpperCase()}`, 14, 68);
    doc.text(`DATE DU RAPPORT : ${new Date().toLocaleDateString('fr-FR')}`, 14, 74);

    // 3. Bloc RÉSUMÉ FINANCIER
    const startY = 82;
    doc.setFillColor(249, 115, 22); // Orange ArtisScan
    doc.roundedRect(14, startY, pageWidth - 28, 25, 2, 2, 'F');
    
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('BUDGET ALLOUÉ', 25, startY + 8);
    doc.text('DÉPENSÉ (TTC)', 85, startY + 8);
    doc.text('MARGE RESTANTE', 145, startY + 8);
    
    doc.setFontSize(13);
    doc.text(formatPDFCurrency(projectStats.budget_alloue), 25, startY + 18);
    doc.text(formatPDFCurrency(projectStats.total_expenses || 0), 85, startY + 18);
    doc.text(formatPDFCurrency(projectStats.budget_restant ?? 0), 145, startY + 18);

    // 4. Tableau des dépenses
    const projectInvoices = invoices.filter(inv => inv.project_id === projectStats.id)
      .sort((a, b) => new Date(b.date_facture).getTime() - new Date(a.date_facture).getTime());
    
    const tableData = projectInvoices.map((inv: Invoice) => [
      new Date(inv.date_facture).toLocaleDateString('fr-FR'),
      inv.entreprise,
      inv.categorie || 'Non classé',
      inv.description || '-',
      formatPDFCurrency(parseAmount(inv.montant_ht)),
      formatPDFCurrency(parseAmount(inv.total_amount))
    ]);

    const totalTTC = projectInvoices.reduce((sum: number, inv: Invoice) => sum + parseAmount(inv.total_amount), 0);
    tableData.push(['', '', '', 'TOTAL DÉPENSÉ TTC', '', formatPDFCurrency(totalTTC)]);

    autoTable(doc, {
      startY: startY + 35,
      head: [['DATE', 'FOURNISSEUR', 'CATÉGORIE', 'DESCRIPTION', 'HT', 'TTC']],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: [249, 115, 22], 
        textColor: 255, 
        fontStyle: 'bold', 
        halign: 'center',
        fontSize: 8
      },
      footStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3, font: 'helvetica' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 20 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 'auto' },
        4: { halign: 'right', cellWidth: 35 },
        5: { halign: 'right', cellWidth: 35, fontStyle: 'bold' }
      }
    });

    // 5. Pied de page
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('ArtisScan - Document généré par le logiciel ArtisScan. Copie certifiée conforme.', pageWidth / 2, 285, { align: 'center' });

    doc.save(`ArtisScan_Bilan_${projectStats.name.replace(/\s+/g, '_')}.pdf`);
    showToastMessage('✅ Bilan PDF professionnel généré !', 'success');
  };

  // Nouvelle fonction pour export Excel par projet
  const exportProjectToExcel = (projectStats: ProjectStats) => {
    if (userTier !== 'pro') {
      showToastMessage('📊 Export Excel disponible uniquement en plan PRO', 'error');
      return;
    }
    const projectInvoices = invoices.filter(inv => inv.project_id === projectStats.id);
    if (projectInvoices.length === 0) {
      showToastMessage('❌ Aucune facture pour ce projet', 'error');
      return;
    }

    const wb = XLSX.utils.book_new();
    const data = projectInvoices.map((inv: Invoice) => {
      const ht = parseAmount(inv.montant_ht);
      const ttc = parseAmount(inv.total_amount);
      const tvaAmount = ttc - ht;
      const tvaPercent = ht > 0 ? Math.round((tvaAmount / ht) * 100) : 0;
      
      return {
        'Date': new Date(inv.date_facture).toLocaleDateString('fr-FR'),
        'Fournisseur': inv.entreprise,
        'Catégorie': inv.categorie || 'Non classé',
        'Description': inv.description || '',
        'HT (€)': ht,
        'TVA (%)': tvaPercent + '%',
        'Montant TVA (€)': tvaAmount,
        'TTC (€)': ttc
      };
    });

    // Ajouter ligne total
    const totalHT = data.reduce((sum: number, row: any) => sum + (row['HT (€)'] || 0), 0);
    const totalTTC = data.reduce((sum: number, row: any) => sum + (row['TTC (€)'] || 0), 0);
    const totalTVA = data.reduce((sum: number, row: any) => sum + (row['Montant TVA (€)'] || 0), 0);
    
    const finalData = [
      ...data,
      {
        'Date': '',
        'Fournisseur': '',
        'Catégorie': '',
        'Description': '',
        'HT (€)': 0,
        'TVA (%)': '',
        'Montant TVA (€)': 0,
        'TTC (€)': 0
      }, // Ligne vide simulée
      {
        'Date': 'TOTAL',
        'Fournisseur': '',
        'Catégorie': '',
        'Description': '',
        'HT (€)': totalHT,
        'TVA (%)': '',
        'Montant TVA (€)': totalTVA,
        'TTC (€)': totalTTC
      }
    ];

    const ws = XLSX.utils.json_to_sheet(finalData);
    ws['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 20 }, { wch: 35 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Récapitulatif Dépenses');
    XLSX.writeFile(wb, `ArtisScan_Excel_${projectStats.name.replace(/\s+/g, '_')}.xlsx`);
    showToastMessage('✅ Excel du dossier généré !', 'success');
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
      const totalAmount = parseFloat(pendingInvoiceData.total_amount);

      if (isNaN(montantHT) || montantHT < 0) {
        showToastMessage('❌ Montant HT invalide', 'error');
        return;
      }

      if (isNaN(totalAmount) || totalAmount < 0) {
        showToastMessage('❌ Montant TTC invalide', 'error');
        return;
      }

      // Préparer les données pour l'insertion
      const finalCategory = pendingInvoiceData.categorie === '📝 Autre' 
        ? (customCategory.trim() || '📝 Autre') 
        : pendingInvoiceData.categorie;

      const invoiceData = {
        user_id: user.id,
        entreprise: pendingInvoiceData.entreprise || 'Non spécifié',
        montant_ht: Number(montantHT) || 0,
        total_amount: Number(totalAmount) || 0,
        date_facture: pendingInvoiceData.date || new Date().toISOString(),
        description: pendingInvoiceData.description || '',
        categorie: finalCategory || 'Non classé',
        nom_chantier: null,
        project_id: null,
        moyen_paiement: pendingInvoiceData.moyen_paiement || 'Non spécifié',
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
      setCustomCategory('');

      // Toast de succès
      showToastMessage('✅ Facture enregistrée !', 'success');

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }

      // ✅ Rafraîchissement immédiat + Reload pour compteur
      console.log('🔄 Rafraîchissement des données...');
      await loadInvoices();
      await checkSubscriptionLimits();
      console.log('✅ Données rafraîchies');
      
      // ✅ REDIRECTION VERS L'HISTORIQUE (BLOC 4 FINITIONS)
      setCurrentView('historique');
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err: any) {
      console.error('❌ Erreur sauvegarde:', err);
      // ✅ CORRECTION 4: Message d'erreur détaillé
      showToastMessage(`❌ Erreur: ${err.message || 'Erreur lors de l\'enregistrement'}`, 'error');
    }
  };
  

  const triggerFileInput = () => {
    // Menu de sélection : Appareil photo OU Téléverser fichier
    setShowUploadMenu(true);
  };

  // Affichage d'attente pendant l'activation PRO
  if (activationPending || isLoadingProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6 py-12">
        <div className="bg-white border border-slate-200 shadow-lg rounded-3xl p-8 max-w-md w-full text-center space-y-4 animate-fade-in">
          <div className="flex items-center justify-center gap-3 text-orange-500 font-black text-lg uppercase tracking-widest">
            <Zap className="w-6 h-6 animate-pulse" />
            Paiement validé !
          </div>
          <p className="text-slate-600 text-sm font-medium">
            Redirection vers votre dashboard en cours...
          </p>
          <p className="text-slate-400 text-xs">
            Nous synchronisons votre accès Pro. Cette étape ne prend que quelques secondes.
          </p>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div className="h-full bg-orange-500 animate-pulse" style={{ width: '70%' }}></div>
          </div>
          
          {/* Bouton de secours après 10 secondes */}
          {showForceAccess && (
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-500">La redirection automatique prend du temps ?</p>
              <button
                onClick={async () => {
                  console.log('⚡ Clic bouton secours - Forçage redirection');
                  try {
                    await supabase.auth.refreshSession();
                    window.location.href = '/dashboard';
                  } catch (err) {
                    console.error('❌ Erreur:', err);
                    window.location.href = '/dashboard';
                  }
                }}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-wider py-3 rounded-xl shadow-md active:scale-95 transition-all"
              >
                Accéder au Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Logo Graphique ArtisScan - BRANDING VERROUILLÉ */}
              <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200 relative group transition-transform active:scale-95">
                <ScanLine className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                <Zap className="w-3.5 h-3.5 text-white absolute -bottom-0.5 -right-0.5 fill-white stroke-[2px]" />
              </div>
              
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xl font-normal text-slate-900 tracking-tight leading-none">
                    <span className="font-black">Artis</span>Scan
                  </h1>
                </div>
                <p className="text-[8px] font-light text-orange-500 uppercase tracking-[0.42em] mt-1 leading-none">Gestion Intelligente</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Badge du plan - PRO Uniquement */}
              {!isLoadingProfile && (
                <div className="hidden sm:block">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${getTierBadgeColor(userTier)} shadow-sm`}>
                    <Crown className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{getTierDisplayName(userTier)}</span>
                  </div>
                </div>
              )}

              {/* Bouton Paramètres (Engrenage) */}
              <button
                onClick={() => setCurrentView('parametres')}
                className={`p-2.5 rounded-xl transition-all border shadow-sm active:scale-95 ${
                  currentView === 'parametres' 
                    ? 'bg-orange-500 text-white border-orange-400 shadow-orange-200' 
                    : 'bg-white text-slate-400 hover:text-slate-600 border-slate-200'
                }`}
                title="Paramètres"
              >
                <Settings className={`w-6 h-6 ${currentView === 'parametres' ? 'animate-spin-slow' : ''}`} />
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-500">Période(s)</label>
              <div className="relative">
                <button
                  onClick={() => setShowMonthSelector(!showMonthSelector)}
                  className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white text-sm font-bold shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4 text-orange-500" />
                  {selectedMonths.length === 0 
                    ? 'Tous les mois' 
                    : selectedMonths.length === 1 
                      ? getMonthLabel(selectedMonths[0])
                      : `${selectedMonths.length} mois sélectionnés`}
                  <ChevronDown className={`w-4 h-4 transition-transform ${showMonthSelector ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown multi-sélection */}
                {showMonthSelector && (
                  <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto">
                    <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 uppercase tracking-wider">Sélection de mois</span>
                      <button
                        onClick={() => setShowMonthSelector(false)}
                        className="p-1 hover:bg-slate-100 rounded transition-colors"
                      >
                        <X className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                    <div className="p-2 space-y-1">
                      {/* Option "Tous" */}
                      <label className="flex items-center gap-3 p-2 hover:bg-orange-50 rounded-lg cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedMonths.length === 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMonths([]);
                            }
                          }}
                          className="w-4 h-4 text-orange-500 border-slate-300 rounded focus:ring-orange-500"
                        />
                        <span className="text-sm font-bold text-slate-700">Tous les mois</span>
                      </label>
                      <div className="h-px bg-slate-100 my-2"></div>
                      {/* Liste des mois */}
                      {availableMonths.map((monthKey) => (
                        <label
                          key={monthKey}
                          className="flex items-center gap-3 p-2 hover:bg-orange-50 rounded-lg cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedMonths.includes(monthKey)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMonths([...selectedMonths, monthKey]);
                              } else {
                                setSelectedMonths(selectedMonths.filter(m => m !== monthKey));
                              }
                            }}
                            className="w-4 h-4 text-orange-500 border-slate-300 rounded focus:ring-orange-500"
                          />
                          <span className="text-sm font-medium text-slate-700">{getMonthLabel(monthKey)}</span>
                        </label>
                      ))}
                    </div>
                    <div className="p-3 border-t border-slate-100 flex gap-2">
                      <button
                        onClick={() => setSelectedMonths([])}
                        className="flex-1 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        Réinitialiser
                      </button>
                      <button
                        onClick={() => setShowMonthSelector(false)}
                        className="flex-1 px-3 py-1.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
                      >
                        Appliquer
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={refreshAllData}
                disabled={loadingInvoices}
                className="p-2 bg-white border border-slate-200 text-slate-400 rounded-lg hover:bg-slate-50 hover:text-orange-600 transition-all disabled:opacity-50 shadow-sm active:scale-95"
                title="Forcer le rafraîchissement Supabase"
              >
                <Clock className={`w-4 h-4 ${loadingInvoices ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {selectedMonths.length > 0 && (
              <button
                onClick={() => setSelectedMonths([])}
                className="text-sm text-orange-500 underline underline-offset-4 font-medium"
              >
                Tout afficher
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 pb-28">
        <div className="space-y-6">
        {/* DASHBOARD */}
        {currentView === 'dashboard' && (
          <div className="space-y-6 fade-in">
            {/* Résumé Chronologie (mois sélectionné) - DESIGN CLAIR MODERNE */}
            <div className="bg-white rounded-3xl p-6 text-slate-900 overflow-hidden relative border border-slate-200 shadow-sm transition-all hover:shadow-md">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                <TrendingUp className="w-32 h-32 rotate-12 text-slate-900" />
              </div>
              <div className="relative z-10">
                <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">Vue d'ensemble de l'activité</h3>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-3xl font-black mb-1 text-slate-900">
                      {monthSummary.totalHT.toLocaleString('fr-FR', { minimumFractionDigits: 0 })} €
                    </p>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-tighter">Total HT (mois)</p>
                  </div>
                  <div>
                    <p className="text-3xl font-black mb-1 text-orange-500">
                      {monthSummary.totalTTC.toLocaleString('fr-FR', { minimumFractionDigits: 0 })} €
                    </p>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-tighter">Total TTC (mois)</p>
                  </div>
                </div>
                <div className="mt-6">
                  <div className="flex justify-between text-[10px] font-bold uppercase mb-2">
                    <span className="text-slate-500">TVA récupérable (mois)</span>
                    <span className="text-orange-500 font-black">
                      {monthSummary.tva.toLocaleString('fr-FR', { minimumFractionDigits: 0 })} €
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 shadow-inner">
                    <div
                      className="h-full bg-orange-500 transition-all duration-700"
                      style={{ width: `${Math.min((monthSummary.totalTTC > 0 ? (monthSummary.tva / monthSummary.totalTTC) : 0) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Stats principales - 3 cartes */}
            {loadingInvoices ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatsCardSkeleton />
                <StatsCardSkeleton />
                <StatsCardSkeleton />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Carte 1 : Total HT */}
              <div className="card-clean rounded-3xl p-6 bg-white border border-slate-200 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Total HT</p>
                    <p className="text-3xl font-black text-slate-900">
                      {stats.totalHT.toLocaleString('fr-FR', { 
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })} €
                    </p>
                    <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-tighter">{stats.nombreFactures} docs</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center shadow-inner">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#ff6600">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Carte 2 : TVA récupérable */}
              <div className="card-clean rounded-3xl p-6 bg-white border border-slate-200 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">TVA récupérable</p>
                    <p className="text-3xl font-black text-slate-900">
                      {stats.tvaRecuperable.toLocaleString('fr-FR', { 
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })} €
                    </p>
                    <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-tighter">TVA cumulée</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center shadow-inner">
                    <TrendingUp className="w-6 h-6 text-orange-500" />
                  </div>
                </div>
              </div>

              {/* Carte 3 : Total TTC */}
              <div className="card-clean rounded-3xl p-6 bg-white border border-slate-200 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-black text-orange-500 mb-1 uppercase tracking-widest">Total TTC</p>
                    <p className="text-3xl font-black text-slate-900">
                      {stats.totalTTC.toLocaleString('fr-FR', { 
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })} €
                    </p>
                    <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-tighter">Total à payer</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center shadow-inner">
                    <Receipt className="w-6 h-6 text-orange-500" />
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* Graphique 7 derniers jours (TTC) */}
            <div className="card-clean rounded-3xl p-6 relative bg-white border border-slate-200 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Dépenses des 7 derniers jours</h3>
                {chartData.every(d => d.montant === 0) && (
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                    Aucune dépense cette semaine
                  </span>
                )}
              </div>
              
              <div className="relative">
                {chartData.every(d => d.montant === 0) && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/50 backdrop-blur-[1px]">
                    <p className="text-sm text-slate-400 italic">Toutes vos factures sont plus anciennes</p>
                  </div>
                )}
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
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
                    <Bar dataKey="montant" fill="#f97316" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Section Scanner */}
            <div className="card-clean rounded-3xl p-8 text-center bg-white border border-slate-200 shadow-sm transition-all hover:shadow-md">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-orange-50 flex items-center justify-center shadow-inner">
                <ScanLine className="w-10 h-10 text-orange-500" />
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-2">Nouvelle Facture</h2>
              <p className="text-sm text-slate-500 mb-6">
                Scannez vos documents pour une analyse IA instantanée
              </p>
              
              {/* (Suppression des dossiers : classement automatique par mois) */}

          <button
                onClick={triggerFileInput}
                  disabled={analyzing}
                className="btn-primary w-full max-w-xs mx-auto py-4 px-6 rounded-2xl font-black text-base shadow-lg shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all active:scale-95"
                >
                  {analyzing ? (
                  <span className="flex items-center justify-center">
                    <div className="spinner w-5 h-5 mr-3 border-white/30 border-t-white"></div>
                    {loadingMessage}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Camera className="w-6 h-6" />
                    NUMÉRISER MAINTENANT
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
                    <div className="flex justify-between py-2 border-b border-slate-100 items-center">
                      <span className="text-sm font-medium text-slate-600">Catégorie</span>
                      <span className="px-2 py-1 text-xs font-bold bg-orange-50 text-orange-700 rounded-lg border border-orange-100">
                        {result.categorie}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-sm font-bold text-slate-600">Montant HT</span>
                    <span className="text-sm font-black text-slate-900">
                      {result.montant_ht ? `${result.montant_ht.toFixed(2)} €` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-sm font-bold text-slate-600">Montant TTC</span>
                    <span className="text-sm font-black text-slate-900">
                      {result.total_amount ? `${result.total_amount.toFixed(2)} €` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-sm font-bold text-slate-600">TVA</span>
                    <span className="text-sm font-black text-orange-500">
                      {result.total_amount && result.montant_ht 
                        ? `${(result.total_amount - result.montant_ht).toFixed(2)} €` 
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
            {/* Header avec action */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Historique</h2>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => exportToCSV()}
                  disabled={invoices.length === 0}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors font-bold text-xs ${
                    invoices.length === 0
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm'
                  }`}
                  title="Exporter en CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  CSV
                </button>
                <button
                  onClick={exportToExcel}
                  disabled={invoices.length === 0}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors font-bold text-xs ${
                    invoices.length === 0
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
                  }`}
                  title="Exporter en Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                  Excel Pro
                </button>
                <button
                  onClick={generateGlobalPDF}
                  disabled={invoices.length === 0}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors font-bold text-xs ${
                    invoices.length === 0
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-orange-600 text-white hover:bg-orange-700 shadow-sm'
                  }`}
                  title="Générer PDF Global"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  PDF Global
                </button>
              </div>
            </div>

            {/* Barre de Recherche et Filtres (Bloc 3) */}
            <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              {/* Recherche */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Rechercher une facture (nom, description, catégorie...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-base sm:text-sm"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                  </button>
                )}
              </div>

              {/* Filtres Dropdowns */}
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm font-medium transition-all"
                  >
                    <option value="">Toutes les catégories</option>
                    <option value="🧱 Matériaux">🧱 Matériaux</option>
                    <option value="⛽ Carburant">⛽ Carburant</option>
                    <option value="🍴 Restaurant">🍴 Restaurant</option>
                    <option value="🛠️ Outillage">🛠️ Outillage</option>
                    <option value="📦 Fournitures">📦 Fournitures</option>
                    <option value="🚚 Location">🚚 Location</option>
                    <option value="🤝 Sous-traitance">🤝 Sous-traitance</option>
                    <option value="📝 Autre">📝 Autre</option>
                  </select>
                </div>
              </div>
            </div>
              
            {/* Filtres de tri */}
            <div className="flex flex-wrap gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <select
                  value={sortBy.startsWith('date') ? sortBy : ''}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className={`text-sm font-medium bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all ${
                    sortBy.startsWith('date') ? 'text-orange-600 border-orange-200 ring-2 ring-orange-500/10' : 'text-slate-600'
                  }`}
                >
                  <option value="" disabled>Trier par Date</option>
                  <option value="date_facture">📅 Date de la facture</option>
                  <option value="date_scan">🕒 Date de transmission</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-slate-400" />
                <select
                  value={sortBy.startsWith('montant') ? sortBy : ''}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className={`text-sm font-medium bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all ${
                    sortBy.startsWith('montant') ? 'text-orange-600 border-orange-200 ring-2 ring-orange-500/10' : 'text-slate-600'
                  }`}
                >
                  <option value="" disabled>Trier par Montant</option>
                  <option value="montant_ht">📉 Montant HT</option>
                  <option value="total_amount">📈 Montant TTC</option>
                </select>
              </div>

              <button
                onClick={() => setSortBy('categorie')}
                className={`hidden md:block px-4 py-1.5 rounded-lg text-sm font-bold transition-all border ${
                  sortBy === 'categorie' 
                    ? 'bg-orange-500 text-white border-orange-500 shadow-sm shadow-orange-200' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                📂 Par Catégorie
              </button>
            </div>

            {loadingInvoices ? (
              <div className="space-y-3">
                <InvoiceCardSkeleton />
                <InvoiceCardSkeleton />
                <InvoiceCardSkeleton />
                <InvoiceCardSkeleton />
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="card-clean rounded-2xl p-8 text-center bg-white border-dashed border-2 border-slate-200">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucun résultat trouvé</h3>
                <p className="text-sm text-slate-500 mb-6">
                  Modifiez vos filtres ou votre recherche pour trouver ce que vous cherchez.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('');
                    setSelectedMonths([]);
                  }}
                  className="px-6 py-2 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all shadow-md shadow-orange-100"
                >
                  Réinitialiser tous les filtres
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
                  <span>{filteredInvoices.length} facture(s) trouvée(s)</span>
                  {selectedMonths.length > 0 && (
                    <span className="text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                      {selectedMonths.length} mois
                    </span>
                  )}
                </div>
                {(() => {
                  const sorted = getSortedInvoices();
                  const groups: { monthKey: string; invoices: Invoice[] }[] = [];

                  for (const inv of sorted) {
                    const mk = getMonthKey(inv.date_facture || inv.created_at) || 'unknown';
                    const last = groups[groups.length - 1];
                    if (!last || last.monthKey !== mk) groups.push({ monthKey: mk, invoices: [] });
                    groups[groups.length - 1].invoices.push(inv);
                  }

                  return groups.map((g) => (
                    <div key={g.monthKey} className="space-y-3">
                      <div className="mt-6 first:mt-0 px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 text-[10px] font-black uppercase tracking-widest">
                        {getMonthLabel(g.monthKey)}
                      </div>

                      {g.invoices.map((invoice) => (
                        <div key={invoice.id} className="card-clean rounded-2xl p-5 bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-black text-slate-900 text-lg tracking-tight">{invoice.entreprise}</h4>
                                {invoice.categorie && (
                                  <span className="inline-block px-2.5 py-1 text-[10px] font-black bg-orange-50 text-orange-600 rounded-lg border border-orange-100 uppercase tracking-wider">
                                    {invoice.categorie}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-col gap-1">
                                <p className="text-xs font-bold text-slate-500">
                                  Facture du : {new Date(invoice.date_facture).toLocaleDateString('fr-FR')}
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">
                                  Transmise le : {new Date(invoice.created_at).toLocaleDateString('fr-FR')} à {new Date(invoice.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => confirmDelete(invoice.id)}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>

                          <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100 mb-3">
                            <div className="flex-1">
                              <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block mb-0.5">Montant HT</span>
                              <span className="font-black text-slate-900 text-base">
                                {(invoice.montant_ht || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                              </span>
                            </div>

                            <div className="w-px h-8 bg-slate-200"></div>

                            <div className="flex-1">
                              <span className="text-[10px] text-orange-400 uppercase font-black tracking-widest block mb-0.5">Montant TTC</span>
                              <span className="font-black text-orange-500 text-lg">
                                {(invoice.total_amount || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                              </span>
                            </div>

                            <div className="hidden md:block flex-1 border-l border-slate-200 pl-4">
                              <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block mb-0.5">TVA Récupérée</span>
                              <span className="font-black text-orange-500 italic text-base">
                                {((invoice.total_amount || 0) - (invoice.montant_ht || 0)).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                              </span>
                            </div>
                          </div>

                          {invoice.description && (
                            <div className="mt-3 p-3 bg-orange-50 border-l-4 border-orange-400 rounded hidden md:block">
                              <p className="text-xs text-orange-700 font-medium mb-1">DESCRIPTION</p>
                              <p className="text-sm text-slate-700">{invoice.description}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        )}

        {/* PARAMÈTRES - Design Pro */}
        {currentView === 'parametres' && (
          <div className="fade-in max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Paramètres</h1>
              <p className="text-slate-500 mt-2">Gérez votre profil et vos préférences</p>
            </div>

            {/* Avatar/Logo Section */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-6 shadow-sm">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-4 border-slate-100 overflow-hidden bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center group">
                    {companyLogo ? (
                      <img src={companyLogo} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-3xl font-black">
                        {companyName ? companyName[0].toUpperCase() : (userEmail ? userEmail[0].toUpperCase() : 'A')}
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <label htmlFor="avatar-upload" className="cursor-pointer">
                        <Camera className="w-6 h-6 text-white" />
                      </label>
                    </div>
                  </div>
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const result = event.target?.result as string;
                          setCompanyLogo(result);
                          localStorage.setItem('artisscan_company_logo', result);
                          showToastMessage('✅ Avatar mis à jour', 'success');
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-slate-900">{companyName || 'Nom de l\'entreprise'}</h2>
                  <p className="text-sm text-slate-500 mt-1">{userEmail}</p>
                  <button
                    onClick={() => {
                      setCompanyLogo(null);
                      localStorage.removeItem('artisscan_company_logo');
                      showToastMessage('Avatar supprimé', 'success');
                    }}
                    className="mt-3 text-sm text-slate-400 hover:text-red-500 font-medium transition-colors"
                  >
                    Supprimer l'avatar
                  </button>
                </div>
              </div>
            </div>

            {/* Informations Personnelles */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5 text-orange-500" />
                Informations Personnelles
              </h3>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Nom de l'entreprise
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => {
                        setCompanyName(e.target.value);
                        localStorage.setItem('artisscan_company_name', e.target.value);
                      }}
                      placeholder="Ex: Russo Plomberie"
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      SIRET
                    </label>
                    <input
                      type="text"
                      value={companySiret}
                      onChange={(e) => {
                        setCompanySiret(e.target.value);
                        localStorage.setItem('artisscan_company_siret', e.target.value);
                      }}
                      placeholder="842 123 456 00012"
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Métier
                  </label>
                  <input
                    type="text"
                    value={companyProfession}
                    onChange={(e) => {
                      setCompanyProfession(e.target.value);
                      localStorage.setItem('artisscan_company_profession', e.target.value);
                    }}
                    placeholder="Ex: Plombier, Boulanger, Électricien..."
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Adresse professionnelle
                  </label>
                  <input
                    type="text"
                    value={companyAddress}
                    onChange={(e) => {
                      setCompanyAddress(e.target.value);
                      localStorage.setItem('artisscan_company_address', e.target.value);
                    }}
                    placeholder="12 rue de la Paix, 75002 Paris"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-sm"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <button
                    onClick={() => {
                      showToastMessage('✅ Informations sauvegardées', 'success');
                    }}
                    className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl transition-all active:scale-95"
                  >
                    Sauvegarder les modifications
                  </button>
                </div>
              </div>
            </div>

            {/* Sécurité */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Settings className="w-5 h-5 text-orange-500" />
                Sécurité
              </h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Adresse e-mail
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="email"
                      value={userEmail || ''}
                      disabled
                      className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                    />
                    <span className="text-xs text-slate-400 font-medium">Non modifiable</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Changer le mot de passe
                  </label>
                  <button
                    onClick={() => {
                      showToastMessage('📧 Un email de réinitialisation a été envoyé', 'success');
                    }}
                    className="px-6 py-2.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 font-medium rounded-xl transition-all active:scale-95"
                  >
                    Réinitialiser mon mot de passe
                  </button>
                  <p className="text-xs text-slate-500 mt-2">
                    Vous recevrez un lien de réinitialisation par e-mail
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-6 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-xl transition-all active:scale-95"
                  >
                    <LogOut className="w-4 h-4" />
                    Se déconnecter
                  </button>
                </div>
              </div>
            </div>

            {/* Abonnement */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-8 mb-6 shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium mb-2">Votre abonnement</p>
                  <div className="flex items-center gap-3">
                    <Crown className="w-6 h-6" />
                    <span className="text-2xl font-black">ArtisScan PRO</span>
                  </div>
                  <p className="text-orange-100 text-sm mt-2">Accès illimité à toutes les fonctionnalités</p>
                </div>
              </div>
            </div>

            {/* Exports */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Exports de données</h3>
              <p className="text-sm text-slate-500 mb-6">
                Exportez vos factures aux formats professionnels
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => exportToCSV()}
                  disabled={invoices.length === 0}
                  className={`flex items-center justify-center gap-3 px-6 py-4 rounded-xl transition-all font-medium ${
                    invoices.length === 0
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                      : 'bg-white border-2 border-slate-200 hover:border-orange-500 text-slate-700'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  Exporter en CSV
                </button>
                
                <button
                  onClick={exportToExcel}
                  disabled={invoices.length === 0}
                  className={`flex items-center justify-center gap-3 px-6 py-4 rounded-xl transition-all font-medium ${
                    invoices.length === 0
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  <Download className="w-5 h-5" />
                  Exporter en Excel
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </main>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        onChange={handleAnalyze}
        className="hidden"
      />

      {/* Menu de sélection Upload */}
      {showUploadMenu && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] px-4" onClick={() => setShowUploadMenu(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-900">Scanner une facture</h3>
              <button
                onClick={() => setShowUploadMenu(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowUploadMenu(false);
                  const input = fileInputRef.current;
                  if (input) {
                    input.setAttribute('capture', 'environment');
                    input.setAttribute('accept', 'image/*');
                    input.click();
                  }
                }}
                className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-2xl transition-all active:scale-95 shadow-lg group"
              >
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-black text-base">Prendre une photo</p>
                  <p className="text-xs opacity-90">Ouvrir l'appareil photo</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowUploadMenu(false);
                  const input = fileInputRef.current;
                  if (input) {
                    input.removeAttribute('capture');
                    input.setAttribute('accept', 'image/*,application/pdf');
                    input.click();
                  }
                }}
                className="w-full flex items-center gap-4 p-4 bg-white hover:bg-slate-50 border-2 border-slate-200 rounded-2xl transition-all active:scale-95 group"
              >
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6 text-slate-600" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-black text-slate-900 text-base">Téléverser un fichier</p>
                  <p className="text-xs text-slate-500">Galerie, PDF ou image</p>
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowUploadMenu(false)}
              className="w-full mt-4 py-3 text-slate-400 hover:text-slate-600 font-medium text-sm transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Modale Envoi au Comptable */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] px-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full slide-up shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Envoyer au comptable</h3>
                  <p className="text-xs text-slate-500 font-medium">Export automatique par email</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowEmailModal(false);
                  setComptableEmail('');
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <Package className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-orange-900">
                  <p className="font-bold mb-1">Export préparé :</p>
                  <ul className="space-y-1 text-xs">
                    <li>• <strong>{selectedMonths.length} mois</strong> sélectionné(s)</li>
                    <li>• <strong>{filteredInvoices.length} factures</strong> incluses</li>
                    <li>• Format : {selectedMonths.length > 1 ? 'Excel multi-onglets' : 'Excel standard'}</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Email du comptable
                </label>
                <input
                  type="email"
                  value={comptableEmail}
                  onChange={(e) => setComptableEmail(e.target.value)}
                  placeholder="comptable@exemple.fr"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm font-medium"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowEmailModal(false);
                  setComptableEmail('');
                }}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-bold text-sm"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  if (!comptableEmail || !comptableEmail.includes('@')) {
                    showToastMessage('❌ Email invalide', 'error');
                    return;
                  }
                  
                  // Générer l'export
                  exportToExcel();
                  
                  // Simuler l'envoi (en production : API backend pour email)
                  showToastMessage(`📧 Export envoyé à ${comptableEmail}`, 'success');
                  setShowEmailModal(false);
                  setComptableEmail('');
                }}
                disabled={!comptableEmail}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:shadow-lg transition-all font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Envoyer
              </button>
            </div>

            <p className="text-[10px] text-slate-400 text-center mt-4 font-medium">
              💡 Le fichier Excel sera téléchargé sur votre appareil et devra être transmis manuellement pour le moment.
            </p>
          </div>
        </div>
      )}

      {/* Modale de validation des données scannées */}
      {showValidationModal && pendingInvoiceData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full slide-up max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Vérification</h3>
              <button
                onClick={() => {
                  setShowValidationModal(false);
                  setPendingInvoiceData(null);
                  setCustomCategory('');
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
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  Date de la facture
                </label>
                <input
                  type="date"
                  value={pendingInvoiceData.date ? pendingInvoiceData.date.split('T')[0] : ''}
                  onChange={(e) => setPendingInvoiceData({
                    ...pendingInvoiceData,
                    date: e.target.value
                  })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none transition-all text-sm font-medium"
                />
              </div>

              {/* Nom du fournisseur / Entreprise */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4 text-orange-500" />
                  Nom du fournisseur
                </label>
                <input
                  type="text"
                  value={pendingInvoiceData.entreprise || ''}
                  onChange={(e) => setPendingInvoiceData({
                    ...pendingInvoiceData,
                    entreprise: e.target.value
                  })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none transition-all text-sm font-medium"
                  placeholder="Nom de l'entreprise"
                />
              </div>

              {/* Montant HT */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-orange-500" />
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
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none transition-all text-sm font-medium"
                  placeholder="0.00"
                />
              </div>

              {/* TVA calculée automatiquement */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  TVA (Calculée)
                </label>
                <input
                  type="text"
                  value={pendingInvoiceData.total_amount && pendingInvoiceData.montant_ht 
                    ? (parseFloat(pendingInvoiceData.total_amount) - parseFloat(pendingInvoiceData.montant_ht)).toFixed(2)
                    : '0.00'}
                  readOnly
                  className="w-full px-4 py-3 bg-slate-100/50 border border-slate-200 rounded-xl text-slate-500 text-sm font-bold italic"
                />
              </div>

              {/* Montant TTC */}
              <div>
                <label className="block text-sm font-bold text-orange-600 mb-2 flex items-center gap-2">
                  <Receipt className="w-4 h-4" />
                  Montant TTC (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={pendingInvoiceData.total_amount || ''}
                  onChange={(e) => setPendingInvoiceData({
                    ...pendingInvoiceData,
                    total_amount: e.target.value
                  })}
                  className="w-full px-4 py-3 bg-orange-50/30 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none transition-all text-lg font-black text-slate-900"
                  placeholder="0.00"
                />
              </div>

              {/* Catégorie */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-orange-500" />
                  Type de dépense
                </label>
                <div className="relative">
                  <select
                    value={pendingInvoiceData.categorie || ''}
                    onChange={(e) => setPendingInvoiceData({
                      ...pendingInvoiceData,
                      categorie: e.target.value
                    })}
                    className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none transition-all text-sm font-medium"
                  >
                    <option value="">-- Sélectionner une catégorie --</option>
                    <option value="🧱 Matériaux">🧱 Matériaux</option>
                    <option value="⛽ Carburant">⛽ Carburant</option>
                    <option value="🍴 Restaurant">🍴 Restaurant</option>
                    <option value="🛠️ Outillage">🛠️ Outillage</option>
                    <option value="📦 Fournitures">📦 Fournitures</option>
                    <option value="🚚 Location">🚚 Location</option>
                    <option value="🤝 Sous-traitance">🤝 Sous-traitance</option>
                    <option value="📝 Autre">📝 Autre (Saisie libre...)</option>
                  </select>
                </div>

                {/* Champ dynamique si "Autre" est sélectionné */}
                {pendingInvoiceData.categorie === '📝 Autre' && (
                  <div className="mt-3 fade-in">
                    <label className="block text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1.5 ml-1">
                      Spécifiez votre catégorie
                    </label>
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="Ex: Assurance, Électricité, Publicité..."
                      className="w-full px-4 py-2.5 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-orange-50/20 text-sm font-medium"
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {/* (Dossiers supprimés) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-600 font-bold uppercase tracking-widest">
                  Classement automatique par mois (date de facture)
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Vous n'avez plus besoin de créer/choisir un dossier : l'application regroupe tout par mois.
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Description / Libellé IA
                </label>
                <textarea
                  value={pendingInvoiceData.description || ''}
                  onChange={(e) => setPendingInvoiceData({
                    ...pendingInvoiceData,
                    description: e.target.value
                  })}
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none transition-all text-sm resize-none"
                  placeholder="Détails de la facture..."
                />
              </div>

              {/* Moyen de Paiement */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4 text-orange-500" />
                  Moyen de paiement
                </label>
                <select
                  value={pendingInvoiceData.moyen_paiement || ''}
                  onChange={(e) => setPendingInvoiceData({
                    ...pendingInvoiceData,
                    moyen_paiement: e.target.value
                  })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none transition-all text-sm font-medium"
                >
                  <option value="">-- Choisir un moyen de paiement --</option>
                  <option value="Carte Bancaire">💳 Carte Bancaire</option>
                  <option value="Virement">🏦 Virement</option>
                  <option value="Espèces">💵 Espèces</option>
                  <option value="Chèque">✍️ Chèque</option>
                  <option value="Prélèvement">🔄 Prélèvement</option>
                  <option value="Autre">📝 Autre</option>
                </select>
              </div>
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

      {/* Modale de confirmation suppression facture */}
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

      {/* (Gestion manuelle des dossiers supprimée : Chronologie automatique par mois) */}

      {/* Toast de confirmation */}
      {showToast && (
        <div className={`toast ${toastType === 'error' ? 'bg-red-500' : 'bg-green-600'}`}>
          {toastMessage}
        </div>
      )}

      {/* Bouton flottant Export multi-mois */}
      {selectedMonths.length > 0 && (
        <div className="fixed bottom-24 right-6 z-40 flex flex-col gap-3">
          <button
            onClick={() => {
              if (selectedMonths.length === 1) {
                // Export simple
                generateGlobalPDF();
              } else {
                // Export multi-mois (ZIP ou Excel multi-onglets)
                exportToExcel();
              }
            }}
            disabled={filteredInvoices.length === 0}
            className="group relative bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-4 rounded-2xl shadow-2xl hover:shadow-orange-300 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-white"
          >
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5" />
              <div className="text-left">
                <div className="text-xs font-black uppercase tracking-wider">Exporter</div>
                <div className="text-[10px] font-medium opacity-90">
                  {selectedMonths.length} mois • {filteredInvoices.length} docs
                </div>
              </div>
            </div>
            {/* Badge compteur */}
            <div className="absolute -top-2 -right-2 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 border-white shadow-lg">
              {selectedMonths.length}
            </div>
          </button>

          <button
            onClick={() => setShowEmailModal(true)}
            disabled={filteredInvoices.length === 0}
            className="bg-white text-slate-700 px-6 py-3 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-200 flex items-center gap-2"
          >
            <Mail className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-bold">Envoyer au comptable</span>
          </button>
        </div>
      )}

            {/* Bottom Navigation */}
      <nav className="bottom-nav bg-white/95 backdrop-blur-md border-t border-slate-200 fixed bottom-0 left-0 right-0">
        <div className="max-w-7xl mx-auto px-2">
          <div className="flex items-center justify-around py-2">
        <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex flex-col items-center justify-center py-2 px-3 transition-all duration-200 rounded-xl ${
                currentView === 'dashboard' 
                  ? 'text-orange-500 scale-105' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <LayoutDashboard className={`w-6 h-6 mb-1 transition-transform ${currentView === 'dashboard' ? 'scale-110' : ''}`} strokeWidth={currentView === 'dashboard' ? 2.5 : 2} />
              <span className={`text-[10px] uppercase tracking-widest transition-all ${currentView === 'dashboard' ? 'font-black' : 'font-bold'}`}>Dashboard</span>
            </button>

            {/* Scanner central plus gros */}
            <button
              onClick={triggerFileInput}
              disabled={analyzing}
              className="flex flex-col items-center justify-center -mt-10 bg-orange-500 text-white rounded-3xl p-5 shadow-2xl shadow-orange-300 hover:bg-orange-600 active:scale-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border-4 border-white"
            >
              {analyzing ? (
                <div className="spinner w-8 h-8 border-white border-opacity-20" style={{ borderTopColor: 'white' }}></div>
              ) : (
                <Camera className="w-8 h-8" />
              )}
            </button>

            <button
              onClick={() => setCurrentView('historique')}
              className={`flex flex-col items-center justify-center py-2 px-3 transition-all duration-200 rounded-xl ${
                currentView === 'historique' 
                  ? 'text-orange-500 scale-105' 
                  : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              <Clock className={`w-6 h-6 mb-1 transition-transform ${currentView === 'historique' ? 'scale-110' : ''}`} strokeWidth={currentView === 'historique' ? 2.5 : 2} />
              <span className={`text-[10px] uppercase tracking-widest transition-all ${currentView === 'historique' ? 'font-black' : 'font-bold'}`}>Historique</span>
            </button>

            <button
              onClick={() => window.location.href = '/dashboard/folders'}
              className="flex flex-col items-center justify-center py-2 px-3 transition-all duration-200 rounded-xl text-slate-400 hover:text-slate-600"
            >
              <Folder className="w-6 h-6 mb-1 transition-transform" strokeWidth={2} />
              <span className="text-[10px] uppercase tracking-widest font-bold">Dossiers</span>
            </button>

            {/* Onglet Dossiers supprimé : organisation automatique par mois */}
          </div>
    </div>
      </nav>
    </div>
  );
}
