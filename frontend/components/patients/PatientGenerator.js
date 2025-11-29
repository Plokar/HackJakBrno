import { useState } from 'react';
import { XMarkIcon, BeakerIcon, CloudArrowDownIcon } from '@heroicons/react/24/outline';
import { useGeneratePatients, useSyncPatientsFromFHIR } from '../../lib/hooks/useFHIR';

export default function PatientGenerator({ onClose }) {
  const [count, setCount] = useState(50);
  const [generating, setGenerating] = useState(false);
  const [generationMode, setGenerationMode] = useState('synthea'); // 'synthea' nebo 'simple'
  
  const generateMutation = useGeneratePatients();
  const syncMutation = useSyncPatientsFromFHIR();

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await generateMutation.mutateAsync(count);
      
      // Zkontrolovat, jestli se použil Synthea nebo fallback
      if (result.output && result.output.includes('jednoduch')) {
        setGenerationMode('simple');
      }
      
      // Po úspěšném vygenerování zavřít modal
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error generating patients:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleSync = async () => {
    setGenerating(true);
    try {
      await syncMutation.mutateAsync();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error syncing patients:', error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Generovat pacienty
          </h2>
          <button
            onClick={onClose}
            disabled={generating}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Generate Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center space-x-2">
                <BeakerIcon className="h-5 w-5 text-blue-600" />
                <span>Počet pacientů k vygenerování</span>
              </div>
            </label>
            <input
              type="number"
              min="1"
              max="1000"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 0)}
              disabled={generating}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="mt-2 text-sm text-gray-500">
              <p className="font-medium">Synthea generátor:</p>
              <p>Vytvoří realistické pacienty s kompletní lékařskou historií</p>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={generating || count < 1}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {generating && generateMutation.isPending
              ? 'Generuji pacienty...'
              : `Vygenerovat ${count} pacientů`}
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">NEBO</span>
            </div>
          </div>

          {/* Sync Section */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <CloudArrowDownIcon className="h-5 w-5 text-green-600" />
              <p className="text-sm text-gray-700 font-medium">
                Synchronizace existujících dat
              </p>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Stáhne všechny existující pacienty z FHIR serveru do Django databáze
            </p>
            <button
              onClick={handleSync}
              disabled={generating}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {generating && syncMutation.isPending
                ? 'Synchronizuji...'
                : 'Synchronizovat z FHIR'}
            </button>
          </div>

          {/* Progress Info */}
          {generating && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    {generationMode === 'synthea' 
                      ? 'Generuji data pomocí Synthea...'
                      : 'Generuji zjednodušená data...'}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    {count > 20 
                      ? 'Generování většího počtu pacientů může trvat i několik minut'
                      : 'Tato operace může trvat několik sekund až minut'}
                  </p>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center space-x-2 text-xs text-blue-600">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                      <span>Spouštím Synthea Docker kontejner...</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-blue-600">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                      <span>Generování FHIR zdrojů...</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-blue-600">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                      <span>Nahrávání do FHIR serveru...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center space-x-2">
              <BeakerIcon className="h-5 w-5 text-blue-600" />
              <span>Synthea - Generátor zdravotních dat</span>
            </h3>
            <ul className="text-sm text-gray-700 space-y-2">
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 font-bold">✓</span>
                <span>Kompletní lékařské záznamy s historií</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 font-bold">✓</span>
                <span>Diagnózy, léky, laboratorní výsledky</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 font-bold">✓</span>
                <span>FHIR R4 kompatibilní struktury</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 font-bold">✓</span>
                <span>Automatická synchronizace do Django</span>
              </li>
            </ul>
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-xs text-gray-600 italic">
                Pokud Synthea selže, automaticky se použije zjednodušený generátor s českými jmény
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={generating}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 font-medium"
          >
            Zavřít
          </button>
        </div>
      </div>
    </div>
  );
}

