
import React, { useState, useEffect, useRef } from 'react';
import { VibeSelection, VibeOutput, ThemeType, OracleMessage } from './types';
import { THEMES, OPTIONS } from './constants';
import * as gemini from './services/geminiService';
import { HintOutput } from './services/geminiService';

// The global aistudio and AIStudio types are already provided by the environment.
// Redefining them here causes "identical modifiers" and "type mismatch" errors.

const NaturePulse: React.FC<{ energy: string; accent: string }> = ({ energy, accent }) => {
  const speed = energy === 'high' ? '0.5s' : energy === 'moderate' ? '2s' : '5s';
  const height = energy === 'high' ? '20' : energy === 'moderate' ? '10' : '5';
  
  return (
    <div className="w-full h-8 flex items-center overflow-hidden opacity-20 pointer-events-none">
      <svg className="w-full h-full" viewBox="0 0 1200 60" preserveAspectRatio="none">
        <path
          d={`M0 30 Q 300 ${30-parseInt(height)} 600 30 T 1200 30`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={accent.replace('bg-', 'text-')}
        >
          <animate
            attributeName="d"
            dur={speed}
            repeatCount="indefinite"
            values={`
              M0 30 Q 300 ${30-parseInt(height)} 600 30 T 1200 30;
              M0 30 Q 300 ${30+parseInt(height)} 600 30 T 1200 30;
              M0 30 Q 300 ${30-parseInt(height)} 600 30 T 1200 30
            `}
          />
        </path>
      </svg>
    </div>
  );
};

const App: React.FC = () => {
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('earth');
  const [step, setStep] = useState(0);
  const [selection, setSelection] = useState<VibeSelection>({
    timeOfDay: 'day',
    energyLevel: 'moderate',
    weatherFeel: 'clear',
    solitudeLevel: 'few',
    intent: 'wander',
    terrain: 'forest',
    sensory: 'gradients',
    customIntent: ''
  });
  const [hint, setHint] = useState<HintOutput | null>(null);
  const [isHintLoading, setIsHintLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VibeOutput | null>(null);
  const [reflection, setReflection] = useState("");
  const [reflectionLoading, setReflectionLoading] = useState(false);
  const [asmrText, setAsmrText] = useState("");
  const [asmrLoading, setAsmrLoading] = useState(false);
  const [coords, setCoords] = useState<GeolocationCoordinates>();
  const [hasKey, setHasKey] = useState(true);
  
  const [oracleQuestion, setOracleQuestion] = useState("");
  const [oracleHistory, setOracleHistory] = useState<OracleMessage[]>([]);
  const [oracleLoading, setOracleLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const theme = THEMES[currentTheme];

  useEffect(() => {
    checkKey();
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords(pos.coords),
      () => console.log("Location denied.")
    );
  }, []);

  const checkKey = async () => {
    try {
      // @ts-ignore - window.aistudio is globally defined by the environment
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasKey(selected);
    } catch (e) { console.error(e); }
  };

  const handleOpenKeyDialog = async () => {
    // @ts-ignore - window.aistudio is globally defined by the environment
    await window.aistudio.openSelectKey();
    setHasKey(true);
  };

  const handleIntentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setSelection(prev => ({ ...prev, customIntent: val }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length >= 3) {
      setIsHintLoading(true);
      debounceRef.current = setTimeout(async () => {
        const hintRes = await gemini.getWritingHint(val, selection.intent);
        setHint(hintRes);
        setIsHintLoading(false);
      }, 400);
    } else {
      setHint(null);
      setIsHintLoading(false);
    }
  };

  const generateEngineOutput = async () => {
    // Mitigating race condition: Proceed immediately after opening key dialog
    if (!hasKey) { 
      await handleOpenKeyDialog(); 
    }
    setLoading(true);
    try {
      const vibe = await gemini.generateMoodVibe(selection);
      const visual = await gemini.generateTrailVisual(vibe, selection);
      const nearby = await gemini.getNearbyVibeSpot(selection, coords);
      setResult({ ...vibe, visualUrl: visual || undefined, nearbySpotVibe: nearby.vibe, sources: nearby.sources });
      setStep(2);
    } catch (error: any) {
      if (error?.message?.includes("Requested entity was not found.")) {
        setHasKey(false);
        await handleOpenKeyDialog();
      }
      console.error(error);
    } finally { setLoading(false); }
  };

  const playVoice = async (text: string, asmr: boolean = false) => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    try {
      const audioBytes = await gemini.generateTrailVoice(text, asmr);
      if (audioBytes) {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const ctx = audioContextRef.current;
        // Correctly view the Uint8Array as Int16Array for PCM data
        const dataInt16 = new Int16Array(audioBytes.buffer, audioBytes.byteOffset, audioBytes.byteLength / 2);
        const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
        const channelData = buffer.getChannelData(0);
        for (let i = 0; i < dataInt16.length; i++) {
          channelData[i] = dataInt16[i] / 32768.0;
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => setIsSpeaking(false);
        source.start();
      } else { setIsSpeaking(false); }
    } catch (e) {
      console.error(e);
      setIsSpeaking(false);
    }
  };

  const handleAsmrClick = async () => {
    if (!result || asmrLoading) return;
    setAsmrLoading(true);
    try {
      const description = await gemini.getAtmosphericASMR(result);
      setAsmrText(description);
      await playVoice(description, true);
    } catch (e) { console.error(e); }
    finally { setAsmrLoading(false); }
  };

  const handleOracleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oracleQuestion.trim() || oracleLoading || !result) return;
    const userMsg = oracleQuestion;
    setOracleQuestion("");
    setOracleHistory(h => [...h, { role: 'user', text: userMsg }]);
    setOracleLoading(true);
    try {
      const answer = await gemini.askTrailOracle(userMsg, result);
      setOracleHistory(h => [...h, { role: 'mountain', text: answer }]);
    } catch (e) { console.error(e); }
    finally { setOracleLoading(false); }
  };

  const reset = () => {
    setStep(0);
    setResult(null);
    setReflection("");
    setAsmrText("");
    setOracleHistory([]);
    setSelection({
      timeOfDay: 'day',
      energyLevel: 'moderate',
      weatherFeel: 'clear',
      solitudeLevel: 'few',
      intent: 'wander',
      terrain: 'forest',
      sensory: 'gradients',
      customIntent: ''
    });
  };

  return (
    <div className={`min-h-screen pb-24 transition-all duration-1000 ease-in-out ${theme.bg} ${theme.text} relative overflow-x-hidden`}>
      {/* Background Visual Layer */}
      {result?.visualUrl && (
        <div 
          className="fixed inset-0 pointer-events-none transition-all duration-1000 opacity-20 bg-cover bg-center grayscale-[50%] blur-sm scale-110"
          style={{ backgroundImage: `url(${result.visualUrl})` }}
        />
      )}
      
      {/* Immersive Theme Overlay Layer */}
      <div className={`fixed inset-0 pointer-events-none transition-all duration-1000 opacity-50 ${theme.overlay}`} />

      <header className="p-6 flex flex-col gap-2 max-w-4xl mx-auto relative z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4 cursor-pointer group" onClick={reset}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${theme.accent} text-white group-hover:rotate-6 transition-all duration-500 shadow-lg`}>
              <i className="fa-solid fa-compass text-lg"></i>
            </div>
            <h1 className="text-2xl font-serif font-bold tracking-tight">Trail Mood</h1>
          </div>
          <div className="flex gap-3">
            {Object.keys(THEMES).map((t) => (
              <button 
                key={t} 
                onClick={() => setCurrentTheme(t as ThemeType)} 
                className={`w-6 h-6 rounded-full border-2 border-white/50 transition-all hover:scale-125 hover:shadow-lg ${currentTheme === t ? 'scale-110 ring-2 ring-offset-2 ring-stone-400' : 'opacity-60'}`} 
                style={{ backgroundColor: THEMES[t as ThemeType].accent.replace('bg-', '') }} 
              />
            ))}
          </div>
        </div>
        <NaturePulse energy={selection.energyLevel} accent={theme.accent} />
      </header>

      <main className="max-w-4xl mx-auto px-6 relative z-10">
        {step === 0 && (
          <div className="fade-in mt-16 text-center space-y-10">
            <h2 className="text-5xl md:text-7xl font-serif leading-tight">Translate your <span className="italic">internal</span> landscape.</h2>
            <p className="text-xl opacity-60 max-w-lg mx-auto font-light leading-relaxed">A digital companion for the mindful walker. Sync your vibe with the earth.</p>
            <div className="flex flex-col items-center gap-4">
              <button onClick={() => setStep(1)} className={`px-12 py-5 rounded-2xl text-white font-bold text-lg shadow-xl hover:shadow-2xl transition-all hover:-translate-y-2 active:scale-95 ${theme.accent}`}>
                Begin Calibration
              </button>
              <div className="text-[10px] uppercase tracking-widest opacity-40">No registration. No tracking. No miles.</div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="fade-in mt-10 space-y-16 pb-20">
            {[
              { label: 'Ambient Light', key: 'timeOfDay', opts: OPTIONS.timeOfDay },
              { label: 'Circadian Pulse', key: 'energyLevel', opts: OPTIONS.energyLevel },
              { label: 'Terrain Archetype', key: 'terrain', opts: OPTIONS.terrain },
              { label: 'Sky Texture', key: 'weatherFeel', opts: OPTIONS.weatherFeel },
              { label: 'Sensory Anchor', key: 'sensory', opts: OPTIONS.sensory },
              { label: 'Human Presence', key: 'solitudeLevel', opts: OPTIONS.solitude },
              { label: 'Inner Objective', key: 'intent', opts: OPTIONS.intent }
            ].map(section => (
              <section key={section.label} className="space-y-6">
                <h3 className="text-xs uppercase tracking-[0.3em] font-bold opacity-40 ml-2">{section.label}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {section.opts.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSelection(s => ({ ...s, [section.key]: opt.value }))}
                      className={`group p-8 rounded-[2.5rem] border-2 transition-all duration-500 flex flex-col items-center gap-4 hover:shadow-2xl hover:-translate-y-2 active:scale-95 ${selection[section.key as keyof VibeSelection] === opt.value ? `${theme.accent} text-white border-transparent shadow-2xl scale-105` : `${theme.card} border-transparent hover:border-stone-200`}`}
                    >
                      <i className={`fa-solid ${opt.icon} text-2xl transition-transform duration-500 group-hover:scale-125 ${selection[section.key as keyof VibeSelection] === opt.value ? 'animate-pulse' : 'opacity-70'}`}></i>
                      <span className="text-sm font-bold tracking-tight text-center">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </section>
            ))}

            <section className="space-y-6 relative">
              <h3 className="text-xs uppercase tracking-[0.3em] font-bold opacity-40 ml-2">Whisper to the Wind</h3>
              <div className="relative group">
                <textarea
                  placeholder="Describe the unseen... (e.g., 'Searching for the silence between the leaves')"
                  value={selection.customIntent}
                  onChange={handleIntentChange}
                  className={`w-full p-10 rounded-[3rem] focus:outline-none focus:ring-8 focus:ring-stone-200/50 border-transparent transition-all min-h-[180px] text-xl font-light leading-relaxed shadow-inner ${theme.card} ${theme.text}`}
                />
                {(hint || isHintLoading) && (
                  <div className="absolute -top-16 right-0 md:-right-6 animate-float">
                    <div 
                      className={`p-5 rounded-3xl shadow-2xl backdrop-blur-xl border border-white/30 ${theme.card} max-w-sm cursor-pointer hover:scale-110 transition-all active:scale-95 group/hint`} 
                      onClick={() => { if(hint) setSelection(s=>({...s, customIntent: hint.poetic})); setHint(null); }}
                    >
                      {isHintLoading ? (
                        <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest opacity-60">
                          <i className="fa-solid fa-sparkles animate-spin"></i> Gathering Echoes...
                        </div>
                      ) : hint && (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className={`text-[10px] uppercase font-black px-3 py-1 rounded-full ${theme.accent} text-white`}>{hint.vibeTag}</span>
                            <span className="text-[9px] font-bold opacity-30 group-hover/hint:opacity-100 transition-opacity">TOUCH TO INFUSE</span>
                          </div>
                          <p className="text-base italic font-serif leading-relaxed text-stone-800">"{hint.poetic}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <div className="flex justify-center pt-10">
              <button disabled={loading} onClick={generateEngineOutput} className={`group px-16 py-8 rounded-[2rem] text-white font-black text-2xl shadow-3xl hover:scale-105 transition-all flex items-center gap-8 ${theme.accent} ${loading ? 'opacity-50 grayscale' : ''}`}>
                {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <>Calibrate Spirit <i className="fa-solid fa-wand-magic-sparkles"></i></>}
              </button>
            </div>
          </div>
        )}

        {step === 2 && result && (
          <div className="fade-in mt-10 space-y-12 pb-40">
            {/* Persona Summary with Visual focal piece */}
            <div className={`p-1 shadow-3xl rounded-[4rem] overflow-hidden ${theme.card} border transition-all duration-700`}>
              {result.visualUrl && (
                <div className="w-full h-80 overflow-hidden relative">
                  <img src={result.visualUrl} alt="AI Generated Trail Vibe" className="w-full h-full object-cover transition-transform duration-[10s] hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-12">
                     <div className="space-y-2">
                        <span className="text-[10px] uppercase tracking-[0.5em] font-black text-white/60">The Visual Manifestation</span>
                        <h2 className="text-3xl md:text-4xl font-serif font-bold italic text-white leading-tight">"{result.summary}"</h2>
                     </div>
                  </div>
                </div>
              )}
              
              <div className="p-12 space-y-10 relative z-10">
                <div className="flex justify-between items-start">
                  <div className="space-y-3">
                    <span className="text-xs uppercase tracking-[0.5em] font-black opacity-40">Your Resonant Signature</span>
                    <p className="text-lg opacity-70 font-serif leading-relaxed italic">A journey through the ${selection.terrain} for the soul's ${selection.intent}.</p>
                  </div>
                  <button 
                    onClick={() => playVoice(result.summary)} 
                    disabled={isSpeaking}
                    className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all ${isSpeaking ? 'bg-stone-100 scale-90' : 'hover:bg-white hover:scale-110 active:scale-90 shadow-lg'}`}
                  >
                    <i className={`fa-solid ${isSpeaking ? 'fa-waveform-lines animate-pulse' : 'fa-volume-high'}`}></i>
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div className="space-y-2">
                      <h4 className="text-xs uppercase font-black opacity-30 tracking-[0.2em]">Atmospheric Pace</h4>
                      <p className="text-2xl font-medium tracking-tight border-l-4 pl-4 border-stone-200">{result.suggestedPace}</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xs uppercase font-black opacity-30 tracking-[0.2em]">Mindful Lens</h4>
                      <p className="text-2xl font-medium tracking-tight border-l-4 pl-4 border-stone-200">{result.suggestedMindset}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-xs uppercase font-black opacity-30 tracking-[0.2em]">Harmonic Palette</h4>
                    <div className="flex flex-wrap gap-3">
                      {result.musicGenres.map(g => (
                        <span key={g} className={`px-5 py-3 rounded-2xl text-sm font-bold border transition-all hover:bg-white ${theme.accent.replace('bg-', 'border-')} ${theme.accent.replace('bg-', 'text-')}`}>
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-10 border-t border-stone-200 flex flex-col items-center gap-10">
                  <div className="text-center space-y-4">
                    <p className="text-3xl font-serif italic leading-relaxed max-w-3xl">"{result.reflectiveThought}"</p>
                    <div className="flex gap-6 justify-center">
                      <button onClick={() => playVoice(result.reflectiveThought)} className="text-[10px] uppercase tracking-widest font-black opacity-30 hover:opacity-100 transition-opacity">Voice Echo</button>
                      <button 
                        onClick={handleAsmrClick} 
                        disabled={asmrLoading}
                        className={`text-[10px] uppercase tracking-widest font-black transition-all ${asmrLoading ? 'opacity-20' : 'opacity-30 hover:opacity-100 text-indigo-500'}`}
                      >
                        {asmrLoading ? 'Sensing...' : 'Generate ASMR Soundscape'}
                      </button>
                    </div>
                    {asmrText && (
                      <p className="text-sm italic font-serif opacity-50 fade-in mt-4 max-w-xl mx-auto">"{asmrText}"</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Spirit Guide / Totem Card */}
            <div className={`p-10 rounded-[3rem] flex flex-col md:flex-row items-center gap-10 ${theme.card} border-2 border-dashed shadow-inner animate-float`}>
               <div className={`w-28 h-28 rounded-3xl flex items-center justify-center text-5xl ${theme.accent} text-white shadow-2xl rotate-3`}>
                 <i className={`fa-solid ${result.trailTotem?.icon || 'fa-mountain-sun'}`}></i>
               </div>
               <div className="text-center md:text-left space-y-2">
                 <h4 className="text-xs uppercase tracking-[0.3em] font-black opacity-40">Your Totem for this Path</h4>
                 <h3 className="text-3xl font-serif font-bold underline underline-offset-8 decoration-stone-200">{result.trailTotem?.name}</h3>
                 <p className="text-lg opacity-70 italic font-light">"{result.trailTotem?.meaning}"</p>
               </div>
            </div>

            {/* The Trail Oracle */}
            <div className={`p-10 rounded-[3.5rem] shadow-2xl ${theme.card} border space-y-8`}>
              <div className="flex items-center gap-4">
                <i className="fa-solid fa-mountain-city text-2xl opacity-40"></i>
                <h3 className="text-xl font-serif font-bold">The Oracle of the Wood</h3>
              </div>
              
              <div className="space-y-6 max-h-[400px] overflow-y-auto pr-4 scroll-smooth">
                {oracleHistory.length === 0 && (
                  <p className="text-center text-sm italic opacity-40 py-8 font-serif">"The mountain awaits your query. What lies heavy on your soul?"</p>
                )}
                {oracleHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} fade-in`}>
                    <div className={`max-w-[85%] p-6 rounded-3xl shadow-sm ${msg.role === 'user' ? 'bg-stone-800 text-white rounded-tr-none' : 'bg-white/90 border border-stone-200 rounded-tl-none font-serif italic'}`}>
                      {msg.text}
                      {msg.role === 'mountain' && (
                        <button onClick={() => playVoice(msg.text)} className="block mt-3 text-[9px] uppercase tracking-tighter opacity-40 hover:opacity-100">Listen</button>
                      )}
                    </div>
                  </div>
                ))}
                {oracleLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white/50 p-6 rounded-3xl animate-pulse flex gap-2">
                      <div className="w-2 h-2 rounded-full bg-stone-400"></div>
                      <div className="w-2 h-2 rounded-full bg-stone-400"></div>
                      <div className="w-2 h-2 rounded-full bg-stone-400"></div>
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleOracleSubmit} className="relative">
                <input 
                  type="text" 
                  value={oracleQuestion}
                  onChange={(e) => setOracleQuestion(e.target.value)}
                  placeholder="Ask the Spirit of the Trail..."
                  className="w-full py-6 px-10 rounded-full border-2 border-stone-200 focus:outline-none focus:border-stone-400 bg-transparent transition-all"
                />
                <button 
                  type="submit" 
                  disabled={oracleLoading || !oracleQuestion.trim()}
                  className={`absolute right-3 top-2 bottom-2 px-8 rounded-full text-white font-bold transition-all ${theme.accent} ${oracleLoading ? 'opacity-50' : 'hover:scale-105 active:scale-95'}`}
                >
                  Ask
                </button>
              </form>
            </div>

            {/* Bottom Global Controls */}
            <div className="fixed bottom-10 left-0 right-0 flex justify-center pointer-events-none gap-6">
              <button onClick={reset} className="pointer-events-auto px-10 py-5 rounded-3xl text-white font-black shadow-3xl transition-all hover:scale-110 active:scale-95 flex items-center gap-4 bg-stone-900 border-t border-white/10">
                <i className="fa-solid fa-rotate-left"></i> Relinquish Journey
              </button>
              {result && (
                <button onClick={() => window.print()} className="pointer-events-auto px-10 py-5 rounded-3xl text-white font-black shadow-3xl transition-all hover:scale-110 active:scale-95 flex items-center gap-4 bg-stone-800 border-t border-white/10">
                  <i className="fa-solid fa-feather-pointed"></i> Record Log
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 w-full p-5 flex justify-center text-[9px] uppercase tracking-[0.6em] font-black opacity-20 pointer-events-none z-0">
        Nature is the only destination.
      </footer>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0); }
          50% { transform: translateY(-15px) rotate(1deg); }
        }
        .animate-float {
          animation: float 6s infinite ease-in-out;
        }
        .shadow-3xl {
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
        }
      `}</style>
    </div>
  );
}

export default App;
