'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import confetti from 'canvas-confetti'

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
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
      // Transformer l'image en base64
      const reader = new FileReader()
      
      reader.onloadend = async () => {
        try {
          const base64String = reader.result as string

          // Envoyer l'image à l'API
          const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              imageBase64: base64String,
            }),
          })

          const data = await response.json()

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

      reader.onerror = () => {
        setAnalysisError('Erreur lors de la lecture de l\'image')
        setAnalyzing(false)
      }

      reader.readAsDataURL(selectedImage)
    } catch (error) {
      console.error('Erreur:', error)
      setAnalysisError('Une erreur est survenue')
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

      // 🎉 SUCCÈS ! Déclencher les confettis immédiatement
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0']
      })

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
    <div className="min-h-screen bg-gray-100">
      {/* Menu en haut */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">ArtisScan</h1>
          <button
            onClick={handleSignOut}
            className="text-gray-700 hover:text-gray-900 font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-all duration-200"
          >
            Déconnexion
          </button>
        </div>
      </nav>

      {/* Contenu principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12 pb-24 md:pb-12">
        {/* Message de bienvenue */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Ravi de vous revoir !
          </h2>
        </div>

        {/* Message de succès animé */}
        {showSuccessMessage && (
          <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
            <div className="bg-emerald-500 text-white font-bold text-lg px-8 py-4 rounded-xl shadow-2xl flex items-center gap-3">
              <span className="text-3xl">🎉</span>
              <span>Facture ajoutée avec succès !</span>
              <span className="text-3xl">🎉</span>
            </div>
          </div>
        )}

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

          {/* Bouton Scanner une nouvelle facture - Caché sur mobile */}
          <button
            onClick={handleScanButtonClick}
            className="hidden md:block bg-orange-500 hover:bg-orange-600 text-white font-bold text-xl px-12 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 mb-8"
          >
            Scanner une nouvelle facture
          </button>

          {/* Prévisualisation de l'image */}
          {imagePreview && (
            <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg border border-gray-200 p-4 md:p-6">
              <div className="relative mb-4">
                <img
                  src={imagePreview}
                  alt="Prévisualisation"
                  className="w-full h-auto rounded-lg max-h-64 md:max-h-96 object-contain mx-auto"
                />
                <button
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg transition-all duration-200"
                  aria-label="Supprimer l'image"
                >
                  ×
                </button>
              </div>
              
              {/* Bouton Lancer l'analyse */}
              <div className="flex justify-center mb-4">
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold text-base md:text-lg px-6 md:px-8 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 w-full md:w-auto flex items-center justify-center gap-2"
                >
                  {analyzing ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Analyse en cours...</span>
                    </>
                  ) : (
                    "Lancer l'analyse"
                  )}
                </button>
              </div>

              {/* Message d'erreur en rouge */}
              {analysisError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-red-800 font-medium">
                    {analysisError}
                  </p>
                </div>
              )}

              {/* Résultats de l'analyse dans une jolie carte blanche */}
              {analysisResult && !analyzing && (
                <div className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-md">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Résultats de l'analyse
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-medium">Fournisseur:</span>
                      <span className="text-gray-900 font-semibold">
                        {analysisResult.nomFournisseur}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-medium">Date:</span>
                      <span className="text-gray-900 font-semibold">
                        {analysisResult.date}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium text-sm">Montant HT:</span>
                      <span className="text-gray-700 font-semibold">
                        {formatMontant(analysisResult.montantHT)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium text-sm">TVA:</span>
                      <span className="text-gray-700 font-semibold">
                        {formatMontant(analysisResult.montantTVA)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t-2 border-gray-300">
                      <span className="text-gray-900 font-bold text-xl">Total TTC:</span>
                      <span className="text-emerald-600 font-bold text-2xl">
                        {formatMontant(analysisResult.montantTTC)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section Statistiques */}
        {factures.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">
              Statistiques
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {/* Carte Total HT */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 md:p-6 shadow-sm">
                <p className="text-xs md:text-sm font-medium text-blue-700 mb-2">
                  Total HT
                </p>
                <p className="text-2xl md:text-3xl font-bold text-blue-900">
                  {formatMontant(calculateStatistics().totalHT)}
                </p>
              </div>

              {/* Carte Total TVA */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 md:p-6 shadow-sm">
                <p className="text-xs md:text-sm font-medium text-purple-700 mb-2">
                  Total TVA
                </p>
                <p className="text-2xl md:text-3xl font-bold text-purple-900">
                  {formatMontant(calculateStatistics().totalTVA)}
                </p>
              </div>

              {/* Carte Total TTC */}
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-lg p-4 md:p-6 shadow-md">
                <p className="text-xs md:text-sm font-bold text-emerald-700 mb-2">
                  Total TTC
                </p>
                <p className="text-3xl md:text-4xl font-bold text-emerald-600">
                  {formatMontant(calculateStatistics().totalTTC)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Section Mes dernières factures */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
            <h3 className="text-xl md:text-2xl font-bold text-gray-900">
              Mes dernières factures
            </h3>
            {factures.length > 0 && (
              <button
                onClick={exportToCSV}
                className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium text-sm md:text-base w-full md:w-auto"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Exporter pour mon comptable
              </button>
            )}
          </div>
          {loadingFactures ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Chargement...</p>
            </div>
          ) : factures.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                Aucune facture pour le moment
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {factures.map((facture) => (
                <div
                  key={facture.id}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4 md:p-6 hover:shadow-md transition-shadow w-full"
                >
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                    <div className="flex-1 w-full">
                      <h4 className="text-base md:text-lg font-semibold text-gray-900 mb-2">
                        {facture.fournisseur || 'Fournisseur inconnu'}
                      </h4>
                      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-600">
                        <span>
                          Date: {facture.date_facture 
                            ? new Date(facture.date_facture).toLocaleDateString('fr-FR')
                            : 'Date non disponible'}
                        </span>
                        {facture.created_at && (
                          <span>
                            Ajoutée le: {new Date(facture.created_at).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto">
                      <div className="text-left md:text-right">
                        <p className="text-xl md:text-2xl font-bold text-emerald-600">
                          {formatMontant(facture.montant_ttc || 0)}
                        </p>
                        <p className="text-xs md:text-sm text-gray-500">TTC</p>
                      </div>
                      <button
                        onClick={() => handleDeleteFacture(facture.id)}
                        className="bg-red-500 hover:bg-red-600 text-white font-medium px-3 md:px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 text-sm md:text-base whitespace-nowrap"
                        aria-label="Supprimer la facture"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Bouton Scanner sticky en bas pour mobile */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-gray-200 shadow-lg p-4 z-50">
        <button
          onClick={handleScanButtonClick}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg py-4 rounded-xl shadow-lg transition-all duration-200"
        >
          Scanner une nouvelle facture
        </button>
      </div>
    </div>
  )
}