export default function Header() {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-800 shadow-lg sticky top-0 z-40">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <a href="/" className="flex items-center space-x-3">
                <span className="text-3xl">🏥</span>
                <div>
                  <div className="text-xl font-bold text-white">
                    Medic Hub
                  </div>
                  <div className="text-xs text-blue-200">
                    FN u sv. Anny
                  </div>
                </div>
              </a>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-6">
            <a 
              href="/" 
              className="text-white hover:text-blue-200 transition-colors font-medium flex items-center space-x-2"
            >
              <span>📊</span>
              <span>Dashboard</span>
            </a>
            <a 
              href="#rooms" 
              className="text-blue-200 hover:text-white transition-colors font-medium flex items-center space-x-2"
            >
              <span>🏥</span>
              <span>Operační sály</span>
            </a>
            <a 
              href="#operations" 
              className="text-blue-200 hover:text-white transition-colors font-medium flex items-center space-x-2"
            >
              <span>⚕️</span>
              <span>Operace</span>
            </a>
            <a 
              href="#analytics" 
              className="text-blue-200 hover:text-white transition-colors font-medium flex items-center space-x-2"
            >
              <span>📈</span>
              <span>Analýzy</span>
            </a>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden lg:flex items-center space-x-2 text-white">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Systém online</span>
            </div>
            <div className="text-blue-200 text-sm">
              {new Date().toLocaleDateString('cs-CZ', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric' 
              })}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
