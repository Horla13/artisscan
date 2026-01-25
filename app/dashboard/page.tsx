'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Camera, LayoutDashboard, Clock, ScanLine, Trash2, Settings, Download, X, TrendingUp, Crown, AlertCircle, Receipt, FolderKanban, Plus, FileDown, LogOut, Zap, Calendar, ChevronDown, Mail, Package, FileText, Folder, Percent, Archive, MoreVertical } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'framer-motion';
import { UpsellBanner } from '@/app/components/ui/UpsellBanner';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { StatusBadge } from '@/app/components/ui/StatusBadge';
import { BentoCard } from '@/app/components/ui/BentoCard';
import { generateAccountingCSV, generateFEC, getBestEffortAmounts, formatDecimalDot, toYyyyMmDdOrToday, getAccountingPeriodLabel } from '@/lib/accountingExports';

interface Invoice {
  id: string;
  user_id: string;
  entreprise: string;
  amount_ht: number;
  amount_tva: number;
  total_amount: number; // TTC (champ standard)
  // Période optionnelle: si vide => "Sans période" (en DB peut être NULL)
  date_facture: string;
  description: string;
  categorie?: string;
  created_at: string;
  folder_id?: string;
  archived?: boolean;
  modified_manually?: boolean;
  updated_at?: string;
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

interface Folder {
  id: string;
  user_id: string;
  name: string;
  reference: string;
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
  
  // États pour les dossiers personnalisés
  const [folders, setFolders] = useState<Folder[]>([]);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  // UX: si l’utilisateur lance un scan depuis un dossier, on pré-sélectionne ce dossier dans la modale de validation
  const [preselectFolderId, setPreselectFolderId] = useState<string | null>(null);
  const [folderName, setFolderName] = useState('');
  const [folderReference, setFolderReference] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  // États pour le transfert de factures vers dossiers
  const [showMoveToFolderModal, setShowMoveToFolderModal] = useState(false);
  const [invoiceToMove, setInvoiceToMove] = useState<Invoice | null>(null);
  const [invoiceMenuOpen, setInvoiceMenuOpen] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isProUser, setIsProUser] = useState<boolean | null>(null);
  // Abonnement (affiché dans Paramètres)
  const [billingPlan, setBillingPlan] = useState<string | null>(null);
  const [billingStatus, setBillingStatus] = useState<string | null>(null);
  const [billingCustomerId, setBillingCustomerId] = useState<string | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'date_facture' | 'date_scan' | 'amount_ht' | 'total_amount' | 'categorie'>('date_facture');
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companySiret, setCompanySiret] = useState('');
  const [companyProfession, setCompanyProfession] = useState('');
  const isDev = process.env.NODE_ENV !== 'production';
  const devLog = (...args: any[]) => {
    if (isDev) console.log(...args);
  };
  const devWarn = (...args: any[]) => {
    if (isDev) console.warn(...args);
  };

  // ✅ Décision produit: AUCUNE prévisualisation document.
  // On montre uniquement un loader élégant en étapes.
  const [analysisStep, setAnalysisStep] = useState<'upload' | 'ocr' | 'extract' | null>(null);

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

  const loadBillingInfo = async () => {
    setBillingLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setBillingPlan(null);
        setBillingStatus(null);
        setBillingCustomerId(null);
        return;
      }

      // ⚠️ V1 stable: on ne lit AUCUN champ de date d’abonnement
      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('is_pro, plan, stripe_customer_id')
        .eq('id', user.id)
        .single();

      if (pErr) {
        console.warn('⚠️ Impossible de charger infos abonnement', pErr);
        return;
      }

      setBillingPlan(profile?.plan ?? null);
      // V1 stabilité: le dashboard n’utilise pas subscription_status (anti-régression)
      setBillingStatus(profile?.is_pro === true ? 'active' : null);
      setBillingCustomerId(profile?.stripe_customer_id ?? null);
    } catch (e) {
      console.warn('⚠️ loadBillingInfo error', e);
    } finally {
      setBillingLoading(false);
    }
  };

  const startCustomerPortal = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        window.location.href = '/login?redirect=/dashboard';
        return;
      }

      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const redirectTo = data?.redirectTo;
        if (redirectTo) window.location.href = redirectTo;
        throw new Error(data?.error || 'Impossible d’ouvrir le portail');
      }
      if (!data?.url) throw new Error('URL portal manquante');
      window.location.href = data.url;
    } catch (err: any) {
      showToastMessage(err?.message || 'Erreur portail abonnement', 'error');
    }
  };

  useEffect(() => {
    if (currentView === 'parametres') {
      loadBillingInfo();
    }
  }, [currentView]);

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

  const FolderCardSkeleton = () => (
    <div className="as-card p-6 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="h-12 w-12 rounded-2xl bg-slate-100 border border-slate-200" />
          <div className="min-w-0">
            <div className="h-4 w-40 bg-slate-200 rounded" />
            <div className="mt-2 h-3 w-28 bg-slate-100 rounded" />
          </div>
        </div>
        <div className="h-6 w-16 bg-slate-100 rounded-full border border-slate-200" />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="h-10 bg-slate-100 rounded-2xl border border-slate-200" />
        <div className="h-10 bg-slate-100 rounded-2xl border border-slate-200" />
      </div>
    </div>
  );

  const StatsCardSkeleton = () => (
    <div className="card-clean rounded-3xl p-6 bg-white border border-slate-200 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <div className="h-3 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded w-20 animate-shimmer bg-[length:200%_100%]"></div>
          <div className="h-9 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded w-36 animate-shimmer bg-[length:200%_100%]"></div>
          <div className="h-3 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded w-24 animate-shimmer bg-[length:200%_100%]"></div>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-orange-100 via-orange-50 to-orange-100 animate-shimmer bg-[length:200%_100%]"></div>
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
  const [pendingInvoiceOriginal, setPendingInvoiceOriginal] = useState<any>(null);
  const [pendingManuallyEdited, setPendingManuallyEdited] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // États pour la gestion des dossiers
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsStats, setProjectsStats] = useState<ProjectStats[]>([]);
  // Multi-sélection mois (Chronologie avancée)
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [showMonthSelector, setShowMonthSelector] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [comptableEmail, setComptableEmail] = useState('');
  const [emailContext, setEmailContext] = useState<{
    type: 'folder' | 'invoice' | 'monthly';
    data?: any;
  } | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [newProject, setNewProject] = useState({
    nom: '',
    client: '',
    // @ts-ignore
    budget_alloue: ''
  });

  // Paiement/abonnement supprimé : on laisse toutes les fonctionnalités accessibles
  const isLoadingProfile = false;
  const loadingProgress = 100;
  const activationMessage = '';

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
    if (monthKey === '__none__') return 'Sans période';
    // monthKey = YYYY-MM
    if (!/^\d{4}-\d{2}$/.test(monthKey)) return monthKey || 'Mois inconnu';
    const d = new Date(`${monthKey}-01T00:00:00`);
    const label = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(d);
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const availableMonths = useMemo(() => {
    const keys = invoices
      .map((inv) => getMonthKey((inv as any)?.date_facture || undefined) || '__none__')
      .filter(Boolean);
    return Array.from(new Set(keys)).sort((a, b) => b.localeCompare(a));
  }, [invoices]);

  // ✅ Décision produit: la période est OPTIONNELLE.
  // Par défaut on affiche TOUTES les factures (selectedMonths = []).

  // ========== CHARGEMENT DE L'EMAIL DU COMPTABLE DEPUIS LE PROFIL ==========
  useEffect(() => {
    const loadComptableEmail = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('comptable_email')
          .eq('id', user.id)
          .single();

        if (error) {
          console.warn('⚠️ Impossible de charger l\'email du comptable:', error.message);
          return;
        }

        if (profile?.comptable_email) {
          console.log('✅ Email du comptable chargé depuis le profil');
          setComptableEmail(profile.comptable_email);
        }
      } catch (err) {
        console.warn('⚠️ Erreur lors du chargement de l\'email:', err);
      }
    };

    loadComptableEmail();
  }, []); // Charger une seule fois au montage

  // Fonction pour tout rafraîchir (Données)
  const refreshAllData = async () => {
    console.log('🔄 Rafraîchissement global des données demandé...');
    setLoadingInvoices(true);
    try {
      await Promise.all([
        loadInvoices(),
        loadFolders()
      ]);
      showToastMessage('Données actualisées', 'success');
    } catch (err) {
      showToastMessage('Erreur lors de l\'actualisation', 'error');
    } finally {
      setLoadingInvoices(false);
    }
  };

  // Accès Dashboard : authentification uniquement
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login?redirect=/dashboard';
        return;
      }
      // Vérification PRO : Stripe est la source de vérité (subscription réelle)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_pro')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('❌ Dashboard: erreur récupération profil', profileError);
        setUserEmail(user.email || null);
        setIsProUser(false);
        return;
      }

      const isPro = (profile as any)?.is_pro === true;
      setUserEmail(user.email || null);
      setIsProUser(isPro);
    };
    checkAuth();
  }, []);

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
    const invMonthKey = getMonthKey(inv.date_facture || undefined) || '__none__';
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
      inv.categorie || ''
    ].map(f => f.toLowerCase());

    const matchSearch = searchFields.some(field => field.includes(searchLower));

    return matchMonth && matchCategory && matchSearch;
  });

  const historiqueSummary = useMemo(() => {
    const list = filteredInvoices || [];
    const totalHT = list.reduce((sum, inv) => sum + (Number(inv.amount_ht) || 0), 0);
    const totalTVA = list.reduce((sum, inv) => sum + (Number(inv.amount_tva) || 0), 0);
    const totalTTC = list.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
    return { totalHT, totalTVA, totalTTC, count: list.length };
  }, [filteredInvoices]);

  // Fonction helper pour parser n'importe quel montant en nombre (Bloc 2)
  const parseAmount = (val: any) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const str = String(val).replace(',', '.').replace(/[^\d.-]/g, '');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  };

  // Normalisation catégorie (évite emojis/variantes → stable pour exports & compta)
  const normalizeCategory = (val: any) => {
    const raw = (val ?? '').toString();
    // Retirer emojis + nettoyer espaces
    const noEmoji = raw.replace(
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
      ''
    );
    return noEmoji.replace(/\s+/g, ' ').trim();
  };

  const formatDateLabel = (raw?: string) => {
    const s = formatDateFR(raw);
    return s || '—';
  };

  const formatDateTimeLabel = (raw?: string) => {
    if (!raw) return '—';
    const d = new Date(raw);
    if (isNaN(d.getTime())) return '—';
    const date = d.toLocaleDateString('fr-FR');
    const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `${date} à ${time}`;
  };

  // Formatage des montants pour affichage (Espace pour les milliers, signe € à la fin)
  const formatDisplayAmount = (amount?: number | string | null) => {
    // Ultra défensif: certaines anciennes lignes peuvent avoir des montants manquants
    const num = typeof amount === 'string' ? parseAmount(amount) : parseAmount(amount);
    return num.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + ' €';
  };

  // Stats calculées depuis les factures filtrées
  const stats = {
    totalHT: filteredInvoices.reduce((sum: number, inv: Invoice) => sum + parseAmount(inv.amount_ht), 0),
    totalTTC: filteredInvoices.reduce((sum: number, inv: Invoice) => sum + parseAmount(inv.total_amount), 0),
    tvaRecuperable: filteredInvoices.reduce((sum: number, inv: Invoice) => sum + parseAmount(inv.amount_tva), 0),
    nombreFactures: filteredInvoices.length
  };

  // (Vercel) Logging minimal: pas de logs de stats en production

  // Données pour le graphique des 7 derniers jours (TTC) - VERSION DYNAMIQUE
  const getLast7DaysData = () => {
    devLog('🔍 Graph 7j: invoices=', invoices.length);
    
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
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const last7 = invoices.filter((s: any) => {
      const d = s?.created_at ? new Date(s.created_at) : null;
      if (!d || isNaN(d.getTime())) return false;
      return d >= cutoff;
    });
    devLog('📦 Graph 7j: last7=', last7.length);
    
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

      // ✅ Agrégation TTC par jour basée sur created_at (règle V1)
      last7.forEach((s: any) => {
        const createdDay = getPureISODate(s.created_at);
        if (createdDay === targetDateStr) {
          dayTotal += parseAmount(s.total_amount);
        }
      });

      // devLog(`📊 ${label} (${targetDateStr}): ${dayTotal}€`);

      processedData.push({
        date: label,
        montant: dayTotal,
        _iso: targetDateStr
      });
    }

    // devLog("📊 Données du graphique:", processedData);
    return processedData;
  };

  // Mémoriser les données du graphique pour éviter les calculs inutiles et assurer la réactivité
  const chartData = useMemo(() => {
    return getLast7DaysData();
  }, [invoices]); // ✅ Dépendre de invoices, pas filteredInvoices

  // Toast helper
  const showToastMessage = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Charger les factures depuis Supabase - SOURCE UNIQUE DE DONNÉES
  const loadInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
      const { data, error } = await supabase
          .from('scans')
        .select('*')
          .eq('user_id', user.id)
          .neq('archived', true)  // ✅ Exclure les factures archivées
          .order('created_at', { ascending: false });

      if (error) {
          console.error('❌ Erreur Supabase:', error);
          throw error;
        }
        
        devLog('✅ Factures Supabase:', data?.length || 0);
        
        // Normaliser les champs (évite bugs historiques/excel/csv sur anciennes lignes)
        const normalized = (data || []).map((inv: any) => {
          // V1: on lit uniquement les champs standard (amount_ht/amount_tva/total_amount)
          const ht = parseAmount(inv.amount_ht);
          const tva = parseAmount(inv.amount_tva);
          const ttc = parseAmount(inv.total_amount) || (ht + tva);

          // ✅ Période optionnelle: date_facture peut être NULL (=> "Sans période")
          const rawDate = inv?.date_facture ?? inv?.date ?? null;
          const dateFacture = typeof rawDate === 'string' ? rawDate.trim() : '';

          return {
            ...inv,
            total_amount: ttc,
            amount_ht: ht,
            amount_tva: tva,
            date_facture: dateFacture || '',
            categorie: normalizeCategory(inv.categorie || ''),
            modified_manually: inv.modified_manually === true,
          } as Invoice;
        });

        setInvoices(normalized);
      } else {
        devWarn('⚠️ Aucun utilisateur connecté');
      }
    } catch (err) {
      console.error('❌ Erreur chargement factures:', err);
      showToastMessage('Impossible de charger vos factures. Vérifiez votre connexion et réessayez.', 'error');
    } finally {
      setLoadingInvoices(false);
    }
  };

  // ===== GESTION DES DOSSIERS PERSONNALISÉS =====
  const loadFolders = async () => {
    console.log('📂 === CHARGEMENT DES DOSSIERS ===');
    setLoadingFolders(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('⚠️ Aucun utilisateur connecté pour charger les dossiers');
        setFolders([]);
        return;
      }

      console.log('👤 Utilisateur connecté:', user.id);

      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', user.id)
        .neq('archived', true) // Exclure les dossiers archivés
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erreur Supabase:', error);
        throw error;
      }

      console.log('✅ Dossiers chargés:', data?.length || 0);
      setFolders(data || []);
    } catch (err) {
      console.error('❌ Erreur chargement dossiers:', err);
      setFolders([]);
    } finally {
      setLoadingFolders(false);
      console.log('✅ === FIN CHARGEMENT DOSSIERS ===');
    }
  };

  const createFolder = async () => {
    if (!folderName.trim()) {
      showToastMessage('❌ Le nom du dossier est requis', 'error');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showToastMessage('❌ Utilisateur non connecté', 'error');
        return;
      }

      const { data, error } = await supabase
        .from('folders')
        .insert([{
          user_id: user.id,
          name: folderName.trim(),
          reference: folderReference.trim()
        }])
        .select();

      if (error) throw error;

      showToastMessage('✅ Dossier créé !', 'success');
      setFolderName('');
      setFolderReference('');
      setShowFolderModal(false);
      loadFolders();
    } catch (err: any) {
      console.error('Erreur création dossier:', err);
      showToastMessage(`❌ ${err.message}`, 'error');
    }
  };

  const deleteFolder = async (folderId: string) => {
    if (!confirm('Supprimer ce dossier ? Les factures ne seront pas supprimées.')) return;

    try {
      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;

      showToastMessage('✅ Dossier supprimé', 'success');
      loadFolders();
      if (selectedFolder?.id === folderId) {
        setSelectedFolder(null);
      }
    } catch (err: any) {
      console.error('Erreur suppression dossier:', err);
      showToastMessage(`❌ ${err.message}`, 'error');
    }
  };

  // Archiver un dossier
  const archiveFolder = async (folderId: string) => {
    try {
      const { error } = await supabase
        .from('folders')
        .update({ archived: true })
        .eq('id', folderId);

      if (error) throw error;

      showToastMessage('📦 Dossier archivé !', 'success');
      loadFolders();
    } catch (err) {
      console.error('Erreur archivage dossier:', err);
      showToastMessage('❌ Erreur lors de l\'archivage', 'error');
    }
  };

  // Déplacer une facture vers un dossier
  const moveInvoiceToFolder = async (invoiceId: string, folderId: string | null) => {
    try {
      console.log('📂 Déplacement facture:', invoiceId, '→ dossier:', folderId);
      
      // Validation des IDs
      if (!invoiceId || invoiceId.trim() === '') {
        throw new Error('ID de facture invalide');
      }
      
      if (folderId !== null && (!folderId || folderId.trim() === '')) {
        throw new Error('ID de dossier invalide');
      }
      
      // Récupérer l'utilisateur connecté
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('Utilisateur non connecté');
      }
      
      // Vérifier que la facture existe
      const invoiceExists = invoices.find(inv => inv.id === invoiceId);
      if (!invoiceExists) {
        throw new Error('Facture introuvable');
      }
      
      console.log('✅ Facture:', invoiceExists.entreprise);
      
      // Vérifier que le dossier existe (si folderId n'est pas null)
      if (folderId !== null) {
        const folderExists = folders.find(f => f.id === folderId);
        if (!folderExists) {
          throw new Error('Dossier introuvable');
        }
        console.log('✅ Dossier:', folderExists.name);
      }
      
      // Update avec filtre user_id pour RLS
      const { data, error } = await supabase
        .from('scans')
        .update({ folder_id: folderId })
        .eq('id', invoiceId)
        .eq('user_id', user.id)
        .select();

      if (error) {
        console.error('❌ Erreur Supabase:', error.message);
        throw new Error(`Erreur: ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.error('❌ Aucune ligne modifiée - Vérifiez les permissions RLS');
        throw new Error('Impossible de déplacer la facture. Réessayez dans quelques secondes.');
      }
      
      console.log('✅ Transfert réussi! folder_id:', data[0].folder_id);

      // Rechargement des données
      await loadInvoices();
      
      // Message de succès
      if (folderId) {
        const folder = folders.find(f => f.id === folderId);
        showToastMessage(`✅ Facture déplacée vers "${folder?.name || 'le dossier'}"`, 'success');
      } else {
        showToastMessage('✅ Facture retirée du dossier', 'success');
      }

      setShowMoveToFolderModal(false);
      setInvoiceToMove(null);
      
      // Double rechargement pour être sûr
      setTimeout(() => loadInvoices(), 500);
      
    } catch (err: any) {
      console.error('❌ Erreur:', err.message);
      showToastMessage(`❌ ${err.message}`, 'error');
    }
  };

  // Retirer une facture d'un dossier (remettre en vrac)
  const removeInvoiceFromFolder = async (invoiceId: string) => {
    await moveInvoiceToFolder(invoiceId, null);
  };

  // Export PDF d'un dossier  
  const exportFolderPDF = (folder: Folder) => {
    const folderInvoices = invoices.filter(inv => inv.folder_id === folder.id);
    
    if (folderInvoices.length === 0) {
      showToastMessage('❌ Aucune facture dans ce dossier', 'error');
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(249, 115, 22);
    doc.text('ArtisScan', 20, 25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('GESTION INTELLIGENTE', 20, 32);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(20, 40, 190, 40);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`Dossier: ${folder.name}`, 20, 55);
    if (folder.reference) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Réf: ${folder.reference}`, 20, 62);
    }
    const totalHT = folderInvoices.reduce((sum, inv) => sum + (inv.amount_ht || 0), 0);
    const totalTVA = folderInvoices.reduce((sum, inv) => sum + (inv.amount_tva || 0), 0);
    const totalTTC = folderInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    let yPos = 75;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Résumé financier', 20, yPos);
    yPos += 10;
    doc.setFillColor(248, 250, 252);
    doc.rect(20, yPos - 5, 170, 25, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Total HT:', 25, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(`${totalHT.toFixed(2)} €`, 160, yPos, { align: 'right' });
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.text('Total TVA:', 25, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(`${totalTVA.toFixed(2)} €`, 160, yPos, { align: 'right' });
    yPos += 8;
    doc.setFontSize(11);
    doc.setTextColor(249, 115, 22);
    doc.text('Total TTC:', 25, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(`${totalTTC.toFixed(2)} €`, 160, yPos, { align: 'right' });
    yPos += 15;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Liste des factures (${folderInvoices.length})`, 20, yPos);
    yPos += 5;
    const tableData = folderInvoices.map(inv => {
      return [
        new Date(inv.date_facture).toLocaleDateString('fr-FR'),
        inv.entreprise,
        `${inv.amount_ht.toFixed(2)} €`,
        `${inv.amount_tva.toFixed(2)} €`,
        `${inv.total_amount.toFixed(2)} €`
      ];
    });
    autoTable(doc, {
      startY: yPos,
      head: [['Date', 'Fournisseur', 'HT', 'TVA', 'TTC']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right', fontStyle: 'bold', textColor: [249, 115, 22] }
      }
    });
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text('Document généré par ArtisScan', 105, 280, { align: 'center' });
    doc.text(new Date().toLocaleDateString('fr-FR'), 105, 285, { align: 'center' });
    doc.save(`dossier_${folder.name.replace(/\s+/g, '_')}.pdf`);
    showToastMessage('📄 Export PDF téléchargé !', 'success');
  };

  // Export Excel d'un dossier
  const exportFolderExcel = (folder: Folder) => {
    const folderInvoices = invoices.filter(inv => inv.folder_id === folder.id);
    if (folderInvoices.length === 0) {
      showToastMessage('❌ Aucune facture dans ce dossier', 'error');
      return;
    }
    const data = folderInvoices.map(inv => {
      return {
        'Date': new Date(inv.date_facture).toLocaleDateString('fr-FR'),
        'Fournisseur': inv.entreprise,
        'Catégorie': inv.categorie || 'Non classé',
        'Description': inv.description || '',
        'Montant HT (€)': inv.amount_ht,
        'TVA (€)': inv.amount_tva,
        'Montant TTC (€)': inv.total_amount
      };
    });
    const totalHT = data.reduce((sum, row) => sum + row['Montant HT (€)'], 0);
    const totalTVA = data.reduce((sum, row) => sum + row['TVA (€)'], 0);
    const totalTTC = data.reduce((sum, row) => sum + row['Montant TTC (€)'], 0);
    const finalData = [...data, {}, {
      'Date': 'TOTAL',
      'Fournisseur': '',
      'Catégorie': '',
      'Description': '',
      'Montant HT (€)': totalHT,
      'TVA (€)': totalTVA,
      'Montant TTC (€)': totalTTC
    }];
    const ws = XLSX.utils.json_to_sheet(finalData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, folder.name.substring(0, 31));
    XLSX.writeFile(wb, `dossier_${folder.name.replace(/\s+/g, '_')}.xlsx`);
    showToastMessage('📊 Export Excel téléchargé !', 'success');
  };

  // Helpers CSV comptable (format FR, Excel-friendly)
  const formatDateFR = (raw?: string) => {
    if (!raw) return '';
    const d = new Date(raw);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('fr-FR'); // JJ/MM/AAAA
  };

  const formatDecimalFR = (n: number) => {
    const safe = Number.isFinite(n) ? n : 0;
    return safe.toFixed(2).replace('.', ',');
  };

  const escapeCSV = (value: string) => {
    const v = (value ?? '').toString().replace(/\r?\n/g, ' ');
    return `"${v.replace(/"/g, '""')}"`;
  };

  const getInvoiceAmounts = (inv: Invoice) => {
    const ht = Number.isFinite(inv.amount_ht) ? inv.amount_ht : 0;
    const tva = Number.isFinite(inv.amount_tva) ? inv.amount_tva : 0;
    const ttc = Number.isFinite(inv.total_amount) ? inv.total_amount : 0;
    return { ht, tva, ttc };
  };

  const isMathCoherent = (ht: number, tva: number, ttc: number) => {
    return Math.abs((ht + tva) - ttc) <= 0.05;
  };

  // Export CSV d'un dossier
  const exportFolderCSV = (folder: Folder) => {
    const folderInvoices = invoices.filter(inv => inv.folder_id === folder.id);
    if (folderInvoices.length === 0) {
      showToastMessage('❌ Aucune facture dans ce dossier', 'error');
      return;
    }

    const headers = [
      'Date',
      'Fournisseur',
      'Numéro facture',
      'Montant HT',
      'Montant TVA',
      'Montant TTC',
      'Catégorie',
      'Date d’ajout',
      'Modifié manuellement'
    ];

    // Hard fail si une facture est incohérente : on n’exporte pas un CSV “sale”
    for (const inv of folderInvoices) {
      const { ht, tva, ttc } = getInvoiceAmounts(inv);
      if (!isMathCoherent(ht, tva, ttc)) {
        showToastMessage('❌ Export impossible : au moins une facture a des montants incohérents (HT + TVA ≠ TTC). Corrigez-la avant export.', 'error');
        return;
      }
    }

      const rows = folderInvoices.map((inv) => {
      const { ht, tva, ttc } = getInvoiceAmounts(inv);
      const dateFacture = formatDateFR(inv.date_facture || inv.created_at);
      const dateAjout = formatDateFR(inv.created_at);
      const fournisseur = inv.entreprise?.trim() || 'Non renseigné';
      const categorie = inv.categorie || 'Non classé';
      const numeroFacture = ''; // Non stocké en V1 (colonne “si dispo”)

        if (!dateFacture || !dateAjout) {
          throw new Error('Date manquante sur au moins une facture.');
        }

      return [
        dateFacture,
        escapeCSV(fournisseur),
        escapeCSV(numeroFacture),
        formatDecimalFR(ht),
        formatDecimalFR(tva),
        formatDecimalFR(ttc),
        escapeCSV(categorie),
        dateAjout,
        inv.modified_manually ? 'oui' : 'non',
      ];
    });
    const csvContent = "\uFEFF" + [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `dossier_${folder.name.replace(/\s+/g, '_')}.csv`;
    link.click();
    showToastMessage('📊 Export CSV téléchargé !', 'success');
  };

  // Envoyer au comptable
  const sendToAccountant = async () => {
    // ========== VALIDATION STRICTE DE L'EMAIL ==========
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!comptableEmail || !emailRegex.test(comptableEmail)) {
      showToastMessage('❌ Email invalide. Format attendu : exemple@cabinet.fr', 'error');
      return;
    }

    // Validation supplémentaire : domaines suspects
    const suspiciousDomains = ['test.com', 'example.com', 'tempmail.com'];
    const domain = comptableEmail.split('@')[1]?.toLowerCase();
    if (suspiciousDomains.includes(domain)) {
      showToastMessage('⚠️ Veuillez utiliser un email professionnel valide', 'error');
      return;
    }

    if (!emailContext) {
      showToastMessage('❌ Contexte d\'envoi manquant', 'error');
      return;
    }

    setSendingEmail(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const user = session?.user;
      if (!token || !user) {
        showToastMessage('❌ Session expirée. Reconnectez-vous.', 'error');
        window.location.href = '/login?redirect=/dashboard';
        return;
      }

      // ========== SAUVEGARDER L'EMAIL DU COMPTABLE DANS LE PROFIL ==========
      // Mise à jour silencieuse (on ne bloque pas si ça échoue)
      try {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ comptable_email: comptableEmail })
          .eq('id', user.id);
        
        if (updateError) {
          console.warn('⚠️ Impossible de sauvegarder l\'email du comptable:', updateError.message);
        } else {
          console.log('✅ Email du comptable sauvegardé dans le profil');
        }
      } catch (saveErr) {
        console.warn('⚠️ Erreur lors de la sauvegarde de l\'email:', saveErr);
      }

      let invoicesData: Invoice[] = [];
      let invoicesCount = 0;
      let totalHT = 0;
      let totalTVA = 0;
      let totalTTC = 0;
      let periodDescription = '';

      // Récupérer les factures selon le contexte
      if (emailContext.type === 'folder' && emailContext.data) {
        const folder = emailContext.data as Folder;
        const folderInvoices = invoices.filter(inv => inv.folder_id === folder.id);
        
        if (folderInvoices.length === 0) {
          showToastMessage('❌ Aucune facture dans ce dossier', 'error');
          setSendingEmail(false);
          return;
        }

        invoicesData = folderInvoices;
        invoicesCount = folderInvoices.length;
        totalHT = folderInvoices.reduce((sum, inv) => sum + (inv.amount_ht || 0), 0);
        totalTVA = folderInvoices.reduce((sum, inv) => sum + (inv.amount_tva || 0), 0);
        totalTTC = folderInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
        periodDescription = `le dossier "${folder.name}"`;

      } else if (emailContext.type === 'monthly') {
        // Export mensuel (sélection multiple)
        const filtered = filteredInvoices;
        
        if (filtered.length === 0) {
          showToastMessage('❌ Aucune facture pour cette période', 'error');
          setSendingEmail(false);
          return;
        }
        
        invoicesData = filtered;
        invoicesCount = filtered.length;
        totalHT = filtered.reduce((sum, inv) => sum + (inv.amount_ht || 0), 0);
        totalTVA = filtered.reduce((sum, inv) => sum + (inv.amount_tva || 0), 0);
        totalTTC = filtered.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
        periodDescription = selectedMonths.length > 1 
          ? `${selectedMonths.length} mois sélectionnés` 
          : selectedMonths[0] || 'la période sélectionnée';
      }

      // Récupérer le nom d'utilisateur depuis localStorage
      const companyName = localStorage.getItem('company_name') || '';
      const userName = companyName || user.email?.split('@')[0] || '';

      // Appeler l'API d'envoi (PDF + CSV comptable + FEC générés côté serveur)
      const response = await fetch('/api/send-accounting', {
            method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
          comptableEmail,
          userName,
          userEmail: user.email,
          companyName,
          invoices: invoicesData, // Envoyer les données brutes des factures
          invoicesCount,
          totalHT: totalHT.toFixed(2),
          totalTVA: totalTVA.toFixed(2),
          totalTTC: totalTTC.toFixed(2),
          periodDescription
        })
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) throw new Error('Session expirée. Reconnectez-vous puis réessayez.');
        if (response.status === 403) throw new Error('Fonctionnalité Pro requise pour l’envoi comptable.');
        throw new Error(result.error || 'Erreur lors de l\'envoi');
      }

      showToastMessage(`✅ Email envoyé à ${comptableEmail} (PDF + CSV comptable + FEC)`, 'success');
      setShowEmailModal(false);
      setComptableEmail('');
      setEmailContext(null);

    } catch (err: any) {
      console.error('❌ Erreur envoi comptable:', err);
      showToastMessage(`❌ ${err.message}`, 'error');
        } finally {
      setSendingEmail(false);
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

  // Charger les dossiers au montage initial
  useEffect(() => {
    console.log('📂 Montage initial - Chargement des dossiers...');
    loadFolders();
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
      case 'amount_ht':
        return sorted.sort((a, b) => b.amount_ht - a.amount_ht);
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
      console.log('🗑️ Tentative de suppression de la facture:', invoiceToDelete);
      
      const { data, error } = await supabase
        .from('scans')
        .delete()
        .eq('id', invoiceToDelete)
        .select();

      if (error) {
        console.error('❌ Erreur suppression:', error);
        throw error;
      }
      
      console.log('✅ Facture supprimée:', data);
      
      await loadInvoices();
      showToastMessage('✅ Facture supprimée !', 'success');
      setShowDeleteModal(false);
      setInvoiceToDelete(null);
    } catch (err) {
      console.error('❌ Erreur complète:', err);
      showToastMessage('❌ Erreur lors de la suppression', 'error');
    }
  };

  // Archiver une facture
  const archiveInvoice = async (id: string) => {
    try {
      console.log('📦 Archivage de la facture:', id);
      
      const { error } = await supabase
        .from('scans')
        .update({ archived: true })
        .eq('id', id);
      
      if (error) {
        console.error('❌ Erreur archivage:', error);
        throw error;
      }
      
      console.log('✅ Facture archivée');
      
      await loadInvoices();
      showToastMessage('📦 Facture archivée !', 'success');
    } catch (err) {
      console.error('❌ Erreur archivage:', err);
      showToastMessage('❌ Erreur lors de l\'archivage', 'error');
    }
  };

  // Export CSV d'une facture individuelle
  const exportInvoiceCSV = (invoice: Invoice) => {
    const headers = [
      'Date',
      'Fournisseur',
      'Numéro facture',
      'Montant HT',
      'Montant TVA',
      'Montant TTC',
      'Catégorie',
      'Date d’ajout',
      'Modifié manuellement'
    ];

    const { ht, tva, ttc } = getInvoiceAmounts(invoice);
    if (!isMathCoherent(ht, tva, ttc)) {
      showToastMessage('❌ Export impossible : montants incohérents (HT + TVA ≠ TTC). Corrigez la facture avant export.', 'error');
      return;
    }

    const row = [
      formatDateFR(invoice.date_facture || invoice.created_at),
      escapeCSV(invoice.entreprise?.trim() || 'Non renseigné'),
      escapeCSV(''),
      formatDecimalFR(ht),
      formatDecimalFR(tva),
      formatDecimalFR(ttc),
      escapeCSV(invoice.categorie || 'Non classé'),
      formatDateFR(invoice.created_at),
      invoice.modified_manually ? 'oui' : 'non',
    ];

    const csvContent = "\uFEFF" + [headers.join(';'), row.join(';')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `facture_${invoice.entreprise}_${new Date(invoice.date_facture).toLocaleDateString('fr-FR').replace(/\//g, '-')}.csv`;
    link.click();
    
    showToastMessage('📊 Export CSV téléchargé !', 'success');
  };

  // Export Excel d'une facture individuelle
  const exportInvoiceExcel = (invoice: Invoice) => {
    const tvaAmount = invoice.amount_tva || 0;
    const ttcAmount = invoice.total_amount || 0;
    
    const data = [{
      'Date Facture': new Date(invoice.date_facture).toLocaleDateString('fr-FR'),
      'Fournisseur': invoice.entreprise,
      'Montant HT (€)': invoice.amount_ht,
      'TVA (€)': tvaAmount,
      'Montant TTC (€)': ttcAmount,
      'Catégorie': invoice.categorie || 'Non classé',
      'Description': invoice.description || ''
    }];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Facture');
    
    XLSX.writeFile(wb, `facture_${invoice.entreprise}_${new Date(invoice.date_facture).toLocaleDateString('fr-FR').replace(/\//g, '-')}.xlsx`);
    
    showToastMessage('📊 Export Excel téléchargé !', 'success');
  };

  // Export PDF d'une facture individuelle
  const exportInvoicePDF = (invoice: Invoice) => {
    const doc = new jsPDF();
    
    // Logo ArtisScan en haut
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(249, 115, 22); // Orange
    doc.text('ArtisScan', 20, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // Slate
    doc.text('GESTION INTELLIGENTE', 20, 32);
    
    // Ligne de séparation
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(20, 40, 190, 40);
    
    // Titre
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Facture', 20, 55);
    
    // Informations de la facture
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const tvaAmount = invoice.amount_tva || 0;
    const tvaPercent = invoice.amount_ht > 0 ? Math.round((tvaAmount / invoice.amount_ht) * 100) : 0;
    const ttcAmount = invoice.total_amount || 0;
    
    let yPos = 70;
    
    // Fournisseur
    doc.setFont('helvetica', 'bold');
    doc.text('Fournisseur:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.entreprise, 70, yPos);
    yPos += 10;
    
    // Date
    doc.setFont('helvetica', 'bold');
    doc.text('Date:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(invoice.date_facture).toLocaleDateString('fr-FR'), 70, yPos);
    yPos += 10;
    
    // Catégorie
    doc.setFont('helvetica', 'bold');
    doc.text('Catégorie:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.categorie || 'Non classé', 70, yPos);
    yPos += 10;
    
    // Description
    if (invoice.description) {
      doc.setFont('helvetica', 'bold');
      doc.text('Description:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      const splitDescription = doc.splitTextToSize(invoice.description, 120);
      doc.text(splitDescription, 70, yPos);
      yPos += (splitDescription.length * 7) + 5;
    } else {
      yPos += 5;
    }
    
    // Ligne de séparation
    doc.setDrawColor(226, 232, 240);
    doc.line(20, yPos, 190, yPos);
    yPos += 15;
    
    // Tableau des montants
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Résumé financier', 20, yPos);
    yPos += 10;
    
    // Fond gris clair pour le tableau
    doc.setFillColor(248, 250, 252);
    doc.rect(20, yPos - 5, 170, 35, 'F');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    // Montant HT
    doc.text('Montant HT:', 25, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(`${invoice.amount_ht.toFixed(2)} €`, 160, yPos, { align: 'right' });
    yPos += 10;
    
    // TVA
    doc.setFont('helvetica', 'normal');
    doc.text(`TVA (${tvaPercent}%):`, 25, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(`${tvaAmount.toFixed(2)} €`, 160, yPos, { align: 'right' });
    yPos += 10;
    
    // Total TTC
    doc.setFontSize(13);
    doc.setTextColor(249, 115, 22);
    doc.text('Total TTC:', 25, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(`${ttcAmount.toFixed(2)} €`, 160, yPos, { align: 'right' });
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text('Document généré par ArtisScan', 105, 280, { align: 'center' });
    doc.text(new Date().toLocaleDateString('fr-FR'), 105, 285, { align: 'center' });
    
    doc.save(`facture_${invoice.entreprise}_${new Date(invoice.date_facture).toLocaleDateString('fr-FR').replace(/\//g, '-')}.pdf`);
    
    showToastMessage('📄 Export PDF téléchargé !', 'success');
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

  // Export CSV comptable (cabinet)
  const exportToCSV = () => {
    const invoicesToExport = getSortedInvoices();
    if (invoicesToExport.length === 0) {
      showToastMessage('❌ Aucune facture à exporter', 'error');
      return;
    }

    const csvContent = generateAccountingCSV(invoicesToExport as any);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const fileName = selectedMonths.length === 1
      ? `ArtisScan_CSV_Comptable_${getMonthLabel(selectedMonths[0])}.csv`
      : `ArtisScan_CSV_Comptable_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToastMessage('✅ Export CSV comptable téléchargé', 'success');
  };

  // Export FEC (France, strict)
  const exportToFEC = () => {
    const invoicesToExport = getSortedInvoices();
    if (invoicesToExport.length === 0) {
      showToastMessage('❌ Aucune facture à exporter', 'error');
      return;
    }

    const fec = generateFEC(invoicesToExport as any);
    const blob = new Blob([fec], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const fileName = selectedMonths.length === 1
      ? `ArtisScan_FEC_${getMonthLabel(selectedMonths[0]).replace(/\s+/g, '_')}.txt`
      : `ArtisScan_FEC_${new Date().toISOString().split('T')[0]}.txt`;
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToastMessage('✅ Export FEC téléchargé', 'success');
  };

  // Export PDF comptable (A4 lisible cabinet)
  const exportToPDFComptable = () => {
    const invoicesToExport = getSortedInvoices();
    if (invoicesToExport.length === 0) {
      showToastMessage('❌ Aucune facture à exporter', 'error');
      return;
    }

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const exportDate = new Date();
    const headerName = (companyName || 'Entreprise').toString().trim();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text('Export comptable', 14, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Entreprise : ${headerName}`, 14, 26);
    doc.text(`Date d’export : ${exportDate.toLocaleDateString('fr-FR')}`, 14, 32);
    doc.text(`Période : ${selectedMonths.length === 0 ? 'Toutes les périodes' : (selectedMonths.length === 1 ? getMonthLabel(selectedMonths[0]) : `${selectedMonths.length} mois`)}`, 14, 38);

    let sumHT = 0;
    let sumTVA = 0;
    let sumTTC = 0;
    const byRate = new Map<string, number>();

    const bodyRows = [...invoicesToExport]
      .sort((a, b) => new Date(a.date_facture || a.created_at).getTime() - new Date(b.date_facture || b.created_at).getTime())
      .map((inv) => {
        const amounts = getBestEffortAmounts(inv as any);
        sumHT += amounts.ht;
        sumTVA += amounts.tva;
        sumTTC += amounts.ttc;
        const rateKey = amounts.vatRatePercent ? `${amounts.vatRatePercent}%` : '0%';
        byRate.set(rateKey, (byRate.get(rateKey) || 0) + amounts.tva);

        const dateIso = toYyyyMmDdOrToday(inv.date_facture || inv.created_at);
        const frDate = new Date(dateIso).toLocaleDateString('fr-FR');
        const fournisseur = inv.entreprise || 'Non renseigné';
        const libelle = inv.description || `Achat - ${fournisseur}`;
        const period = getAccountingPeriodLabel(inv as any);

        return [
          frDate,
          fournisseur,
          libelle,
          formatDecimalDot(amounts.ht),
          formatDecimalDot(amounts.tva),
          formatDecimalDot(amounts.ttc),
          rateKey,
          period,
        ];
      });

    autoTable(doc, {
      startY: 46,
      head: [['Date', 'Fournisseur', 'Libellé', 'HT', 'TVA', 'TTC', 'Taux TVA', 'Période']],
      body: bodyRows,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
    });

    const finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 8 : 260;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Totaux', 14, Math.min(finalY, 270));
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Total HT : ${formatDecimalDot(sumHT)} €`, 14, Math.min(finalY + 6, 276));
    doc.text(`Total TVA : ${formatDecimalDot(sumTVA)} €`, 14, Math.min(finalY + 12, 282));
    doc.text(`Total TTC : ${formatDecimalDot(sumTTC)} €`, 14, Math.min(finalY + 18, 288));

    const rates = Array.from(byRate.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    if (rates.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('TVA par taux', 120, Math.min(finalY, 270));
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      rates.slice(0, 6).forEach(([rate, tvaAmount], i) => {
        doc.text(`${rate} : ${formatDecimalDot(tvaAmount)} €`, 120, Math.min(finalY + 6 + i * 6, 288));
      });
    }

    const fileName = selectedMonths.length === 1
      ? `ArtisScan_PDF_Comptable_${getMonthLabel(selectedMonths[0]).replace(/\s+/g, '_')}.pdf`
      : `ArtisScan_PDF_Comptable_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    showToastMessage('✅ Export PDF comptable téléchargé', 'success');
  };

  // Export Excel (.xlsx) - Version Multi-Mois avec onglets
  const exportToExcel = () => {
    const sortedInvoices = getSortedInvoices();
    if (sortedInvoices.length === 0) {
      showToastMessage('❌ Aucune facture à exporter', 'error');
      return;
    }

    const wb = XLSX.utils.book_new();

    // Fonction helper pour formater les données d'une facture
    const formatInvoiceData = (inv: Invoice) => {
      const monthKey = getMonthKey(inv.date_facture || inv.created_at);
      const ht = parseAmount(inv.amount_ht);
      const ttc = parseAmount(inv.total_amount);
      const tvaAmount = ttc - ht;
      const tvaPercent = ht > 0 ? Math.round((tvaAmount / ht) * 100) : 0;
      
      return {
        'Date Facture': new Date(inv.date_facture).toLocaleDateString('fr-FR'),
        'Mois': monthKey ? getMonthLabel(monthKey) : 'Mois inconnu',
        'Fournisseur': inv.entreprise,
        'Catégorie': inv.categorie || 'Non classé',
        'Description': inv.description || '',
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
        const totalHT = monthInvoices.reduce((sum, inv) => sum + parseAmount(inv.amount_ht), 0);
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
    // Logic continued
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
    // Logic continued
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
    // Note: La gestion par project_id a été remplacée par folder_id
    const projectInvoices = invoices.filter(inv => inv.folder_id === projectStats.id)
      .sort((a, b) => new Date(b.date_facture).getTime() - new Date(a.date_facture).getTime());
    
    const tableData = projectInvoices.map((inv: Invoice) => [
      new Date(inv.date_facture).toLocaleDateString('fr-FR'),
      inv.entreprise,
      inv.categorie || 'Non classé',
      inv.description || '-',
      formatPDFCurrency(parseAmount(inv.amount_ht)),
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
    // Logic continued
    // Note: La gestion par project_id a été remplacée par folder_id
    const projectInvoices = invoices.filter(inv => inv.folder_id === projectStats.id);
    if (projectInvoices.length === 0) {
      showToastMessage('❌ Aucune facture pour ce projet', 'error');
      return;
    }

    const wb = XLSX.utils.book_new();
    const data = projectInvoices.map((inv: Invoice) => {
      const ht = parseAmount(inv.amount_ht);
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
          if (!ctx) {
            resolve((event.target?.result as string) || '');
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);

          // ✅ Prétraitement best-effort: niveaux de gris + contraste
          // Objectif: améliorer les photos sombres / compressées sans jamais bloquer.
          try {
            const imageData = ctx.getImageData(0, 0, width, height);
            const d = imageData.data;
            const contrast = 1.15;
            const brightness = 10;
            for (let i = 0; i < d.length; i += 4) {
              const r = d[i];
              const g = d[i + 1];
              const b = d[i + 2];
              let v = 0.2126 * r + 0.7152 * g + 0.0722 * b;
              v = (v - 128) * contrast + 128 + brightness;
              v = Math.max(0, Math.min(255, v));
              d[i] = v;
              d[i + 1] = v;
              d[i + 2] = v;
            }
            ctx.putImageData(imageData, 0, 0);
          } catch {
            // ignore
          }

          // ✅ Compression adaptative: jamais bloquante
          const qualities = [0.8, 0.65, 0.5, 0.4];
          let best = canvas.toDataURL('image/jpeg', 0.7);
          for (const q of qualities) {
            const candidate = canvas.toDataURL('image/jpeg', q);
            const mb = (candidate.length * 3) / 4 / (1024 * 1024);
            best = candidate;
            if (mb <= 4) break;
          }
          resolve(best);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  // Helper : toute modification manuelle dans la modale doit être tracée
  const updatePendingInvoice = (patch: Record<string, any>) => {
    setPendingInvoiceData((prev: any) => ({ ...(prev || {}), ...patch }));
    setPendingManuallyEdited(true);
  };

  const handleAnalyze = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Formats acceptés: PDF / PNG / JPEG (objectif V1)
    const fileType = (file.type || '').toLowerCase();
    const isPdf = fileType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isJpeg = fileType === 'image/jpeg' || fileType === 'image/jpg';
    const isPng = fileType === 'image/png';

    if (!isPdf && !isJpeg && !isPng) {
      showToastMessage('❌ Format invalide. Formats acceptés : PDF, PNG, JPEG.', 'error');
      return;
    }

    // Vérification taille fichier original
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > 10) {
      showToastMessage('Analyse partielle possible : fichier volumineux — tentative en cours…', 'success');
    }
    if (file.size < 25 * 1024) {
      showToastMessage('Analyse partielle possible : photo très compressée — tentative en cours…', 'success');
    }

    setAnalyzing(true);
    setError('');
    setResult(null);
    setLoadingMessage(LOADING_MESSAGES[0]);
    setAnalysisStep('upload');

    try {
      // ✅ Pipeline simplifié: on envoie le fichier au serveur (multipart),
      // sans preview et sans PDF.js côté client.
      const form = new FormData();
      form.append('kind', isPdf ? 'pdf' : 'image');

      if (isPdf) {
        // PDF: envoyer brut (multi-pages support côté serveur)
        form.append('file', file, file.name || 'facture.pdf');
      } else {
        // Image: compresser (perf) puis envoyer en blob
        const imageDataUrl = await compressImage(file);
        const blob = await (await fetch(imageDataUrl)).blob();
        form.append('file', blob, 'facture.jpg');
      }

      // Étapes UX
      setAnalysisStep('ocr');

      // Récupérer le token Supabase pour auth serveur (bug "non authentifié")
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        showToastMessage('❌ Session expirée. Reconnectez-vous.', 'error');
        window.location.href = '/login?redirect=/dashboard';
        return;
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
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
        // Best effort: on ne bloque pas, on continue avec une analyse partielle
        showToastMessage('Analyse partielle — certaines données peuvent nécessiter une vérification.', 'success');
      }

      setAnalysisStep('extract');
      setResult(data);

      // ✅ Sauvegarde automatique (brouillon) : aucune facture ne doit être perdue.
      let draftId: string | null = null;
      try {
        const draftPayload = {
          invoiceData: {
            source: 'scan',
            entreprise: data?.entreprise || 'Non spécifié',
            description: data?.description || '',
            categorie: data?.categorie || 'Autre',
            date_facture: null, // période optionnelle
            folder_id: preselectFolderId ?? null,
            amount_ht: data?.amount_ht ?? null,
            amount_tva: data?.amount_tva ?? null,
            total_amount: data?.total_amount ?? null,
            modified_manually: false,
          },
        };

        const draftRes = await fetch('/api/scans', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(draftPayload),
        });
        const draftJson = await draftRes.json().catch(() => ({}));
        if (draftRes.ok && draftJson?.invoice?.id) {
          draftId = String(draftJson.invoice.id);
          // Rafraîchir pour rendre la facture visible immédiatement
          await loadInvoices();
          setSelectedMonths([]); // jamais de facture "invisible"
          setCurrentView('historique');
        }
      } catch (eDraft) {
        // On ne bloque jamais
        devWarn('⚠️ Brouillon: impossible d’enregistrer automatiquement', eDraft);
      }

      // NE PAS sauvegarder automatiquement - Ouvrir la modale de validation
      // ✅ Standardiser les champs pour la modale (legacy: montant_ht / tva / montant_ttc)
      // /api/analyze renvoie désormais les champs canoniques: amount_ht / amount_tva / total_amount
      const htNum =
        (typeof data?.amount_ht === 'number' ? data.amount_ht : parseAmount(data?.amount_ht)) ||
        (typeof data?.montant_ht === 'number' ? data.montant_ht : parseAmount(data?.montant_ht));
      const tvaNum =
        (typeof data?.amount_tva === 'number' ? data.amount_tva : parseAmount(data?.amount_tva)) ||
        (typeof data?.tva === 'number' ? data.tva : parseAmount(data?.tva));
      const ttcNum =
        (typeof data?.total_amount === 'number' ? data.total_amount : parseAmount(data?.total_amount)) ||
        (typeof data?.montant_ttc === 'number' ? data.montant_ttc : parseAmount(data?.montant_ttc));

      // TVA fallback si l'API n'a pas pu la sortir mais qu'on a HT+TTC (dernier recours, sans inventer)
      const computedTva = (Number.isFinite(htNum) && Number.isFinite(ttcNum)) ? (ttcNum - htNum) : NaN;

      const enrichedData = {
        ...data,
        id: draftId || data?.id || null,
        // Champs legacy (strings) attendus par la modale
        montant_ht: Number.isFinite(htNum) ? String(htNum) : '',
        tva: Number.isFinite(tvaNum) ? String(tvaNum) : (Number.isFinite(computedTva) ? String(computedTva) : ''),
        montant_ttc: Number.isFinite(ttcNum) ? String(ttcNum) : '',
        // Dossier pré-sélectionné (ex: scan lancé depuis la page Dossiers)
        folder_id: data.folder_id ?? preselectFolderId ?? null,
      };
      
      devLog('📊 Données enrichies pour le formulaire:', enrichedData);
      
      setPendingInvoiceData(enrichedData);
      setPendingInvoiceOriginal(enrichedData);
      setPendingManuallyEdited(false);
      setShowValidationModal(true);
      setPreselectFolderId(null);
      // étape finale: on revient à l'état neutre
      setTimeout(() => setAnalysisStep(null), 250);

    } catch (err: any) {
      console.error('Erreur:', err);
      // ✅ Best effort: pas d'échec brutal. On crée un brouillon minimal.
      showToastMessage('Analyse partielle — certaines données sont manquantes, vous pourrez corriger.', 'success');
      setError('');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (token) {
          await fetch('/api/scans', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              invoiceData: {
                source: 'scan',
                entreprise: 'Document importé',
                description: 'Analyse partielle (OCR indisponible ou fichier difficile).',
                categorie: 'Autre',
                date_facture: null,
                folder_id: preselectFolderId ?? null,
                amount_ht: null,
                amount_tva: null,
                total_amount: null,
                modified_manually: false,
              },
            }),
          });
          await loadInvoices();
          setSelectedMonths([]);
          setCurrentView('historique');
        }
      } catch {}
      setAnalysisStep(null);
    } finally {
      setAnalyzing(false);
      // Permet de re-sélectionner le même fichier
      try { e.target.value = ''; } catch {}
    }
  };

  // Nouvelle fonction : Valider et enregistrer la facture
  const validateAndSaveInvoice = async () => {
    if (!pendingInvoiceData) return;

    try {
      // Sauvegarder dans Supabase
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('❌ Erreur auth:', authError.message);
        showToastMessage('❌ Erreur d\'authentification', 'error');
        return;
      }

      if (!user) {
        console.error('❌ Utilisateur non connecté');
        showToastMessage('❌ Utilisateur non connecté', 'error');
        return;
      }

      console.log('✅ User ID récupéré:', user.id);

      // Validation des données
      // ✅ Best effort: ne jamais bloquer l'utilisateur (on sauve même partiellement).
      let montantHT = parseFloat(pendingInvoiceData.montant_ht);
      let tva = parseFloat(pendingInvoiceData.tva);
      let montantTTC = parseFloat(pendingInvoiceData.total_amount || pendingInvoiceData.montant_ttc);

      if (!Number.isFinite(montantHT) || montantHT < 0) {
        montantHT = 0;
        showToastMessage('Analyse partielle : HT manquant → enregistré à 0 (à vérifier).', 'success');
      }

      // Calcul intelligent : si TVA manque mais TTC existe, calculer TVA
      if (isNaN(tva) && !isNaN(montantTTC)) {
        tva = montantTTC - montantHT;
        console.log('🧮 TVA calculée automatiquement:', tva);
      }

      // Calcul intelligent : si TTC manque mais TVA existe, calculer TTC
      if (isNaN(montantTTC) && !isNaN(tva)) {
        montantTTC = montantHT + tva;
        console.log('🧮 TTC calculé automatiquement:', montantTTC);
      }

      // ========== VALIDATION MATHÉMATIQUE STRICTE ==========
      // Vérifier que HT + TVA = TTC (tolérance 0.05€ pour arrondis)
      const calculatedTTC = montantHT + tva;
      const difference = Math.abs(calculatedTTC - montantTTC);
      
      if (difference > 0.05) {
        console.warn('⚠️ Montants incohérents (best effort) — on enregistre quand même', {
          montantHT,
          tva,
          montantTTC,
          calculated: calculatedTTC,
          difference
        });
        showToastMessage('Analyse partielle : incohérence HT/TVA/TTC — à vérifier.', 'success');
      }

      // Validation finale des valeurs
      if (!Number.isFinite(tva) || tva < 0) {
        tva = 0;
        showToastMessage('Analyse partielle : TVA manquante → enregistré à 0 (à vérifier).', 'success');
      }

      if (!Number.isFinite(montantTTC) || montantTTC < 0) {
        montantTTC = montantHT + tva;
        showToastMessage('Analyse partielle : TTC manquant → calculé (HT+TVA).', 'success');
      }

      // Validation taux de TVA (doit être entre 0% et 25%)
      const tauxTVA = montantHT > 0 ? (tva / montantHT) * 100 : 0;
      if (tauxTVA > 25) {
        console.warn('⚠️ Taux TVA anormal:', tauxTVA.toFixed(2) + '%');
        // On affiche un avertissement mais on ne bloque pas
        alert(`⚠️ ATTENTION : Taux de TVA anormal (${tauxTVA.toFixed(1)}%)\n\nLes taux standard en France sont 5,5%, 10% ou 20%.\n\nVérifiez les montants avant d'enregistrer.`);
        // On continue pour permettre à l'utilisateur de corriger
      }

      // Préparer les données pour l'insertion
      const pendingCat = pendingInvoiceData.categorie;
      const isOther = pendingCat === '📝 Autre' || pendingCat === 'Autre';
      const finalCategoryRaw = isOther ? (customCategory.trim() || 'Autre') : (pendingCat || 'Autre');
      const finalCategory = normalizeCategory(finalCategoryRaw) || 'Autre';

      // Structure exacte conforme à la table SQL
      // ✅ Période optionnelle: l'utilisateur peut laisser la date vide
      const dateFactureRaw = (pendingInvoiceData.date && String(pendingInvoiceData.date).trim()) || '';
      const dateFacture = dateFactureRaw ? dateFactureRaw : null;

      // ✅ IMPORTANT: insertion côté serveur (cohérence DB → UI → CSV)
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        showToastMessage('❌ Session expirée. Reconnectez-vous.', 'error');
        window.location.href = '/login?redirect=/dashboard';
        return;
      }

      const payload = {
        invoiceData: {
          id: pendingInvoiceData?.id || null,
          source: 'scan',
          entreprise: pendingInvoiceData.entreprise || 'Non spécifié',
          description: pendingInvoiceData.description || '',
          categorie: finalCategory || 'Non classé',
          date_facture: dateFacture,
          folder_id: pendingInvoiceData.folder_id || null,
          amount_ht: Number(montantHT),
          amount_tva: Number(tva),
          total_amount: Number(montantTTC),
          modified_manually: pendingManuallyEdited,
        },
      };

      console.log('📤 DONNÉES ENVOYÉES AU SERVEUR (/api/scans):', payload);

      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const saved = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToastMessage(saved?.message || saved?.error || '❌ Impossible d’enregistrer la facture', 'error');
        return;
      }

      console.log('✅ Facture enregistrée avec succès:', saved);

      // Fermer la modale
      setShowValidationModal(false);
      setPendingInvoiceData(null);
      setPendingInvoiceOriginal(null);
      setPendingManuallyEdited(false);
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
      console.log('✅ Données rafraîchies');
      
      // ✅ REDIRECTION VERS L'HISTORIQUE (BLOC 4 FINITIONS)
      // On enlève toute sélection de période pour éviter une "facture invisible" après scan
      setSelectedMonths([]);
      setCurrentView('historique');
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err: any) {
      console.error('❌ ERREUR SAUVEGARDE COMPLÈTE:', {
        message: err.message,
        stack: err.stack,
        error: err
      });
      showToastMessage(`❌ Erreur: ${err.message || 'Erreur lors de l\'enregistrement'}`, 'error');
    }
  };
  

  const startScanIntoFolder = (folderId: string) => {
    setPreselectFolderId(folderId);
    triggerFileInput();
  };

  const triggerFileInput = () => {
    // Menu de sélection : Appareil photo OU Téléverser fichier
    setShowUploadMenu(true);
  };

    return (
    <div className="min-h-screen bg-[var(--color-surface-2)] pb-24 font-sans text-slate-900">
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
        {/* DASHBOARD avec transition AnimatePresence */}
        <AnimatePresence mode="wait">
        {currentView === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="space-y-6"
          >
            {/* ✅ BREAKING VISUEL: Bento Grid Premium */}
            {loadingInvoices ? (
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-7 as-card p-8 animate-pulse">
                  <div className="h-4 w-32 bg-slate-200 rounded mb-6" />
                  <div className="h-12 w-60 bg-slate-200 rounded mb-6" />
                  <div className="grid grid-cols-3 gap-4">
                    <div className="h-20 bg-slate-100 rounded-2xl" />
                    <div className="h-20 bg-slate-100 rounded-2xl" />
                    <div className="h-20 bg-slate-100 rounded-2xl" />
                  </div>
                </div>
                <div className="col-span-12 lg:col-span-5 as-card p-8 animate-pulse">
                  <div className="h-4 w-40 bg-slate-200 rounded mb-6" />
                  <div className="h-24 bg-slate-100 rounded-2xl" />
                </div>
                <div className="col-span-12 lg:col-span-7 as-card p-8 animate-pulse">
                  <div className="h-4 w-44 bg-slate-200 rounded mb-6" />
                  <div className="h-56 bg-slate-100 rounded-2xl" />
                </div>
                <div className="col-span-12 lg:col-span-5 as-card p-8 animate-pulse">
                  <div className="h-4 w-32 bg-slate-200 rounded mb-6" />
                  <div className="space-y-3">
                    <div className="h-12 bg-slate-100 rounded-2xl" />
                    <div className="h-12 bg-slate-100 rounded-2xl" />
                    <div className="h-12 bg-slate-100 rounded-2xl" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-12 gap-6">
                {/* KPI HERO */}
                <div className="col-span-12 lg:col-span-7">
                  <BentoCard
                    title="Aperçu"
                    subtitle="Votre activité sur la période sélectionnée."
                    icon={<TrendingUp className="w-4 h-4" />}
                    right={
                      <StatusBadge tone="brand" size="md">
                        {selectedMonths.length === 0 ? 'Tous les mois' : `${selectedMonths.length} mois`}
                      </StatusBadge>
                    }
                    className="relative overflow-hidden"
                  >
                    <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[var(--primary)] opacity-15 blur-3xl" />
                    <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[var(--primary)] opacity-10 blur-3xl" />

                    <div className="flex items-end justify-between gap-6">
                      <div className="min-w-0">
                        <div className="text-xs font-black uppercase tracking-widest text-slate-500">Dépenses TTC</div>
                        <div className="mt-2 text-5xl sm:text-6xl font-black tracking-tight text-slate-900 tabular-nums">
                          {stats.totalTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </div>
                        <div className="mt-2 text-sm text-slate-600">
                          Total HT & TVA inclus ci-dessous.
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="rounded-2xl border border-slate-200 bg-white/70 p-5">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">HT</div>
                        <div className="mt-2 text-2xl font-black text-slate-900 tabular-nums">
                          {stats.totalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white/70 p-5">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">TVA récupérable</div>
                        <div className="mt-2 text-2xl font-black text-slate-900 tabular-nums">
                          {stats.tvaRecuperable.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white/70 p-5">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Documents</div>
                        <div className="mt-2 text-2xl font-black text-slate-900 tabular-nums">
                          {stats.nombreFactures}
                        </div>
                      </div>
                    </div>

                    <div className="mt-8">
                      <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                        <span>Ratio TVA / TTC</span>
                        <span className="text-[var(--primary)] tabular-nums">
                          {stats.totalTTC > 0 ? `${Math.round((stats.tvaRecuperable / stats.totalTTC) * 100)}%` : '0%'}
                        </span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-[var(--primary)] transition-all duration-700"
                          style={{ width: `${Math.min(stats.totalTTC > 0 ? (stats.tvaRecuperable / stats.totalTTC) * 100 : 0, 100)}%` }}
                        />
                      </div>
                    </div>
                  </BentoCard>
                </div>

                {/* PRO / UPSELL + ACTIONS */}
                <div className="col-span-12 lg:col-span-5 grid gap-6">
                  <BentoCard
                    title={isProUser ? 'Pro actif' : 'Passez Pro'}
                    subtitle={isProUser ? 'Vous êtes débloqué.' : 'Débloquez scan IA + exports.'}
                    icon={<Crown className="w-4 h-4" />}
                    right={isProUser ? <StatusBadge tone="success" size="md">Actif</StatusBadge> : <StatusBadge tone="brand" size="md">Pro</StatusBadge>}
                    className={isProUser ? '' : 'bg-gradient-to-br from-white to-[var(--color-brand-50)] border-2 border-[var(--color-brand-100)]'}
                  >
                    {isProUser ? (
                      <div className="flex flex-col gap-3">
                        <button
                          onClick={startCustomerPortal}
                          disabled={billingLoading || !billingCustomerId}
                          className="as-btn as-btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          Gérer via Stripe
                        </button>
                        <Link href="/pricing" className="as-btn as-btn-secondary w-full text-center">
                          Changer de plan
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <ul className="space-y-2 text-sm text-slate-700">
                          <li className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
                            Scan IA illimité
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
                            Exports comptables
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
                            Envoi comptable
                          </li>
                        </ul>
                        <Link href="/pricing" className="as-btn as-btn-primary w-full text-center">
                          Passer à Pro
                        </Link>
                      </div>
                    )}
                  </BentoCard>

                  <BentoCard
                    title="Nouvelle facture"
                    subtitle="Importez un PDF ou une photo. Aperçu + analyse IA."
                    icon={<ScanLine className="w-4 h-4" />}
                    right={analyzing ? <StatusBadge tone="processing" pulse>En cours</StatusBadge> : null}
                  >
                    <motion.button
                      onClick={() => {
                        if (isProUser === false) {
                          showToastMessage('🔒 Fonctionnalité Pro — Passez à Pro pour numériser', 'error');
                          window.location.href = '/pricing';
                          return;
                        }
                        triggerFileInput();
                      }}
                      disabled={analyzing || isProUser === false}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="as-btn as-btn-primary w-full py-4 text-base disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {analyzing ? loadingMessage : 'Numériser maintenant'}
                    </motion.button>

                    {/* Erreur / Résultat (compact, non dominant) */}
                    {error ? (
                      <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                        {error}
                      </div>
                    ) : null}
                    {result ? (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-black uppercase tracking-widest text-slate-500">Dernière analyse</div>
                        <div className="mt-2 font-black text-slate-900 truncate">{result.entreprise || '—'}</div>
                        <div className="mt-1 text-sm text-slate-600 tabular-nums">
                          TTC: {result.total_amount ? `${Number(result.total_amount).toFixed(2)} €` : '—'}
                        </div>
                      </div>
                    ) : null}
                  </BentoCard>
                </div>

                {/* CHART */}
                <div className="col-span-12 lg:col-span-7">
                  <BentoCard
                    title="Tendance"
                    subtitle="Dépenses TTC sur 7 jours."
                    icon={<TrendingUp className="w-4 h-4" />}
                    right={chartData.every((d) => d.montant === 0) ? <StatusBadge tone="neutral">Aucune dépense</StatusBadge> : null}
                  >
                    <div className="relative">
                      {chartData.every((d) => d.montant === 0) && (
                        <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/60 backdrop-blur-[1px] rounded-2xl">
                          <p className="text-sm text-slate-500">Aucune facture sur 7 jours</p>
                        </div>
                      )}
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={chartData}>
                          <defs>
                            <linearGradient id="asOrangeBarBento" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.95} />
                              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.45} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} />
                          <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#fff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '12px',
                              fontSize: '14px',
                            }}
                            formatter={(value: number | undefined) => {
                              if (value === undefined) return ['0.00 €', 'Montant TTC'];
                              return [`${value.toFixed(2)} €`, 'Montant TTC'];
                            }}
                          />
                          <Bar dataKey="montant" fill="url(#asOrangeBarBento)" radius={[10, 10, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </BentoCard>
                </div>

                {/* RECENT */}
                <div className="col-span-12 lg:col-span-5">
                  <BentoCard
                    title="Récents"
                    subtitle="Vos dernières factures scannées."
                    icon={<Receipt className="w-4 h-4" />}
                    right={<Link href="#" onClick={(e) => { e.preventDefault(); setCurrentView('historique'); }} className="text-sm font-black text-[var(--primary)]">Voir</Link>}
                  >
                    {invoices.length === 0 ? (
                      <EmptyState
                        title="Aucun document"
                        description="Glissez votre première facture pour démarrer."
                        icon={<Receipt className="w-8 h-8 text-slate-300" />}
                      />
                    ) : (
                      <div className="space-y-3">
                        {invoices.slice(0, 4).map((inv) => (
                          <div key={inv.id} className="rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50 transition">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-black text-slate-900 truncate">{inv.entreprise}</div>
                                <div className="text-xs font-bold text-slate-500">{formatDateLabel(inv.date_facture || inv.created_at)}</div>
                              </div>
                              <div className="text-right tabular-nums font-black text-slate-900">
                                {(inv.total_amount || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                              </div>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              {inv.categorie ? <StatusBadge tone="brand">{inv.categorie}</StatusBadge> : null}
                              {inv.modified_manually ? <StatusBadge tone="warning">Modifiée</StatusBadge> : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </BentoCard>
                </div>
              </div>
            )}

            {/* Erreur */}
            {error && (
              <div className="card-clean rounded-xl p-4 border-red-200 bg-red-50">
                <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

            {/* Résultat */}
            {result && (
              <div className="card-clean rounded-2xl p-6 slide-up">
                 <div className="flex items-start justify-between gap-3 mb-4">
                   <h3 className="text-lg font-semibold text-slate-900">✅ Facture analysée</h3>
                   {result?.amounts_verification === 'verified' ? (
                     <StatusBadge tone="success" size="md">Montants vérifiés</StatusBadge>
                   ) : result?.amounts_verification === 'to_verify' ? (
                     <StatusBadge tone="warning" size="md">À vérifier</StatusBadge>
                   ) : (
                     <StatusBadge tone="neutral" size="md">Incomplet</StatusBadge>
                   )}
                 </div>
                 {result?.amounts_reason ? (
                   <div className="mb-4 text-sm text-slate-600">
                     <span className="font-bold text-slate-700">Montants:</span> {result.amounts_reason}
                   </div>
                 ) : null}
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
                      {typeof result.amount_ht === 'number' ? `${result.amount_ht.toFixed(2)} €` : '—'}
                      </span>
                    </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-sm font-bold text-slate-600">Montant TTC</span>
                    <span className="text-sm font-black text-slate-900">
                      {typeof result.total_amount === 'number' ? `${result.total_amount.toFixed(2)} €` : '—'}
                      </span>
                    </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-sm font-bold text-slate-600">TVA</span>
                    <span className="text-sm font-black text-orange-500">
                      {typeof result.amount_tva === 'number'
                        ? `${result.amount_tva.toFixed(2)} €`
                        : '—'}
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
          </motion.div>
        )}

        {/* HISTORIQUE avec transition AnimatePresence */}
        {currentView === 'historique' && (
          <motion.div
            key="historique"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {/* ✅ CONTENU NORMAL */}
            <div className="fade-in">
              <div className="grid grid-cols-12 gap-6">
                {/* LISTE / HISTORIQUE */}
                <div className="col-span-12 lg:col-span-8">
                  <BentoCard
                    title="Historique"
                    subtitle="Vos documents, prêts à filtrer et exporter."
                    icon={<Clock className="w-4 h-4" />}
                    right={
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => exportToCSV()}
                          disabled={invoices.length === 0 || isProUser === false}
                          className="as-btn as-btn-secondary px-3 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
                          title="Exporter en CSV"
                        >
                          <Download className="w-4 h-4" />
                          CSV
                        </button>
                        <button
                          onClick={exportToExcel}
                          disabled={invoices.length === 0 || isProUser === false}
                          className="as-btn as-btn-primary px-3 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
                          title="Exporter en Excel"
                        >
                          <Download className="w-4 h-4" />
                          Excel
                        </button>
                        <button
                          onClick={generateGlobalPDF}
                          disabled={invoices.length === 0 || isProUser === false}
                          className="as-btn as-btn-secondary px-3 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
                          title="Générer PDF Global"
                        >
                          <FileDown className="w-4 h-4" />
                          PDF
                        </button>
                      </div>
                    }
                  >
                    {analyzing ? (
                      <div className="mb-5 rounded-2xl border border-[var(--color-brand-100)] bg-[var(--color-brand-50)] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-black text-slate-900">Analyse en cours…</div>
                            <div className="text-sm text-slate-600">{loadingMessage}</div>
                          </div>
                          <StatusBadge tone="processing" pulse size="md">En cours</StatusBadge>
                        </div>
                      </div>
                    ) : null}

            {loadingInvoices ? (
              <div className="space-y-3">
                <InvoiceCardSkeleton />
                <InvoiceCardSkeleton />
                <InvoiceCardSkeleton />
                <InvoiceCardSkeleton />
              </div>
            ) : filteredInvoices.length === 0 ? (
              <EmptyState
                title="Aucun résultat"
                description="Modifiez vos filtres ou votre recherche pour trouver ce que vous cherchez."
                icon={<X className="w-8 h-8 text-slate-300" />}
                illustration={
                  <svg viewBox="0 0 800 400" className="w-full h-full">
                    <defs>
                      <linearGradient id="asEmptyGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <circle cx="640" cy="120" r="120" fill="url(#asEmptyGrad)" />
                    <circle cx="140" cy="280" r="140" fill="url(#asEmptyGrad)" />
                    <path d="M260 120h280a18 18 0 0 1 18 18v190a18 18 0 0 1-18 18H260a18 18 0 0 1-18-18V138a18 18 0 0 1 18-18Z" fill="rgba(15,23,42,0.06)" />
                    <path d="M290 170h220M290 205h180M290 240h200" stroke="rgba(15,23,42,0.18)" strokeWidth="10" strokeLinecap="round" />
                  </svg>
                }
                action={
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setCategoryFilter('');
                      setSelectedMonths([]);
                    }}
                    className="as-btn as-btn-primary"
                  >
                    Réinitialiser les filtres
                  </button>
                }
              />
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
                    const mk = getMonthKey(inv.date_facture || undefined) || '__none__';
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
                        <div key={invoice.id} className="as-card as-card-hover p-6">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-black text-slate-900 text-lg tracking-tight">{invoice.entreprise}</h4>
                                {invoice.categorie && (
                                  <StatusBadge tone="brand">{invoice.categorie}</StatusBadge>
                                )}
                                {invoice.modified_manually === true && (
                                  <StatusBadge tone="warning">Modifiée</StatusBadge>
                                )}
                                {(!invoice.date_facture || getMonthKey(invoice.date_facture || undefined) === '') ? (
                                  <StatusBadge tone="neutral">Sans période</StatusBadge>
                                ) : null}
                                {invoice.archived === true ? (
                                  <StatusBadge tone="neutral">Archivé</StatusBadge>
                                ) : (
                                  <StatusBadge tone="success">Validé</StatusBadge>
                                )}
                    </div>
                              <div className="flex flex-col gap-1">
                                <p className="text-xs font-bold text-slate-500">
                                  Facture du : {formatDateLabel(invoice.date_facture || invoice.created_at)}
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">
                                  Transmise le : {formatDateTimeLabel(invoice.created_at)}
                </p>
              </div>
            </div>
                            
                            {/* Menu actions discret */}
                            <div className="relative">
                              <button
                                onClick={() => setOpenMenuId(openMenuId === invoice.id ? null : invoice.id)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Actions"
                              >
                                <MoreVertical className="w-5 h-5 text-slate-400" />
                              </button>
                              
                              {openMenuId === invoice.id && (
                                <>
                                  {/* Overlay pour fermer le menu en cliquant à l'extérieur */}
                                  <div 
                                    className="fixed inset-0 z-40" 
                                    onClick={() => setOpenMenuId(null)}
                                  ></div>
                                  
                                  {/* Menu déroulant */}
                                  <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50 min-w-[180px]">
                                    {/* Archiver */}
                                    <button
                                      onClick={() => {
                                        archiveInvoice(invoice.id);
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-3"
                                    >
                                      <Archive className="w-4 h-4 text-slate-500" />
                                      Archiver
                                    </button>
                                    
                                    {/* Séparateur */}
                                    <div className="h-px bg-slate-100 my-1"></div>
                                    
                                    {/* Export PDF */}
                                    <button
                                      onClick={() => {
                                        exportInvoicePDF(invoice);
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center gap-3"
                                    >
                                      <FileText className="w-4 h-4" />
                                      Exporter en PDF
                                    </button>
                                    
                                    {/* Export Excel */}
                                    <button
                                      onClick={() => {
                                        exportInvoiceExcel(invoice);
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-orange-50 hover:text-[var(--primary)] transition-colors flex items-center gap-3"
                                    >
                                      <Download className="w-4 h-4" />
                                      Exporter en Excel
                                    </button>
                                    
                                    {/* Export CSV */}
                                    <button
                                      onClick={() => {
                                        exportInvoiceCSV(invoice);
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-orange-50 hover:text-[var(--primary)] transition-colors flex items-center gap-3"
                                    >
                                      <FileText className="w-4 h-4" />
                                      Exporter en CSV
                                    </button>
                                    
                                    {/* Séparateur */}
                                    <div className="h-px bg-slate-100 my-1"></div>
                                    
                                    {/* Déplacer vers un dossier */}
                                    <button
                                      onClick={() => {
                                        setInvoiceToMove(invoice);
                                        setShowMoveToFolderModal(true);
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center gap-3"
                                    >
                                      <Folder className="w-4 h-4" />
                                      Déplacer vers un dossier
                                    </button>
                                    
                                    {/* Retirer du dossier (si la facture est dans un dossier) */}
                                    {invoice.folder_id && (
                                      <button
                                        onClick={() => {
                                          removeInvoiceFromFolder(invoice.id);
                                          setOpenMenuId(null);
                                        }}
                                        className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-600 transition-colors flex items-center gap-3"
                                      >
                                        <X className="w-4 h-4" />
                                        Retirer du dossier
                                      </button>
                                    )}
                                    
                                    {/* Séparateur */}
                                    <div className="h-px bg-slate-100 my-1"></div>
                                    
                                    {/* Supprimer */}
                                    <button
                                      onClick={() => {
                                        confirmDelete(invoice.id);
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Supprimer
                                    </button>
          </div>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100 mb-3">
                            <div className="flex-1 text-right">
                              <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block mb-0.5">Montant HT</span>
                              <span className="font-black text-slate-900 text-base tabular-nums">
                                {(invoice.amount_ht || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </span>
                    </div>

                            <div className="w-px h-8 bg-slate-200"></div>

                            <div className="flex-1 text-right">
                              <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block mb-0.5">Montant TTC</span>
                              <span className="font-black text-[var(--primary)] text-lg tabular-nums">
                                {(invoice.total_amount || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </span>
                    </div>

                            <div className="hidden md:block flex-1 border-l border-slate-200 pl-4 text-right">
                              <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block mb-0.5">TVA Récupérée</span>
                              <span className="font-black text-[var(--primary)] italic text-base tabular-nums">
                                {(invoice.amount_tva || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
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
                  </BentoCard>
                </div>

                {/* COLONNE DROITE: FILTRES + RÉSUMÉ */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                  <BentoCard title="Filtres" subtitle="Affinez en quelques clics." icon={<Receipt className="w-4 h-4" />}>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                          Recherche
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Fournisseur, description, catégorie…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="as-input pr-10"
                          />
                          {searchQuery ? (
                            <button
                              onClick={() => setSearchQuery('')}
                              className="absolute inset-y-0 right-0 px-3 text-slate-400 hover:text-slate-700 transition"
                              aria-label="Effacer la recherche"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                          Catégorie
                        </label>
                        <select
                          value={categoryFilter}
                          onChange={(e) => setCategoryFilter(e.target.value)}
                          className="as-input"
                        >
                          <option value="">Toutes</option>
                          <option value="Matériaux">🧱 Matériaux</option>
                          <option value="Carburant">⛽ Carburant</option>
                          <option value="Restaurant">🍴 Restaurant</option>
                          <option value="Outillage">🛠️ Outillage</option>
                          <option value="Fournitures">📦 Fournitures</option>
                          <option value="Location">🚚 Location</option>
                          <option value="Sous-traitance">🤝 Sous-traitance</option>
                          <option value="Autre">📝 Autre</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                          Tri
                        </label>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="as-input"
                        >
                          <option value="date_facture">📅 Date facture</option>
                          <option value="date_scan">🕒 Date transmission</option>
                          <option value="total_amount">💶 Montant TTC</option>
                          <option value="amount_ht">📄 Montant HT</option>
                          <option value="categorie">🏷️ Catégorie</option>
                        </select>
                      </div>

                      <div className="pt-2 flex flex-wrap gap-2">
                        {selectedMonths.length > 0 ? (
                          <StatusBadge tone="brand" size="md">{selectedMonths.length} mois sélectionné(s)</StatusBadge>
                        ) : (
                          <StatusBadge tone="neutral" size="md">Tous les mois</StatusBadge>
                        )}
                        {(searchQuery || categoryFilter || selectedMonths.length > 0) ? (
                          <button
                            onClick={() => {
                              setSearchQuery('');
                              setCategoryFilter('');
                              setSelectedMonths([]);
                            }}
                            className="as-btn as-btn-secondary px-4 py-2 text-xs"
                          >
                            Réinitialiser
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </BentoCard>

                  <BentoCard title="Résumé" subtitle="Sur la sélection actuelle." icon={<TrendingUp className="w-4 h-4" />}>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total TTC</div>
                      <div className="mt-2 text-4xl font-black text-slate-900 tabular-nums">
                        {historiqueSummary.totalTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </div>
                      <div className="mt-5 grid grid-cols-3 gap-3">
                        <div className="rounded-2xl bg-white border border-slate-200 p-4">
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Docs</div>
                          <div className="mt-1 text-xl font-black text-slate-900 tabular-nums">{historiqueSummary.count}</div>
                        </div>
                        <div className="rounded-2xl bg-white border border-slate-200 p-4">
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">HT</div>
                          <div className="mt-1 text-xl font-black text-slate-900 tabular-nums">
                            {historiqueSummary.totalHT.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
                          </div>
                        </div>
                        <div className="rounded-2xl bg-white border border-slate-200 p-4">
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">TVA</div>
                          <div className="mt-1 text-xl font-black text-[var(--primary)] tabular-nums">
                            {historiqueSummary.totalTVA.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
                          </div>
                        </div>
                      </div>
                    </div>
                  </BentoCard>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* DOSSIERS PERSONNALISÉS avec transition AnimatePresence */}
        {currentView === 'folders' && (
          <motion.div
            key="folders"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {/* ✅ CONTENU NORMAL */}
            <div className="fade-in">
              {!selectedFolder ? (
                <>
                  {/* ✅ Layout premium: bento header + dropzone visuel */}
                  <div className="grid grid-cols-12 gap-6 mb-8">
                    <div className="col-span-12 lg:col-span-8">
                      <BentoCard
                        title="Dossiers"
                        subtitle="Organisez vos factures par chantier, client ou période. Importez en 1 clic."
                        icon={<FolderKanban className="w-4 h-4" />}
                        right={
                          <button onClick={() => setShowFolderModal(true)} className="as-btn as-btn-primary px-4 py-2 text-xs">
                            <Plus className="w-4 h-4" />
                            Créer
                          </button>
                        }
                      >
                        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="min-w-0">
                              <div className="text-sm font-black text-slate-900">Glissez-déposez un PDF ou une photo</div>
                              <div className="mt-1 text-sm text-slate-600">
                                Ou importez depuis votre téléphone/ordinateur. (Aperçu + analyse IA)
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                if (isProUser === false) {
                                  showToastMessage('🔒 Import Pro — Passez à Pro pour numériser', 'error');
                                  window.location.href = '/pricing';
                                  return;
                                }
                                setPreselectFolderId(null);
                                triggerFileInput();
                              }}
                              className="as-btn as-btn-primary px-5 py-3 text-sm"
                            >
                              <ScanLine className="w-4 h-4" />
                              Importer
                            </button>
                          </div>
                        </div>
                      </BentoCard>
                    </div>
                    <div className="col-span-12 lg:col-span-4">
                      <BentoCard title="Raccourcis" subtitle="Accès rapide aux actions clés." icon={<Zap className="w-4 h-4" />}>
                        {isProUser === false ? (
                          <Link href="/pricing" className="as-btn as-btn-primary w-full text-center">
                            <Crown className="w-4 h-4" />
                            Passer à Pro
                          </Link>
                        ) : (
                          <StatusBadge tone="success" size="md">Pro actif</StatusBadge>
                        )}
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <button onClick={() => setShowFolderModal(true)} className="as-btn as-btn-secondary w-full px-4 py-3 text-xs">
                            <Plus className="w-4 h-4" />
                            Nouveau dossier
                          </button>
                          <button
                            onClick={() => {
                              if (isProUser === false) {
                                showToastMessage('🔒 Import Pro — Passez à Pro pour numériser', 'error');
                                window.location.href = '/pricing';
                                return;
                              }
                              setPreselectFolderId(null);
                              triggerFileInput();
                            }}
                            className="as-btn as-btn-secondary w-full px-4 py-3 text-xs"
                          >
                            <ScanLine className="w-4 h-4" />
                            Importer
                          </button>
                        </div>
                      </BentoCard>
                    </div>
                  </div>

                {/* Liste des dossiers */}
                {loadingFolders ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <FolderCardSkeleton />
                    <FolderCardSkeleton />
                    <FolderCardSkeleton />
                    <FolderCardSkeleton />
                    <FolderCardSkeleton />
                    <FolderCardSkeleton />
                  </div>
                ) : folders.length === 0 ? (
                  <EmptyState
                    title="Créez votre premier dossier"
                    description="Organisez vos factures par chantier ou client. Vous gardez le contrôle."
                    icon={<Folder className="w-8 h-8 text-slate-300" />}
                    illustration={
                      <svg viewBox="0 0 800 400" className="w-full h-full">
                        <defs>
                          <linearGradient id="asFolderGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.30" />
                            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <circle cx="640" cy="130" r="140" fill="url(#asFolderGrad)" />
                        <circle cx="140" cy="290" r="160" fill="url(#asFolderGrad)" />
                        <path d="M210 150h160l30 34h190a24 24 0 0 1 24 24v120a24 24 0 0 1-24 24H210a24 24 0 0 1-24-24V174a24 24 0 0 1 24-24Z" fill="rgba(15,23,42,0.06)" />
                        <path d="M250 235h300M250 270h230" stroke="rgba(15,23,42,0.18)" strokeWidth="10" strokeLinecap="round" />
                      </svg>
                    }
                    action={
                      <button onClick={() => setShowFolderModal(true)} className="as-btn as-btn-primary">
                        <Plus className="w-4 h-4" />
                        Créer un dossier
                      </button>
                    }
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {folders.map(folder => (
                      <div
                        key={folder.id}
                        className="as-card as-card-hover p-6 group relative"
                      >
                        <div onClick={() => setSelectedFolder(folder)} className="flex items-start gap-4 mb-5 cursor-pointer">
                          <div className="w-12 h-12 bg-[var(--color-brand-50)] rounded-2xl flex items-center justify-center border border-[var(--color-brand-100)]">
                            <Folder className="w-6 h-6 text-[var(--primary)]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-black text-slate-900 truncate group-hover:text-[var(--primary)] transition-colors">
                              {folder.name}
            </h3>
                            {folder.reference && (
                              <p className="text-sm text-slate-500 mt-1 truncate">
                                Réf: {folder.reference}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <StatusBadge tone="neutral" size="md">
                            {invoices.filter((inv) => inv.folder_id === folder.id && inv.archived !== true).length} docs
                          </StatusBadge>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFolder(folder);
                              }}
                              className="as-btn as-btn-secondary px-3 py-2 text-xs"
                            >
                              Voir
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isProUser === false) {
                                  showToastMessage('🔒 Import Pro — Passez à Pro pour numériser', 'error');
                                  window.location.href = '/pricing';
                                  return;
                                }
                                startScanIntoFolder(folder.id);
                              }}
                              className="as-btn as-btn-primary px-3 py-2 text-xs"
                            >
                              Importer
                            </button>
                          </div>
                        </div>
                        
                        {/* Menu actions discret */}
                        <div className="absolute top-4 right-4">
              <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === folder.id ? null : folder.id);
                            }}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Actions"
                          >
                            <MoreVertical className="w-5 h-5 text-slate-400" />
                          </button>
                          
                          {openMenuId === folder.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setOpenMenuId(null)}
                              ></div>
                              
                              <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50 min-w-[200px]">
                                {/* Archiver */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    archiveFolder(folder.id);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-3"
                                >
                                  <Archive className="w-4 h-4 text-slate-500" />
                                  Archiver
              </button>
                                
                                <div className="h-px bg-slate-100 my-1"></div>
                                
                                {/* Export PDF */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    exportFolderPDF(folder);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center gap-3"
                                >
                                  <FileText className="w-4 h-4" />
                                  Exporter en PDF
                                </button>
                                
                                {/* Export Excel */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    exportFolderExcel(folder);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-orange-50 hover:text-[var(--primary)] transition-colors flex items-center gap-3"
                                >
                                  <Download className="w-4 h-4" />
                                  Exporter en Excel
                                </button>
                                
                                {/* Export CSV */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    exportFolderCSV(folder);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-orange-50 hover:text-[var(--primary)] transition-colors flex items-center gap-3"
                                >
                                  <FileText className="w-4 h-4" />
                                  Exporter en CSV
                                </button>
                                
                                <div className="h-px bg-slate-100 my-1"></div>
                                
                                {/* Envoyer au comptable */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEmailContext({ type: 'folder', data: folder });
                                    setShowEmailModal(true);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center gap-3"
                                >
                                  <Mail className="w-4 h-4" />
                                  Envoyer au comptable
                                </button>
                                
                                <div className="h-px bg-slate-100 my-1"></div>
                                
                                {/* Supprimer */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteFolder(folder.id);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Supprimer
                                </button>
                              </div>
                            </>
            )}
          </div>
            </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Vue détaillée d'un dossier */}
                <button
                  onClick={() => setSelectedFolder(null)}
                  className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium mb-6 transition-colors"
                >
                  <X className="w-5 h-5" />
                  Retour aux dossiers
                </button>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <Folder className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-black text-slate-900">{selectedFolder.name}</h1>
                      {selectedFolder.reference && (
                        <p className="text-slate-500 mt-1">Réf: {selectedFolder.reference}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Liste des factures de ce dossier */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-orange-500" />
                    Factures du dossier
                  </h2>
                  
                  {(() => {
                    const folderInvoices = invoices.filter(inv => inv.folder_id === selectedFolder.id);
                    
                    console.log(`📂 Dossier "${selectedFolder.name}": ${folderInvoices.length} facture(s)`);
                    
                    if (folderInvoices.length === 0) {
                      return (
            <div className="text-center py-12">
                          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Receipt className="w-8 h-8 text-slate-400" />
                          </div>
                          <p className="text-slate-500 font-medium">Aucune facture dans ce dossier</p>
                          <p className="text-sm text-slate-400 mt-2">
                            Les factures que vous assignerez à ce dossier apparaîtront ici
                </p>
              </div>
                      );
                    }

                    // Calcul des totaux
                    const totalHT = folderInvoices.reduce((sum, inv) => sum + (inv.amount_ht || 0), 0);
                    const totalTVA = folderInvoices.reduce((sum, inv) => sum + (inv.amount_tva || 0), 0);
                    const totalTTC = folderInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

                    return (
                      <>
                        {/* Résumé financier */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total HT</p>
                            <p className="text-2xl font-black text-slate-900">
                              {totalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">TVA</p>
                            <p className="text-2xl font-black text-slate-900">
                              {totalTVA.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">Total TTC</p>
                            <p className="text-2xl font-black text-orange-600">
                              {totalTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                            </p>
                          </div>
              </div>

                        {/* Liste des factures */}
                        <div className="space-y-3">
                          <p className="text-sm font-bold text-slate-600 mb-3">
                            {folderInvoices.length} facture{folderInvoices.length > 1 ? 's' : ''}
                          </p>
                          {folderInvoices.map((invoice) => (
                            <div
                              key={invoice.id}
                              className="p-4 border border-slate-200 rounded-xl hover:border-orange-300 hover:bg-orange-50/30 transition-all"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="font-black text-slate-900">
                                      {invoice.entreprise || 'Fournisseur non spécifié'}
                        </span>
                                    {invoice.categorie && (
                                      <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full font-bold">
                                        {invoice.categorie}
                          </span>
                        )}
              </div>
                                  {invoice.description && (
                                    <p className="text-sm text-slate-600 mb-2">{invoice.description}</p>
                                  )}
                                  <div className="flex items-center gap-4 text-xs text-slate-500">
                                    <span>HT: {(invoice.amount_ht || 0).toFixed(2)} €</span>
                                    <span>TVA: {(invoice.amount_tva || 0).toFixed(2)} €</span>
                                    <span className="font-bold text-orange-600">
                                      TTC: {(invoice.total_amount || 0).toFixed(2)} €
                                    </span>
            </div>
                      </div>

                                {/* Menu actions */}
                                <div className="relative">
                      <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setInvoiceMenuOpen(invoiceMenuOpen === invoice.id ? null : invoice.id);
                                    }}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                  >
                                    <MoreVertical className="w-4 h-4 text-slate-400" />
                                  </button>

                                  {invoiceMenuOpen === invoice.id && (
                                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                                      <button
                                        onClick={() => {
                                          setInvoiceToMove(invoice);
                                          setShowMoveToFolderModal(true);
                                          setInvoiceMenuOpen(null);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-3 transition-colors"
                                      >
                                        <Folder className="w-4 h-4 text-orange-500" />
                                        <span className="font-medium text-slate-700">Déplacer vers un autre dossier</span>
                                      </button>
                                      
                                      <button
                                        onClick={async () => {
                                          // Retirer du dossier (via la fonction robuste avec RLS)
                                          await removeInvoiceFromFolder(invoice.id);
                                          setInvoiceMenuOpen(null);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-3 transition-colors"
                                      >
                                        <X className="w-4 h-4 text-slate-500" />
                                        <span className="font-medium text-slate-700">Retirer du dossier</span>
                                      </button>

                                      <div className="border-t border-slate-100 my-2"></div>

                                      <button
                                        onClick={() => {
                                          confirmDelete(invoice.id);
                                          setInvoiceMenuOpen(null);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-3 transition-colors"
                                      >
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                        <span className="font-medium text-red-600">Supprimer</span>
                      </button>
          </div>
                                  )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
                      </>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
          </motion.div>
        )}

        {/* PARAMÈTRES - Design Pro avec transition AnimatePresence */}
        {currentView === 'parametres' && (
          <motion.div
            key="parametres"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="max-w-6xl mx-auto"
          >
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Paramètres</h1>
              <p className="text-slate-500 mt-2">Gérez votre profil et vos préférences</p>
            </div>

            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 lg:col-span-7 space-y-6">

            {/* Avatar/Logo Section */}
            <BentoCard
              title="Profil"
              subtitle="Votre identité — utilisée dans vos exports."
              icon={<Camera className="w-4 h-4" />}
            >
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
            </BentoCard>

            {/* Informations Personnelles */}
            <BentoCard
              title="Informations"
              subtitle="Renseignez vos informations (stockées localement)."
              icon={<LayoutDashboard className="w-4 h-4" />}
            >
              
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
            </BentoCard>

              </div>
              <div className="col-span-12 lg:col-span-5 space-y-6">

            {/* Sécurité */}
            <BentoCard
              title="Sécurité"
              subtitle="Accès au compte et actions sensibles."
              icon={<Settings className="w-4 h-4" />}
            >
              
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
            </BentoCard>

            {/* Abonnement */}
            <BentoCard
              title="Mon Plan"
              subtitle="Abonnement & facturation via Stripe."
              icon={<Crown className="w-4 h-4" />}
              className="bg-gradient-to-br from-white to-[var(--color-brand-50)] border-2 border-[var(--color-brand-100)]"
            >
              <div className="rounded-3xl border border-slate-200 bg-white/60 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="text-xs font-black uppercase tracking-widest text-slate-500">Plan actuel</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {billingLoading ? (
                        <StatusBadge tone="neutral" size="md">Chargement…</StatusBadge>
                      ) : billingPlan ? (
                        <StatusBadge tone="brand" size="md">{billingPlan === 'yearly' ? 'Pro Annuel' : 'Pro Mensuel'}</StatusBadge>
                      ) : (
                        <StatusBadge tone="neutral" size="md">Free</StatusBadge>
                      )}

                      {billingLoading ? null : billingPlan ? (
                        <StatusBadge tone="success" size="md">Actif</StatusBadge>
                      ) : (
                        <StatusBadge tone="neutral" size="md">Limité</StatusBadge>
                      )}
                    </div>
                    <div className="mt-2 text-sm text-slate-600">
                      Gestion sécurisée via Stripe Customer Portal.
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={startCustomerPortal}
                      disabled={billingLoading || !billingCustomerId}
                      className="as-btn as-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Gérer via Stripe
                    </button>
                    <Link href="/pricing" className="as-btn as-btn-secondary text-center">
                      Voir les tarifs
                    </Link>
                  </div>
                </div>

                {!billingCustomerId && !billingLoading && (
                  <p className="mt-3 text-xs text-slate-500">
                    Aucun abonnement Stripe détecté sur ce compte.
                  </p>
                )}
              </div>
            </BentoCard>

            {/* Exports */}
            <BentoCard title="Exports" subtitle="Formats cabinet (Pro). Période optionnelle." icon={<FileText className="w-4 h-4" />}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={exportToCSV}
                  disabled={invoices.length === 0 || isProUser === false}
                  className="as-btn as-btn-secondary w-full py-4 disabled:opacity-60 disabled:cursor-not-allowed"
                  title="CSV comptable (séparateur ;)"
                >
                  <FileText className="w-5 h-5" />
                  Exporter CSV comptable
                </button>

                <button
                  onClick={exportToFEC}
                  disabled={invoices.length === 0 || isProUser === false}
                  className="as-btn as-btn-secondary w-full py-4 disabled:opacity-60 disabled:cursor-not-allowed"
                  title="FEC (format officiel France)"
                >
                  <FileDown className="w-5 h-5" />
                  Exporter FEC
                </button>

                <button
                  onClick={exportToPDFComptable}
                  disabled={invoices.length === 0 || isProUser === false}
                  className="as-btn as-btn-primary w-full py-4 disabled:opacity-60 disabled:cursor-not-allowed"
                  title="PDF A4 lisible cabinet"
                >
                  <Download className="w-5 h-5" />
                  Exporter PDF comptable
                </button>
              </div>

              <div className="mt-3 text-xs text-slate-500">
                Export = factures actuellement filtrées. <button onClick={() => setSelectedMonths([])} className="font-black text-[var(--primary)] hover:underline">Toutes les périodes</button>
              </div>
            </BentoCard>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
        </div>
      </main>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/png,image/jpeg"
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
                    input.setAttribute('accept', 'image/jpeg,image/png');
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
                    input.setAttribute('accept', 'application/pdf,image/png,image/jpeg');
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
                  setEmailContext(null);
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
                    {emailContext?.type === 'folder' ? (
                      <>
                        <li>• <strong>Dossier :</strong> {(emailContext.data as Folder)?.name}</li>
                        <li>• <strong>{invoices.filter(inv => inv.folder_id === (emailContext.data as Folder)?.id).length} factures</strong></li>
                        <li>• <strong>Pièces jointes :</strong> PDF + CSV comptable + FEC</li>
                      </>
                    ) : (
                      <>
                        <li>• <strong>{selectedMonths.length} mois</strong> sélectionné(s)</li>
                        <li>• <strong>{filteredInvoices.length} factures</strong> incluses</li>
                        <li>• <strong>Pièces jointes :</strong> PDF + CSV comptable + FEC</li>
                      </>
                    )}
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
                  setEmailContext(null);
                }}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-bold text-sm"
              >
                Annuler
              </button>
              <button
                onClick={sendToAccountant}
                disabled={!comptableEmail || sendingEmail}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:shadow-lg transition-all font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sendingEmail ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Envoyer maintenant
                  </>
                )}
              </button>
            </div>

            <p className="text-[10px] text-slate-400 text-center mt-4 font-medium">
              💡 Le comptable reçoit les pièces jointes directement. Aucun compte n’est requis côté comptable.
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
                  setPendingInvoiceOriginal(null);
                  setPendingManuallyEdited(false);
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
                  onChange={(e) => updatePendingInvoice({ date: e.target.value })}
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
                  onChange={(e) => updatePendingInvoice({ entreprise: e.target.value })}
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
                  onChange={(e) => {
                    const newHT = e.target.value;
                    const currentTTC = pendingInvoiceData.total_amount || pendingInvoiceData.montant_ttc;
                    
                    // Si TTC existe, calculer la TVA automatiquement
                    if (currentTTC) {
                      const calculatedTVA = parseFloat(currentTTC) - parseFloat(newHT || '0');
                      updatePendingInvoice({
                        montant_ht: newHT,
                        tva: calculatedTVA >= 0 ? calculatedTVA.toFixed(2) : '0'
                      });
                    } else {
                      updatePendingInvoice({ montant_ht: newHT });
                    }
                  }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none transition-all text-sm font-medium"
                  placeholder="0.00"
                />
              </div>

              {/* TVA - SAISIE MANUELLE OU CALCULÉE */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <Percent className="w-4 h-4 text-orange-500" />
                  Montant TVA (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={pendingInvoiceData.tva || ''}
                  onChange={(e) => {
                    const newTVA = e.target.value;
                    const currentHT = pendingInvoiceData.montant_ht;
                    
                    updatePendingInvoice({
                      tva: newTVA,
                      // Calculer le TTC automatiquement si HT existe
                      total_amount: currentHT ? (parseFloat(currentHT) + parseFloat(newTVA || '0')).toFixed(2) : undefined,
                      montant_ttc: currentHT ? (parseFloat(currentHT) + parseFloat(newTVA || '0')).toFixed(2) : undefined
                    });
                  }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none transition-all text-sm font-medium"
                  placeholder="0.00"
                />
              </div>

              {/* Montant TTC - SAISIE MANUELLE OU CALCULÉ */}
              <div>
                <label className="block text-sm font-bold text-orange-600 mb-2 flex items-center gap-2">
                  <Receipt className="w-4 h-4" />
                  Montant TTC (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={pendingInvoiceData.total_amount || pendingInvoiceData.montant_ttc || ''}
                  onChange={(e) => {
                    const newTTC = e.target.value;
                    const currentHT = pendingInvoiceData.montant_ht;
                    
                    // Si HT existe, calculer la TVA automatiquement
                    if (currentHT) {
                      const calculatedTVA = parseFloat(newTTC || '0') - parseFloat(currentHT);
                      updatePendingInvoice({
                        total_amount: newTTC,
                        montant_ttc: newTTC,
                        tva: calculatedTVA >= 0 ? calculatedTVA.toFixed(2) : '0'
                      });
                    } else {
                      updatePendingInvoice({
                        total_amount: newTTC,
                        montant_ttc: newTTC
                      });
                    }
                  }}
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
                    onChange={(e) => updatePendingInvoice({ categorie: e.target.value })}
                    className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none transition-all text-sm font-medium"
                  >
                    <option value="">-- Sélectionner une catégorie --</option>
                  <option value="Matériaux">🧱 Matériaux</option>
                  <option value="Carburant">⛽ Carburant</option>
                  <option value="Restaurant">🍴 Restaurant</option>
                  <option value="Outillage">🛠️ Outillage</option>
                  <option value="Fournitures">📦 Fournitures</option>
                  <option value="Location">🚚 Location</option>
                  <option value="Sous-traitance">🤝 Sous-traitance</option>
                  <option value="Autre">📝 Autre (Saisie libre...)</option>
                  </select>
                </div>

                {/* Champ dynamique si "Autre" est sélectionné */}
                {(pendingInvoiceData.categorie === '📝 Autre' || pendingInvoiceData.categorie === 'Autre') && (
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

              {/* Dossier de destination */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <Folder className="w-4 h-4 text-orange-500" />
                  Dossier de destination
                </label>
                <select
                  value={pendingInvoiceData.folder_id || ''}
                  onChange={(e) => setPendingInvoiceData({
                    ...pendingInvoiceData,
                    folder_id: e.target.value
                  })}
                  className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none transition-all text-sm font-medium"
                >
                  <option value="">-- Aucun dossier (par défaut) --</option>
                  {folders.map(folder => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name} {folder.reference ? `(${folder.reference})` : ''}
                    </option>
                  ))}
                </select>
                {folders.length === 0 && (
                  <p className="text-xs text-slate-500 mt-2">
                    Aucun dossier créé. Créez-en un depuis l'onglet "Dossiers".
                  </p>
                )}
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

      {/* Modale création de dossier */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full slide-up shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <Folder className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-black text-slate-900">Nouveau dossier</h3>
              </div>
              <button
                onClick={() => {
                  setShowFolderModal(false);
                  setFolderName('');
                  setFolderReference('');
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Nom du dossier *
                </label>
                <input
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="Ex: Chantier Dupont, Comptabilité 2024..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-sm"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Référence comptable
                </label>
                <input
                  type="text"
                  value={folderReference}
                  onChange={(e) => setFolderReference(e.target.value)}
                  placeholder="Ex: REF-2024-001, DUPONT-2024..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowFolderModal(false);
                  setFolderName('');
                  setFolderReference('');
                }}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
              >
                Annuler
              </button>
              <button
                onClick={createFolder}
                disabled={!folderName.trim()}
                className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Créer
              </button>
            </div>
          </div>
            </div>
          )}

      {/* Modale déplacement vers dossier */}
      {showMoveToFolderModal && invoiceToMove && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] px-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full slide-up shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Folder className="w-6 h-6 text-white" />
        </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Déplacer la facture</h3>
                  <p className="text-xs text-slate-500 font-medium">Choisissez un dossier de destination</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowMoveToFolderModal(false);
                  setInvoiceToMove(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Infos sur la facture */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <Receipt className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-bold text-slate-900 mb-1">{invoiceToMove.entreprise}</p>
                  <p className="text-slate-600 text-xs">
                    {new Date(invoiceToMove.date_facture).toLocaleDateString('fr-FR')} • {(invoiceToMove.total_amount || 0).toFixed(2)} €
                  </p>
                </div>
              </div>
            </div>

            {/* Liste des dossiers */}
            <div className="space-y-2 mb-6 max-h-[400px] overflow-y-auto">
              {folders.length === 0 ? (
                <div className="text-center py-8">
                  <Folder className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm font-medium mb-4">Aucun dossier créé</p>
        <button
                    onClick={() => {
                      setShowMoveToFolderModal(false);
                      setInvoiceToMove(null);
                      setShowFolderModal(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-bold text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Créer un dossier
        </button>
      </div>
              ) : (
                <>
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
                    Sélectionnez un dossier ({folders.length})
                  </p>
                  {folders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => moveInvoiceToFolder(invoiceToMove.id, folder.id)}
                      className="w-full flex items-center gap-4 p-4 border-2 border-slate-200 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-all group text-left"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                        <Folder className="w-5 h-5 text-white" />
    </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-slate-900 text-sm truncate group-hover:text-orange-600 transition-colors">
                          {folder.name}
                        </p>
                        {folder.reference && (
                          <p className="text-xs text-slate-500 truncate">
                            Réf: {folder.reference}
                          </p>
                        )}
                      </div>
                      <ChevronDown className="w-5 h-5 text-slate-400 -rotate-90 group-hover:text-orange-500 transition-colors" />
                    </button>
                  ))}
                </>
              )}
            </div>

            {/* Boutons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowMoveToFolderModal(false);
                  setInvoiceToMove(null);
                }}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-bold text-sm"
              >
                Annuler
              </button>
              {folders.length > 0 && (
                <button
                  onClick={() => {
                    setShowMoveToFolderModal(false);
                    setInvoiceToMove(null);
                    setShowFolderModal(true);
                  }}
                  className="px-4 py-3 border-2 border-orange-500 text-orange-600 rounded-xl hover:bg-orange-50 transition-colors font-bold text-sm flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Nouveau dossier
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* (Gestion manuelle des dossiers supprimée : Chronologie automatique par mois) */}

      {/* Toast de confirmation */}
      {showToast && (
      <div className={`toast ${toastType === 'error' ? 'bg-red-500' : 'bg-[var(--primary)]'}`}>
          {toastMessage}
        </div>
      )}

      {/* ✅ Décision produit: pas de prévisualisation document */}

            {/* Bottom Navigation */}
      <nav className="bottom-nav bg-white/95 backdrop-blur-md border-t border-slate-200 fixed bottom-0 left-0 right-0">
        <div className="max-w-7xl mx-auto px-2">
          <div className="flex items-center justify-around py-2">
        <motion.button
              onClick={() => setCurrentView('dashboard')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex flex-col items-center justify-center py-2 px-3 transition-all duration-200 rounded-xl ${
                currentView === 'dashboard' 
                  ? 'text-orange-500 scale-105' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <LayoutDashboard className={`w-6 h-6 mb-1 transition-transform ${currentView === 'dashboard' ? 'scale-110' : ''}`} strokeWidth={currentView === 'dashboard' ? 2.5 : 2} />
              <span className={`text-[10px] uppercase tracking-widest transition-all ${currentView === 'dashboard' ? 'font-black' : 'font-bold'}`}>Dashboard</span>
            </motion.button>

            {/* Scanner central plus gros avec animations */}
            <motion.button
              onClick={() => {
                if (isProUser === false) {
                  showToastMessage('🔒 Fonctionnalité Pro — Passez à Pro pour numériser', 'error');
                  window.location.href = '/pricing';
                  return;
                }
                triggerFileInput();
              }}
              disabled={analyzing || isProUser === false}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center justify-center -mt-10 bg-orange-500 text-white rounded-3xl p-5 shadow-2xl shadow-orange-300 hover:bg-orange-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border-4 border-white relative"
              title="Scanner une facture"
            >
              {analyzing ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="w-8 h-8 border-4 border-white border-opacity-20 border-t-white rounded-full"
                />
              ) : (
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                >
                  <Camera className="w-8 h-8" />
                </motion.div>
              )}
            </motion.button>

            <motion.button
              onClick={() => setCurrentView('historique')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex flex-col items-center justify-center py-2 px-3 transition-all duration-200 rounded-xl ${
                currentView === 'historique' 
                  ? 'text-orange-500 scale-105' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Clock className={`w-6 h-6 mb-1 transition-transform ${currentView === 'historique' ? 'scale-110' : ''}`} strokeWidth={currentView === 'historique' ? 2.5 : 2} />
              <span className={`text-[10px] uppercase tracking-widest transition-all ${currentView === 'historique' ? 'font-black' : 'font-bold'}`}>Historique</span>
            </motion.button>

            <motion.button
              onClick={() => setCurrentView('folders')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex flex-col items-center justify-center py-2 px-3 transition-all duration-200 rounded-xl ${
                currentView === 'folders' 
                  ? 'text-orange-500 scale-105' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Folder className={`w-6 h-6 mb-1 transition-transform ${currentView === 'folders' ? 'scale-110' : ''}`} strokeWidth={currentView === 'folders' ? 2.5 : 2} />
              <span className={`text-[10px] uppercase tracking-widest transition-all ${currentView === 'folders' ? 'font-black' : 'font-bold'}`}>Dossiers</span>
            </motion.button>

            {/* Onglet Dossiers supprimé : organisation automatique par mois */}
          </div>
    </div>
      </nav>
    </div>
  );
}
