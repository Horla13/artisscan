import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-black font-sans">
      {/* Barre de navigation */}
      <nav className="w-full border-b border-gray-200 relative z-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">ArtisScan</h1>
          <Link 
            href="/login"
            className="text-gray-700 hover:text-black font-medium px-4 py-2 transition-colors duration-200 relative z-50 cursor-pointer inline-block"
          >
            Connexion
          </Link>
        </div>
      </nav>

      {/* Section Hero - Contenu principal centré */}
      <section className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 max-w-5xl leading-tight">
          Divisez votre temps de paperasse par 10
        </h2>
        
        <p className="text-xl md:text-2xl text-gray-700 mb-12 max-w-3xl leading-relaxed">
          Prenez vos factures en photo, l&apos;IA s&apos;occupe du reste. Simple. Rapide. Pro.
        </p>

        <Link 
          href="/login"
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-lg px-10 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 relative z-50 cursor-pointer inline-block"
        >
          Commencer gratuitement
        </Link>
      </section>

      {/* Section Comment ça marche */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 py-20">
        <h3 className="text-4xl font-bold text-center mb-16">Comment ça marche ?</h3>
        
        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          {/* Étape 1 */}
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-orange-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-6">
              1
            </div>
            <h4 className="text-2xl font-semibold mb-4">Photographiez</h4>
            <p className="text-gray-600 leading-relaxed">
              Prenez simplement une photo de votre facture avec votre smartphone.
            </p>
          </div>

          {/* Étape 2 */}
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-orange-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-6">
              2
            </div>
            <h4 className="text-2xl font-semibold mb-4">Laissez l&apos;IA analyser</h4>
            <p className="text-gray-600 leading-relaxed">
              Notre intelligence artificielle extrait automatiquement toutes les informations importantes.
            </p>
          </div>

          {/* Étape 3 */}
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-orange-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-6">
              3
            </div>
            <h4 className="text-2xl font-semibold mb-4">Exportez au comptable</h4>
            <p className="text-gray-600 leading-relaxed">
              Générez et envoyez vos documents au format requis par votre comptable en un clic.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

