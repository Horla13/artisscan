'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import confetti from 'canvas-confetti'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'

interface AnalysisResult {
  nomFournisseur: string
  date: string
  montantHT: number
  montantTVA: number
  montantTTC: number
}

interface Facture {
  id: string
  fournisseur: string
  montant_ttc: number
  montant_ht?: number
  montant_tva?: number
  date_facture: string
  user_id: string
  created_at?: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [factures, setFactures] = useState<Facture[]>([])
  const [loadingFactures, setLoadingFactures] = useState(true)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      setUser(user)
      setLoading(false)
    }

    checkUser()
  }, [router])

  // Charger les factures quand l'utilisateur est disponible
  useEffect(() => {
    if (user?.id && !loading) {
      loadFactures()
    }
  }, [user?.id, loading])

  const loadFactures = async () => {
    try {
      setLoadingFactures(true)
      
      // Récupérer l'utilisateur actuel
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      if (!currentUser?.id) {
        setFactures([])
        setLoadingFactures(false)
        return
      }

      const { data, error } = await supabase
        .from('factures')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erreur lors du chargement des factures:', error)
        setFactures([])
        return
      }

      setFactures(data || [])
    } catch (error) {
      console.error('Erreur:', error)
      setFactures([])
    } finally {
      setLoadingFactures(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleScanButtonClick = () => {
    fileInputRef.current?.click()
  }

  // Fonction pour compresser l'image avant l'envoi
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      
      reader.onload = (event) => {
        const img = new window.Image()
        img.src = event.target?.result as string
        
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          if (!ctx) {
            reject(new Error('Impossible de créer le contexte canvas'))
            return
          }
          
          // Calculer les nouvelles dimensions (max 1200px)
          let width = img.width
          let height = img.height
          const maxDimension = 1200
          
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height * maxDimension) / width
              width = maxDimension
            } else {
              width = (width * maxDimension) / height
              height = maxDimension
            }
          }
          
          canvas.width = width
          canvas.height = height
          
          // Dessiner l'image redimensionnée
          ctx.drawImage(img, 0, 0, width, height)
          
          // Convertir en base64 avec qualité 0.7
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7)
          resolve(compressedBase64)
        }
        
        img.onerror = () => {
          reject(new Error('Erreur lors du chargement de l\'image'))
        }
      }
      
      reader.onerror = () => {
        reject(new Error('Erreur lors de la lecture du fichier'))
      }
    })
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Vérifier la taille du fichier (max 10 Mo)
      const maxSizeInMB = 10
      const maxSizeInBytes = maxSizeInMB * 1024 * 1024
      
      if (file.size > maxSizeInBytes) {
        setAnalysisError(`Image trop lourde (${(file.size / 1024 / 1024).toFixed(1)} Mo), essayez de reculer un peu`)
        return
      }
      
      setSelectedImage(file)
      // Créer une URL de prévisualisation
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      // Réinitialiser les résultats précédents
      setAnalysisResult(null)
      setAnalysisError(null)
    }
  }

  const handleAnalyze = async () => {
    if (!selectedImage) {
      return
    }

    setAnalyzing(true)
    setAnalysisError(null)
    setAnalysisResult(null)

    try {
      // Compresser l'image avant l'envoi
      const compressedBase64 = await compressImage(selectedImage)
      
      // Vérifier la taille de l'image compressée (max ~4 Mo en base64)
      const base64Size = compressedBase64.length * 0.75 / 1024 / 1024 // Conversion en Mo
      if (base64Size > 4) {
        setAnalysisError('Image trop lourde, essayez de reculer un peu')
        setAnalyzing(false)
        return
      }

      // Envoyer l'image à l'API
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: compressedBase64,
        }),
      })

      // Lire la réponse en tant que texte brut
      const responseText = await response.text()

      // Nettoyer la réponse pour extraire le JSON
      let data
      try {
        // Chercher le premier { et le dernier }
        const firstBrace = responseText.indexOf('{')
        const lastBrace = responseText.lastIndexOf('}')
        
        if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
          const jsonString = responseText.substring(firstBrace, lastBrace + 1)
          data = JSON.parse(jsonString)
        } else {
          // Si pas de JSON trouvé, essayer de parser directement
          data = JSON.parse(responseText)
        }
      } catch (parseError) {
        console.error('Erreur de parsing JSON:', parseError)
        console.error('Réponse brute:', responseText)
        throw new Error('La réponse de l\'API n\'est pas au bon format')
      }

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'analyse')
      }

      // Afficher le résultat
      setAnalysisResult(data)

      // Sauvegarder dans Supabase
      await saveFacture(data)
    } catch (error) {
      console.error('Erreur lors de l\'analyse:', error)
      setAnalysisError(
        error instanceof Error 
          ? error.message 
          : 'Une erreur est survenue lors de l\'analyse'
      )
    } finally {
      setAnalyzing(false)
    }
  }

  const saveFacture = async (result: AnalysisResult) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.error('Utilisateur non connecté')
        setAnalysisError('Utilisateur non connecté')
        return
      }

      const { error } = await supabase
        .from('factures')
        .insert({
          user_id: user.id,
          fournisseur: result.nomFournisseur,
          montant_ttc: result.montantTTC,
          montant_ht: result.montantHT,
          montant_tva: result.montantTVA,
          date_facture: result.date,
        })

      if (error) {
        console.error('Erreur lors de la sauvegarde:', error)
        setAnalysisError(`Erreur lors de la sauvegarde: ${error.message}`)
        return
      }

      // 🎉 SUCCÈS ! Déclencher les confettis et le retour haptique
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0']
      })

      // Retour haptique sur mobile
      triggerHaptic()

      // Afficher le message de succès
      setShowSuccessMessage(true)
      setTimeout(() => setShowSuccessMessage(false), 4000)

      // Recharger la liste des factures
      await loadFactures()
      
      // Réinitialiser l'image et les résultats après un délai
      setTimeout(() => {
        handleRemoveImage()
      }, 1500)
    } catch (error) {
      console.error('Erreur:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      setAnalysisError(`Erreur lors de la sauvegarde de la facture: ${errorMessage}`)
    }
  }

  const handleRemoveImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    setAnalysisResult(null)
    setAnalysisError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDeleteFacture = async (factureId: string) => {
    try {
      const { error } = await supabase
        .from('factures')
        .delete()
        .eq('id', factureId)

      if (error) {
        console.error('Erreur lors de la suppression:', error)
        alert(`Erreur lors de la suppression: ${error.message}`)
        return
      }

      // Mettre à jour la liste instantanément en retirant la facture supprimée
      setFactures(prevFactures => prevFactures.filter(f => f.id !== factureId))
    } catch (error) {
      console.error('Erreur:', error)
      alert('Une erreur est survenue lors de la suppression')
    }
  }

  const formatMontant = (montant: number | string): string => {
    let num: number
    
    if (typeof montant === 'string') {
      // Essayer de convertir en nombre
      const montantNettoye = montant.trim().replace(/[^\d.,]/g, '').replace(',', '.')
      num = parseFloat(montantNettoye)
      if (isNaN(num)) {
        return montant // Retourner tel quel si la conversion échoue
      }
    } else {
      num = montant
    }
    
    // Utiliser Intl.NumberFormat pour le format français
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(num)
  }

  const calculateStatistics = () => {
    const totalHT = factures.reduce((sum, facture) => {
      return sum + (facture.montant_ht || 0)
    }, 0)

    const totalTVA = factures.reduce((sum, facture) => {
      return sum + (facture.montant_tva || 0)
    }, 0)

    const totalTTC = factures.reduce((sum, facture) => {
      return sum + (facture.montant_ttc || 0)
    }, 0)

    return { totalHT, totalTVA, totalTTC }
  }

  const getLastSixMonthsData = (): Array<{ name: string; monthKey: string; montant: number }> => {
    const months: Array<{ name: string; monthKey: string; montant: number }> = []
    const now = new Date()
    
    // Générer les 6 derniers mois
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthName = date.toLocaleDateString('fr-FR', { month: 'short' })
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      months.push({
        name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        monthKey,
        montant: 0
      })
    }
    
    // Calculer les montants par mois
    factures.forEach(facture => {
      if (facture.date_facture) {
        const factureDate = new Date(facture.date_facture)
        const factureKey = `${factureDate.getFullYear()}-${String(factureDate.getMonth() + 1).padStart(2, '0')}`
        
        const monthData = months.find(m => m.monthKey === factureKey)
        if (monthData) {
          monthData.montant += facture.montant_ttc || 0
        }
      }
    })
    
    return months
  }

  // Statistiques avancées pour le mois en cours
  const getCurrentMonthStats = () => {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    
    const currentMonthFactures = factures.filter(facture => {
      if (!facture.date_facture) return false
      const factureDate = new Date(facture.date_facture)
      const factureMonth = `${factureDate.getFullYear()}-${String(factureDate.getMonth() + 1).padStart(2, '0')}`
      return factureMonth === currentMonth
    })
    
    const depensesDuMois = currentMonthFactures.reduce((sum, f) => sum + (f.montant_ttc || 0), 0)
    const nombreFactures = factures.length
    const tvaRecuperable = currentMonthFactures.reduce((sum, f) => sum + (f.montant_tva || 0), 0)
    
    return { depensesDuMois, nombreFactures, tvaRecuperable }
  }

  // Retour haptique pour mobile
  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([50, 30, 50]) // Pattern de vibration
    }
  }

  const exportToCSV = () => {
    if (factures.length === 0) {
      alert('Aucune facture à exporter')
      return
    }

    // En-têtes du CSV
    const headers = ['Date', 'Fournisseur', 'HT', 'TVA', 'TTC']
    
    // Lignes de données
    const rows = factures.map(facture => {
      const date = facture.date_facture 
        ? new Date(facture.date_facture).toLocaleDateString('fr-FR')
        : 'Date non disponible'
      const fournisseur = facture.fournisseur || 'Fournisseur inconnu'
      const ht = (facture.montant_ht || 0).toFixed(2).replace('.', ',')
      const tva = (facture.montant_tva || 0).toFixed(2).replace('.', ',')
      const ttc = (facture.montant_ttc || 0).toFixed(2).replace('.', ',')
      
      return [date, fournisseur, ht, tva, ttc]
    })

    // Créer le contenu CSV
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n')

    // Ajouter le BOM pour Excel (UTF-8)
    const BOM = '\uFEFF'
    const csvWithBOM = BOM + csvContent

    // Créer un blob et télécharger
    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `factures_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-600">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header Glassmorphism */}
      <nav className="glass sticky top-0 z-40 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-4 flex items-center justify-between">
          {/* Logo */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              ArtisScan
            </div>
          </motion.div>
          
          {/* Bouton déconnexion glassmorphism */}
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={handleSignOut}
            className="glass-white text-slate-700 hover:text-slate-900 font-medium px-5 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Déconnexion
          </motion.button>
        </div>
      </nav>

      {/* Contenu principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12 pb-32 md:pb-12">
        {/* Message de bienvenue glassmorphism */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 glass-emerald rounded-full text-sm font-medium mb-4 text-emerald-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            Dashboard Premium
          </div>
          <h2 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-white via-emerald-200 to-emerald-400 bg-clip-text text-transparent mb-3">
            Ravi de vous revoir !
          </h2>
          <p className="text-slate-300 text-lg">Gérez vos factures comme un pro</p>
        </motion.div>

        {/* 3 Cartes de Statistiques Premium */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
        >
          {/* Dépenses du mois */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            className="glass-white rounded-3xl p-8 border border-white/20 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                Ce mois
              </span>
            </div>
            <h3 className="text-sm font-medium text-slate-600 mb-2">Dépenses du mois</h3>
            <p className="text-4xl font-bold text-slate-900">
              {formatMontant(getCurrentMonthStats().depensesDuMois)}
            </p>
          </motion.div>

          {/* Nombre de factures */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            transition={{ delay: 0.05 }}
            className="glass-white rounded-3xl p-8 border border-white/20 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                Total
              </span>
            </div>
            <h3 className="text-sm font-medium text-slate-600 mb-2">Nombre de factures</h3>
            <p className="text-4xl font-bold text-slate-900">
              {getCurrentMonthStats().nombreFactures}
            </p>
          </motion.div>

          {/* TVA récupérable */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            transition={{ delay: 0.1 }}
            className="glass-white rounded-3xl p-8 border border-white/20 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                Récupérable
              </span>
            </div>
            <h3 className="text-sm font-medium text-slate-600 mb-2">TVA récupérable</h3>
            <p className="text-4xl font-bold text-slate-900">
              {formatMontant(getCurrentMonthStats().tvaRecuperable)}
            </p>
          </motion.div>
        </motion.div>

        {/* Message de succès glassmorphism */}
        <AnimatePresence>
          {showSuccessMessage && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.3 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.5 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50"
            >
              <div className="glass-emerald text-white font-bold text-lg px-8 py-5 rounded-3xl shadow-2xl flex items-center gap-3 border-2 border-emerald-400/30 pulse-glow">
                <span className="text-3xl">✨</span>
                <span>Facture ajoutée avec succès !</span>
                <span className="text-3xl">✨</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Zone d'upload d'image */}
        <div className="flex flex-col items-center mb-16">
          {/* Input file caché */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />

          {/* Bouton Scanner modernisé - Caché sur mobile */}
          <button
            onClick={handleScanButtonClick}
            className="hidden md:flex items-center gap-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-xl px-12 py-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 mb-8 group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Scanner une nouvelle facture
          </button>

          {/* Prévisualisation de l'image ultra moderne */}
          {imagePreview && (
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 md:p-8 backdrop-blur-xl">
              <div className="relative mb-6">
                <div className="relative overflow-hidden rounded-2xl bg-gray-50 p-2">
                  <img
                    src={imagePreview}
                    alt="Prévisualisation"
                    className="w-full h-auto rounded-xl max-h-64 md:max-h-96 object-contain mx-auto shadow-md"
                  />
                </div>
                <button
                  onClick={handleRemoveImage}
                  className="absolute -top-3 -right-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-xl transition-all duration-200 transform hover:scale-110 hover:rotate-90 font-bold text-xl"
                  aria-label="Supprimer l'image"
                >
                  ×
                </button>
              </div>
              
              {/* Bouton Lancer l'analyse ultra moderne */}
              <div className="flex justify-center mb-6">
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold text-base md:text-lg px-8 md:px-10 py-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 w-full md:w-auto flex items-center justify-center gap-3 group"
                >
                  {analyzing ? (
                    <>
                      <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Analyse en cours...</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Lancer l'analyse
                    </>
                  )}
                </button>
              </div>

              {/* Message d'erreur moderne */}
              {analysisError && (
                <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl p-5 mb-6 shadow-lg">
                  <div className="flex items-start gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-red-800 font-medium leading-relaxed">
                      {analysisError}
                    </p>
                  </div>
                </div>
              )}

              {/* Résultats de l'analyse ultra modernes */}
              {analysisResult && !analyzing && (
                <div className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-2xl p-8 shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-green-100 rounded-xl">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      Résultats de l'analyse
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-white rounded-xl shadow-sm">
                      <span className="text-gray-600 font-medium flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        Fournisseur
                      </span>
                      <span className="text-gray-900 font-bold">
                        {analysisResult.nomFournisseur}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-white rounded-xl shadow-sm">
                      <span className="text-gray-600 font-medium flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Date
                      </span>
                      <span className="text-gray-900 font-bold">
                        {analysisResult.date}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-blue-50 rounded-xl">
                      <span className="text-blue-700 font-medium text-sm">Montant HT</span>
                      <span className="text-blue-900 font-bold">
                        {formatMontant(analysisResult.montantHT)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-purple-50 rounded-xl">
                      <span className="text-purple-700 font-medium text-sm">TVA</span>
                      <span className="text-purple-900 font-bold">
                        {formatMontant(analysisResult.montantTVA)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-6 bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl shadow-lg mt-4">
                      <span className="text-white font-bold text-xl flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Total TTC
                      </span>
                      <span className="text-white font-bold text-3xl drop-shadow-lg">
                        {formatMontant(analysisResult.montantTTC)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Graphique Premium Glassmorphism */}
        {factures.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="glass-white rounded-3xl shadow-2xl border border-white/20 p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl md:text-3xl font-bold text-slate-900">
                      Dépenses Mensuelles
                    </h3>
                    <p className="text-sm text-slate-500">Évolution des 6 derniers mois</p>
                  </div>
                </div>
                
                {/* Bouton Générer Rapport PDF */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="glass-emerald px-6 py-3 rounded-2xl font-bold text-white flex items-center gap-2 shadow-lg hover:shadow-emerald-500/50 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Générer Rapport PDF
                </motion.button>
              </div>
              
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getLastSixMonthsData()}>
                    <defs>
                      <linearGradient id="colorEmerald" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.9}/>
                        <stop offset="100%" stopColor="#059669" stopOpacity={0.8}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#64748b"
                      style={{ fontSize: '14px', fontWeight: '600' }}
                    />
                    <YAxis 
                      stroke="#64748b"
                      style={{ fontSize: '14px', fontWeight: '600' }}
                      tickFormatter={(value) => `${value}€`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '2px solid #10b981',
                        borderRadius: '20px',
                        padding: '16px',
                        boxShadow: '0 20px 60px rgba(16, 185, 129, 0.3)',
                        fontWeight: 'bold',
                        backdropFilter: 'blur(10px)'
                      }}
                      formatter={(value: number | undefined) => [`${(value || 0).toFixed(2)}€`, 'Montant']}
                      cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
                    />
                    <Bar dataKey="montant" fill="url(#colorEmerald)" radius={[16, 16, 0, 0]}>
                      {getLastSixMonthsData().map((entry, index) => (
                        <Cell key={`cell-${index}`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>

        )}

        {/* Section Factures Glassmorphism */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-white rounded-3xl shadow-2xl border border-white/20 p-6 md:p-8"
        >
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-slate-400 to-slate-600 rounded-2xl shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl md:text-3xl font-bold text-slate-900">
                  Mes Factures
                </h3>
                <p className="text-sm text-slate-500">Historique complet</p>
              </div>
            </div>
            {factures.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={exportToCSV}
                className="glass flex items-center justify-center gap-3 px-6 py-3 border-2 border-white/20 rounded-2xl text-white font-bold transition-all shadow-lg hover:shadow-xl text-sm md:text-base w-full md:w-auto"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Exporter CSV
              </motion.button>
            )}
          </div>
          {loadingFactures ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="inline-flex items-center gap-3 px-6 py-4 glass-white rounded-2xl">
                <svg className="animate-spin h-6 w-6 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-slate-700 text-lg font-medium">Chargement...</p>
              </div>
            </motion.div>
          ) : factures.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <div className="inline-block p-4 glass rounded-2xl mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-slate-200 text-xl font-medium mb-2">
                Aucune facture pour le moment
              </p>
              <p className="text-slate-400">Commencez par scanner votre première facture !</p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {factures.map((facture, index) => (
                <motion.div
                  key={facture.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02, x: 10 }}
                  className="glass border-2 border-white/10 rounded-2xl p-5 md:p-6 hover:border-emerald-400/50 transition-all duration-300 w-full"
                >
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                    <div className="flex-1 w-full">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-emerald-500/20 rounded-lg backdrop-blur-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <h4 className="text-lg md:text-xl font-bold text-white">
                          {facture.fournisseur || 'Fournisseur inconnu'}
                        </h4>
                      </div>
                      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-xs md:text-sm">
                        <span className="flex items-center gap-1.5 glass-white px-3 py-1.5 rounded-lg font-medium text-slate-700">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {facture.date_facture 
                            ? new Date(facture.date_facture).toLocaleDateString('fr-FR')
                            : 'Date non disponible'}
                        </span>
                        {facture.created_at && (
                          <span className="flex items-center gap-1.5 text-slate-300">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Ajouté le {new Date(facture.created_at).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto">
                      <div className="text-left md:text-right glass-emerald px-4 py-3 rounded-xl border border-emerald-400/30">
                        <p className="text-2xl md:text-3xl font-bold text-emerald-300">
                          {formatMontant(facture.montant_ttc || 0)}
                        </p>
                        <p className="text-xs md:text-sm text-emerald-200 font-medium">TTC</p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDeleteFacture(facture.id)}
                        className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold px-4 md:px-5 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all text-sm md:text-base whitespace-nowrap flex items-center gap-2"
                        aria-label="Supprimer la facture"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span className="hidden md:inline">Supprimer</span>
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>

      {/* Bouton Scanner Glassmorphism Premium */}
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring" }}
        className="fixed bottom-0 left-0 right-0 md:hidden glass border-t-2 border-white/10 backdrop-blur-2xl shadow-2xl p-4 z-50"
      >
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleScanButtonClick}
          className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold text-lg py-5 rounded-3xl shadow-2xl hover:shadow-emerald-500/50 transition-all duration-300 flex items-center justify-center gap-3 pulse-glow"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="drop-shadow-lg">Scanner Facture</span>
          <div className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </div>
        </motion.button>
      </motion.div>
    </div>
  )
}