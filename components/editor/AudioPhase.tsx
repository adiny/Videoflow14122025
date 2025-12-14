import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Music, Mic, Loader2, Volume2, Search, Wand2, RefreshCw, Download } from 'lucide-react';
import { Voice, Scene } from '../../types';
import { Button } from '../ui/Button';
import { generateSpeech, generateMixedSceneAudio } from '../../services/mockAi';

interface AudioPhaseProps {
  selectedVoiceId?: string;
  onVoiceSelect: (id: string) => void;
  scenes: Scene[];
  onUpdateScene: (id: string, updates: Partial<Scene>) => void;
}

const REAL_VOICES: Voice[] = [
  { id: 'Achernar', name: 'Achernar', gender: 'female', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Achernar' },
  { id: 'Achird', name: 'Achird', gender: 'male', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Achird' },
  { id: 'Algenib', name: 'Algenib', gender: 'male', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Algenib' },
  { id: 'Algieba', name: 'Algieba', gender: 'male', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Algieba' },
  { id: 'Alnilam', name: 'Alnilam', gender: 'male', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alnilam' },
  { id: 'Aoede', name: 'Aoede', gender: 'female', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aoede' },
  { id: 'Autonoe', name: 'Autonoe', gender: 'female', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Autonoe' },
  { id: 'Callirrhoe', name: 'Callirrhoe', gender: 'female', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Callirrhoe' },
  { id: 'Charon', name: 'Charon', gender: 'male', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charon' },
  { id: 'Despina', name: 'Despina', gender: 'female', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Despina' },
  { id: 'Enceladus', name: 'Enceladus', gender: 'male', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Enceladus' },
  { id: 'Erinome', name: 'Erinome', gender: 'female', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Erinome' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'male', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fenrir' },
  { id: 'Gacrux', name: 'Gacrux', gender: 'female', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Gacrux' },
  { id: 'Iapetus', name: 'Iapetus', gender: 'male', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Iapetus' },
  { id: 'Kore', name: 'Kore', gender: 'female', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kore' },
  { id: 'Laomedeia', name: 'Laomedeia', gender: 'female', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Laomedeia' },
  { id: 'Leda', name: 'Leda', gender: 'female', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Leda' },
  { id: 'Orus', name: 'Orus', gender: 'male', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Orus' },
  { id: 'Pulcherrima', name: 'Pulcherrima', gender: 'female', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Pulcherrima' },
  { id: 'Puck', name: 'Puck', gender: 'male', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Puck' },
  { id: 'Rasalgethi', name: 'Rasalgethi', gender: 'male', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rasalgethi' },
  { id: 'Sadachbia', name: 'Sadachbia', gender: 'male', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sadachbia' },
  { id: 'Sadaltager', name: 'Sadaltager', gender: 'male', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sadaltager' },
  { id: 'Schedar', name: 'Schedar', gender: 'male', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Schedar' },
  { id: 'Sulafat', name: 'Sulafat', gender: 'female', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sulafat' },
  { id: 'Umbriel', name: 'Umbriel', gender: 'male', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Umbriel' },
  { id: 'Vindemiatrix', name: 'Vindemiatrix', gender: 'female', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Vindemiatrix' },
  { id: 'Zephyr', name: 'Zephyr', gender: 'female', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zephyr' },
  { id: 'Zubenelgenubi', name: 'Zubenelgenubi', gender: 'male', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zubenelgenubi' },
];

export const AudioPhase: React.FC<AudioPhaseProps> = ({ 
    selectedVoiceId, 
    onVoiceSelect, 
    scenes,
    onUpdateScene
}) => {
  const [playingSceneId, setPlayingSceneId] = useState<string | null>(null);
  const [previewVoiceId, setPreviewVoiceId] = useState<string | null>(null);
  const [generatingSceneId, setGeneratingSceneId] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  const playAudio = (url: string, id: string) => {
      if (audioRef.current) {
          audioRef.current.pause();
          if ((playingSceneId === id || previewVoiceId === id)) {
              setPlayingSceneId(null);
              setPreviewVoiceId(null);
              return;
          }
      }

      const audio = new Audio(url);
      audioRef.current = audio;
      
      if (id.startsWith('preview-')) {
          setPreviewVoiceId(id);
      } else {
          setPlayingSceneId(id);
      }

      audio.onended = () => {
          setPlayingSceneId(null);
          setPreviewVoiceId(null);
      };

      audio.play().catch(console.error);
  };

  const handleDownload = (url: string, filename: string) => {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  };

  const handleGenerateSceneAudio = async (scene: Scene) => {
      if (!selectedVoiceId) return;
      
      setGeneratingSceneId(scene.id);
      try {
          // Generate Mixed Audio (VO + SFX + BGM) based on spec
          const mixedAudioUrl = await generateMixedSceneAudio(
              scene.text_segment, 
              scene.visual_prompt,
              selectedVoiceId
          );
          onUpdateScene(scene.id, { audio_url: mixedAudioUrl });
      } catch (e) {
          console.error("Audio generation failed", e);
          alert("Failed to generate audio for scene");
      } finally {
          setGeneratingSceneId(null);
      }
  };

  const handleGenerateAll = async () => {
      if (!selectedVoiceId) return;
      
      setIsGeneratingAll(true);
      try {
          for (const scene of scenes) {
              // Skip if already has audio? Or regenerate all? Let's regenerate to ensure consistency with selected voice.
              // We'll process sequentially to avoid rate limits
              await handleGenerateSceneAudio(scene);
          }
      } finally {
          setIsGeneratingAll(false);
      }
  };

  const filteredVoices = REAL_VOICES.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6">
      {/* LEFT COLUMN: Voice Selector */}
      <div className="w-full lg:w-4/12 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex-1 flex flex-col min-h-[400px]">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center mb-2">
                <Mic className="w-5 h-5 mr-2 text-indigo-600" />
                Select AI Voice
            </h3>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search voices..." 
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 overflow-y-auto pr-1 flex-1 content-start">
            {filteredVoices.map((voice) => (
              <div 
                key={voice.id}
                onClick={() => onVoiceSelect(voice.id)}
                className={`cursor-pointer rounded-lg p-3 border-2 transition-all flex flex-col items-center gap-2 relative group ${
                  selectedVoiceId === voice.id 
                    ? 'border-indigo-600 bg-indigo-50' 
                    : 'border-slate-100 hover:border-indigo-200'
                }`}
              >
                <div className="relative">
                  <img src={voice.avatar_url} alt={voice.name} className="w-12 h-12 rounded-full bg-slate-100 object-cover" />
                  <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        playAudio(voice.preview_url || '', `preview-${voice.id}`);
                        if(!voice.preview_url) {
                            generateSpeech(`Hi, I'm ${voice.name}`, voice.id).then(url => playAudio(url, `preview-${voice.id}`));
                        }
                    }}
                    className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center text-indigo-600 border border-slate-100 hover:bg-indigo-50"
                  >
                    {previewVoiceId === `preview-${voice.id}` ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                  </button>
                </div>
                <div className="text-center">
                  <p className="font-medium text-sm text-slate-900">{voice.name}</p>
                  <p className="text-[10px] uppercase text-slate-400 font-semibold">{voice.gender}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Scene Audio Manager */}
      <div className="w-full lg:w-8/12 flex flex-col">
         <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex-1 flex flex-col relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                        <Volume2 className="w-5 h-5 mr-2 text-indigo-600" />
                        Scene Audio Generator
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Mix Voiceover (VO), SFX, and Background Music (BGM) per scene.</p>
                </div>
                <Button 
                    onClick={handleGenerateAll} 
                    disabled={isGeneratingAll || !selectedVoiceId} 
                    isLoading={isGeneratingAll}
                    className="shadow-md"
                >
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate All Scenes
                </Button>
            </div>

            {/* Scenes List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {scenes.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">No scenes found. Please go back and generate a script.</div>
                ) : (
                    scenes.map((scene, index) => (
                        <div key={scene.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50 hover:border-indigo-200 transition-colors">
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                                            SCENE {index + 1}
                                        </span>
                                        <span className="text-xs text-slate-400 font-mono">
                                            {scene.duration || 5}s
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-800 mb-2 font-mono leading-relaxed bg-white p-2 rounded border border-slate-100">
                                        {scene.text_segment}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <span className="font-semibold text-xs uppercase tracking-wider text-indigo-400">Visual Context:</span> 
                                        <span className="truncate max-w-md">{scene.visual_prompt}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 shrink-0 w-36">
                                    <Button 
                                        size="sm" 
                                        variant={scene.audio_url ? "secondary" : "primary"}
                                        onClick={() => handleGenerateSceneAudio(scene)}
                                        disabled={generatingSceneId === scene.id || isGeneratingAll}
                                        className="w-full text-xs"
                                    >
                                        {generatingSceneId === scene.id ? (
                                            <>
                                                <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Mixing...
                                            </>
                                        ) : scene.audio_url ? (
                                            <>
                                                <RefreshCw className="w-3 h-3 mr-1" /> Regenerate
                                            </>
                                        ) : (
                                            <>
                                                <Wand2 className="w-3 h-3 mr-1" /> Generate Mix
                                            </>
                                        )}
                                    </Button>

                                    {scene.audio_url && (
                                        <div className="flex gap-1 w-full">
                                            <Button 
                                                size="sm"
                                                variant={playingSceneId === scene.id ? "primary" : "outline"}
                                                onClick={() => playAudio(scene.audio_url!, scene.id)}
                                                className="flex-1 text-xs px-1"
                                                title={playingSceneId === scene.id ? "Pause" : "Preview"}
                                            >
                                                {playingSceneId === scene.id ? (
                                                    <Pause className="w-3 h-3" />
                                                ) : (
                                                    <Play className="w-3 h-3" />
                                                )}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleDownload(scene.audio_url!, `scene-${index + 1}-audio.wav`)}
                                                className="shrink-0 text-xs px-2"
                                                title="Download Audio"
                                            >
                                                <Download className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
         </div>
      </div>
    </div>
  );
};