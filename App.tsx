
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Zap, Target, ArrowRight, RotateCcw, PenTool, Wand2, AlertCircle, Layers, Settings2, Code } from 'lucide-react';
import { improvePrompt } from './services/geminiService';
import { PromptVersion, OptimizationConfig, PromptFramework } from './types';
import { Button } from './components/Button';
import { HistoryItem } from './components/HistoryItem';

const MAX_SAFETY_LOOPS = 8; 

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [config, setConfig] = useState<OptimizationConfig>({
    mode: 'improve',
    strategy: 'iterations',
    targetIterations: 3,
    targetScore: 90,
    selectedTechnique: 'auto'
  });
  
  const [history, setHistory] = useState<PromptVersion[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history]);

  const runEvolution = async (startText: string, appendHistory: boolean = false) => {
    setIsProcessing(true);
    setError(null);
    
    if (!appendHistory) {
        setHistory([]);
    }

    let loopCount = 0;
    let shouldContinue = true;
    let currentText = startText;
    
    // Determine initial history state
    if (!appendHistory && config.mode === 'improve') {
        const initialVersion: PromptVersion = {
          step: 0,
          content: startText,
          score: 0,
          critique: "Entrada original",
          changes: "",
          usedTechnique: "N/A"
        };
        setHistory([initialVersion]);
    }

    try {
      while (shouldContinue) {
        loopCount++;
        
        // Safety break
        if (loopCount > MAX_SAFETY_LOOPS) {
          shouldContinue = false;
          break;
        }

        const isCreation = config.mode === 'create';
        const result = await improvePrompt(currentText, isCreation, loopCount, config.selectedTechnique);

        const newVersion: PromptVersion = {
          step: (appendHistory ? history.length : 0) + loopCount + (config.mode === 'create' && !appendHistory ? -1 : 0),
          content: result.improvedPrompt,
          score: result.score,
          critique: result.critique,
          changes: result.changes,
          usedTechnique: result.usedTechnique,
          techniqueExplanation: result.techniqueExplanation,
          techniqueApplication: result.techniqueApplication
        };

        setHistory(prev => [...prev, newVersion]);
        currentText = result.improvedPrompt;
        
        // Strategy Logic
        if (config.strategy === 'iterations') {
          if (loopCount >= config.targetIterations) {
            shouldContinue = false;
          }
        } else if (config.strategy === 'score') {
          if (result.score >= config.targetScore) {
            shouldContinue = false;
          }
        }
        
        if (shouldContinue) {
          await new Promise(r => setTimeout(r, 800));
        }
      }
    } catch (err) {
      setError("Ocorreu um erro ao conectar com a IA. Verifique sua chave de API ou tente novamente.");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStart = () => {
    if (!inputText.trim()) return;
    runEvolution(inputText, false);
  };

  const handleContinueFromVersion = (content: string) => {
    // Switch to improve mode implicitly if continuing
    if (config.mode === 'create') {
        setConfig(prev => ({ ...prev, mode: 'improve' }));
    }
    // We scroll to top of history ideally, but app logic replaces history or appends?
    // User requested "Continue from here". The best UX is to clear history and start fresh with that input, 
    // OR act as if we are branching. Let's start fresh for clarity.
    setHistory([]);
    setInputText(content); // Update main input box too
    runEvolution(content, false);
  };

  const handleReset = () => {
    setHistory([]);
    setError(null);
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-neo selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Header */}
      <header className="bg-neo sticky top-0 z-20 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="neo-flat-sm p-2.5 rounded-xl text-indigo-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 text-glow-indigo tracking-tight">
              PROMPT MASTER
            </h1>
          </div>
          <div className="text-xs font-mono text-slate-500 hidden sm:block neo-pressed-sm px-3 py-1 rounded-lg">
            v3.0 // PRO
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-5xl mx-auto w-full px-6 py-10 space-y-12">
        
        {/* Intro / Config Section */}
        <section className="neo-flat rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -z-10 transform translate-x-1/2 -translate-y-1/2"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            
            {/* Left Column: Input */}
            <div className="space-y-6">
              <div className="flex neo-pressed p-1.5 rounded-2xl w-fit">
                <button
                  onClick={() => setConfig({ ...config, mode: 'create' })}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${config.mode === 'create' ? 'neo-flat text-cyan-400 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <PenTool className="w-4 h-4 inline mr-2" />
                  Criar
                </button>
                <button
                  onClick={() => setConfig({ ...config, mode: 'improve' })}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${config.mode === 'improve' ? 'neo-flat text-indigo-400 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <Wand2 className="w-4 h-4 inline mr-2" />
                  Melhorar
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-3 ml-1 uppercase tracking-wider">
                  {config.mode === 'create' ? 'Tópico ou Ideia' : 'Prompt Atual'}
                </label>
                <textarea
                  className="w-full h-48 p-6 rounded-2xl neo-pressed bg-transparent text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-none transition-all"
                  placeholder={config.mode === 'create' ? "Ex: Uma história cyberpunk sobre um hacker..." : "Ex: Analise estes dados e crie um relatório..."}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={isProcessing}
                ></textarea>
              </div>
            </div>

            {/* Right Column: Settings */}
            <div className="space-y-6 md:border-l md:border-slate-800 md:pl-10 flex flex-col justify-center">
              
              {/* Strategy Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 ml-1 uppercase tracking-wider">
                  Estratégia de Parada
                </label>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div 
                    onClick={() => setConfig({ ...config, strategy: 'iterations' })}
                    className={`cursor-pointer neo-flat-sm rounded-2xl p-4 flex flex-col items-center justify-center space-y-2 transition-all duration-300 ${config.strategy === 'iterations' ? 'text-cyan-400 ring-1 ring-cyan-500/30' : 'text-slate-500 hover:text-slate-300 opacity-60 hover:opacity-100'}`}
                  >
                    <Zap className="w-5 h-5" />
                    <span className="text-xs font-bold">Etapas</span>
                  </div>
                  <div 
                    onClick={() => setConfig({ ...config, strategy: 'score' })}
                    className={`cursor-pointer neo-flat-sm rounded-2xl p-4 flex flex-col items-center justify-center space-y-2 transition-all duration-300 ${config.strategy === 'score' ? 'text-indigo-400 ring-1 ring-indigo-500/30' : 'text-slate-500 hover:text-slate-300 opacity-60 hover:opacity-100'}`}
                  >
                    <Target className="w-5 h-5" />
                    <span className="text-xs font-bold">Nota Alvo</span>
                  </div>
                </div>

                {/* Sliders */}
                {config.strategy === 'iterations' ? (
                  <div className="neo-pressed rounded-xl p-4">
                    <div className="flex justify-between mb-3">
                      <span className="text-xs font-bold text-slate-400">Loops</span>
                      <span className="text-xs font-bold text-cyan-400">{config.targetIterations}x</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="1"
                      value={config.targetIterations}
                      onChange={(e) => setConfig({ ...config, targetIterations: parseInt(e.target.value) })}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-800 accent-cyan-400"
                    />
                  </div>
                ) : (
                  <div className="neo-pressed rounded-xl p-4">
                    <div className="flex justify-between mb-3">
                      <span className="text-xs font-bold text-slate-400">Qualidade Min</span>
                      <span className="text-xs font-bold text-indigo-400">{config.targetScore}%</span>
                    </div>
                    <input
                      type="range"
                      min="80"
                      max="100"
                      step="5"
                      value={config.targetScore}
                      onChange={(e) => setConfig({ ...config, targetScore: parseInt(e.target.value) })}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-800 accent-indigo-400"
                    />
                  </div>
                )}
              </div>

              {/* Framework Selector */}
              <div>
                 <label className="block text-xs font-bold text-slate-400 mb-2 ml-1 uppercase tracking-wider flex items-center">
                    <Layers className="w-3 h-3 mr-1" />
                    Framework de Engenharia
                </label>
                <div className="relative">
                  <select 
                    value={config.selectedTechnique}
                    onChange={(e) => setConfig({ ...config, selectedTechnique: e.target.value as PromptFramework })}
                    className="w-full appearance-none neo-pressed rounded-xl p-4 bg-transparent text-sm font-bold text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer"
                  >
                    <option value="auto">🤖 Auto (IA Decide)</option>
                    <option value="costar">★ CO-STAR (Context, Obj, Style...)</option>
                    <option value="cot">🧠 Chain of Thought (Raciocínio)</option>
                    <option value="few-shot">🎯 Few-Shot (Exemplos Práticos)</option>
                    <option value="persona">🎭 Persona (Atuar como Expert)</option>
                    <option value="decomposition">🧱 Decomposition (Dividir Tarefas)</option>
                  </select>
                  <Settings2 className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              </div>

              <Button 
                onClick={handleStart} 
                isLoading={isProcessing}
                disabled={!inputText.trim()}
                className="w-full py-4 text-lg tracking-wide shadow-lg"
                icon={<Sparkles className="w-5 h-5" />}
              >
                {isProcessing ? 'EVOLUINDO...' : 'INICIAR EVOLUÇÃO'}
              </Button>
            </div>
          </div>
        </section>

        {/* Error Display */}
        {error && (
          <div className="neo-flat border border-red-500/20 text-red-400 p-6 rounded-2xl flex items-center shadow-[0_0_20px_rgba(239,68,68,0.1)]">
             <AlertCircle className="w-6 h-6 mr-4" />
             {error}
          </div>
        )}

        {/* Timeline */}
        {history.length > 0 && (
          <section className="space-y-8 animate-fade-in-up">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-bold text-slate-300 flex items-center">
                <ArrowRight className="w-5 h-5 mr-3 text-indigo-500" />
                Linha do Tempo
              </h2>
              {!isProcessing && (
                <button 
                  onClick={handleReset}
                  className="neo-flat-sm px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-red-400 flex items-center transition-colors active:scale-95"
                >
                  <RotateCcw className="w-4 h-4 mr-2" /> REINICIAR
                </button>
              )}
            </div>

            <div className="space-y-8 relative">
              {/* Timeline Line */}
              <div className="absolute left-9 top-8 bottom-8 w-1 bg-gradient-to-b from-indigo-500/50 to-transparent -z-10 hidden md:block rounded-full"></div>

              {history.map((version, idx) => (
                <div key={idx} className="md:pl-24 relative">
                  {/* Timeline Node */}
                  <div className={`hidden md:flex absolute left-9 top-10 w-4 h-4 rounded-full border-2 transform -translate-x-1/2 z-0 shadow-[0_0_15px_currentColor] transition-colors duration-500 ${idx === history.length - 1 && !isProcessing ? 'bg-indigo-500 border-indigo-300 text-indigo-500' : 'bg-[#292d3e] border-slate-600 text-slate-600'}`}></div>
                  
                  <HistoryItem 
                    version={version} 
                    isLatest={idx === history.length - 1}
                    onContinue={handleContinueFromVersion}
                  />
                </div>
              ))}
              
              <div ref={scrollRef} />
              
              {isProcessing && (
                <div className="md:pl-24 relative">
                   <div className="hidden md:flex absolute left-9 top-10 w-4 h-4 rounded-full bg-cyan-500 animate-ping opacity-75 transform -translate-x-1/2 z-0"></div>
                   <div className="neo-pressed border border-indigo-500/10 rounded-3xl p-10 flex flex-col items-center justify-center text-indigo-400">
                      <Sparkles className="w-10 h-10 mb-4 animate-spin-slow" />
                      <p className="text-sm font-bold tracking-widest uppercase animate-pulse">Aplicando Engenharia de Prompt...</p>
                   </div>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      <footer className="w-full py-6 text-center border-t border-slate-800/50 mt-auto">
        <p className="flex items-center justify-center text-xs font-bold text-slate-600 tracking-[0.2em] uppercase opacity-70 hover:opacity-100 transition-opacity">
          <Code className="w-3 h-3 mr-2" />
          DEV ALEKSANDRO ALVES
        </p>
      </footer>
    </div>
  );
};

export default App;
