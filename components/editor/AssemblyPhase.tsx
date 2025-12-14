import React, { useState, useEffect } from 'react';
import { Play, Download, Share2, Settings, Film, Loader2, RefreshCw } from 'lucide-react';
import { Scene } from '../../types';
import { Button } from '../ui/Button';
import { generateVeoVideo } from '../../services/mockAi';

interface AssemblyPhaseProps {
  scenes: Scene[];
  onUpdateScene: (sceneId: string, updates: Partial<Scene>) => void;
}

export const AssemblyPhase: React.FC<AssemblyPhaseProps> = ({ scenes, onUpdateScene }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

  // Default select first scene on mount or when available
  useEffect(() => {
    if (scenes.length > 0 && !selectedSceneId) {
        setSelectedSceneId(scenes[0].id);
    }
  }, [scenes, selectedSceneId]);

  const selectedScene = scenes.find(s => s.id === selectedSceneId) || scenes[0];
  const activeVideoUrl = selectedScene?.video_url;

  // Calculate actual total duration
  const totalDuration = scenes.reduce((acc, scene) => acc + (scene.duration || 5), 0);
  
  const handleRender = async () => {
      if (!selectedScene || !selectedScene.image_url) {
          alert("Please ensure the selected scene has an image generated in Step 3.");
          return;
      }

      setIsRendering(true);
      try {
          // Use duration from scene script (e.g., 6s), defaulting to 6s if not found (per user request to not use 8s default)
          const duration = selectedScene.duration || 6; 
          const url = await generateVeoVideo(selectedScene.text_segment, selectedScene.visual_prompt, selectedScene.image_url, duration);
          onUpdateScene(selectedScene.id, { video_url: url });
          setIsPlaying(true);
      } catch (error) {
          alert("Failed to generate video. Please try again.");
          console.error(error);
      } finally {
          setIsRendering(false);
      }
  }

  // Helper to determine width based on duration (25px per second)
  const getWidth = (duration?: number) => (duration || 5) * 25;

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Top Section: Player and Export */}
      <div className="flex flex-col lg:flex-row gap-6 h-3/5">
        {/* Player */}
        <div className="flex-1 bg-black rounded-xl overflow-hidden relative group flex items-center justify-center shadow-lg">
             {activeVideoUrl ? (
                <video 
                    key={activeVideoUrl}
                    src={activeVideoUrl} 
                    className="w-full h-full object-contain" 
                    controls 
                    autoPlay={isPlaying}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                />
             ) : (
                 // Static Preview based on selected scene image
                 selectedScene?.image_url ? (
                     <img src={selectedScene.image_url} className="w-full h-full object-cover opacity-80" alt="preview" />
                 ) : (
                     <div className="text-white/50 flex flex-col items-center">
                         <Film className="w-16 h-16 mb-4" />
                         <p>Select a scene to generate video</p>
                     </div>
                 )
             )}
             
             {/* Player Overlay Controls (Only show if video not loaded or not playing) */}
             {(!activeVideoUrl || (!isPlaying && activeVideoUrl)) && (
                 <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <button 
                      onClick={() => {
                          if (activeVideoUrl) {
                              const v = document.querySelector('video');
                              if (v) v.play();
                          }
                      }}
                      className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:scale-110 transition-transform text-white border-2 border-white/50 pointer-events-auto"
                    >
                        <Play className="w-6 h-6 fill-current ml-1" />
                    </button>
                 </div>
             )}

             {isRendering && (
                 <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10">
                     <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                     <p className="text-white font-medium">Generating Veo 3.1 Video...</p>
                     <p className="text-white/60 text-sm mt-2">Processing Scene {scenes.findIndex(s => s.id === selectedScene?.id) + 1} ({selectedScene?.duration || 6}s)</p>
                 </div>
             )}
        </div>

        {/* Export Sidebar */}
        <div className="w-full lg:w-80 bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col gap-6">
           <h3 className="font-semibold text-slate-900 border-b border-slate-100 pb-4">Export Settings</h3>
           
           <div className="space-y-4 flex-1">
               <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                   <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Selected Scene</h4>
                   <p className="text-sm font-medium text-slate-900 truncate">
                       {scenes.findIndex(s => s.id === selectedScene?.id) + 1}. {selectedScene?.text_segment || "Untitled"}
                   </p>
                   <div className="flex gap-2 mt-2">
                       <span className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-500">
                           {selectedScene?.duration || 5}s
                       </span>
                       {activeVideoUrl && <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded">Ready</span>}
                   </div>
               </div>

               <div>
                   <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Resolution</label>
                   <select className="w-full border border-slate-300 rounded-md p-2 text-sm bg-slate-50">
                       <option>720p (HD)</option>
                       <option>1080p (Full HD)</option>
                   </select>
               </div>
           </div>

           <Button 
                id="render-btn" 
                size="lg" 
                className="w-full shadow-indigo-200 shadow-lg" 
                onClick={handleRender}
                disabled={isRendering || !selectedScene}
            >
               {isRendering ? (
                   <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Rendering...
                   </>
               ) : activeVideoUrl ? (
                   <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate Scene
                   </>
               ) : (
                   <>
                    <Film className="w-4 h-4 mr-2" />
                    Generate Scene (Veo 3.1)
                   </>
               )}
           </Button>
           
           {activeVideoUrl && (
               <a href={activeVideoUrl} download={`scene-${scenes.findIndex(s => s.id === selectedScene?.id) + 1}.mp4`} className="w-full">
                   <Button variant="outline" className="w-full">
                       <Download className="w-4 h-4 mr-2" />
                       Download Clip
                   </Button>
               </a>
           )}
        </div>
      </div>

      {/* Bottom Section: Timeline */}
      <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 p-4 overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-2 text-slate-400 text-xs font-mono uppercase">
              <span>00:00</span>
              <span>Timeline ({scenes.length} Scenes)</span>
              <span>{Math.floor(totalDuration / 60)}:{(totalDuration % 60).toString().padStart(2, '0')}</span>
          </div>
          
          <div className="flex-1 relative overflow-x-auto custom-scrollbar">
              <div className="absolute inset-y-0 left-0 flex gap-1 h-full min-w-full">
                  {scenes.map((scene, i) => {
                      const isSelected = selectedSceneId === scene.id;
                      return (
                          <div 
                            key={scene.id} 
                            onClick={() => setSelectedSceneId(scene.id)}
                            className={`h-24 rounded-md border relative group overflow-hidden shrink-0 cursor-pointer transition-all ${
                                isSelected 
                                ? 'border-indigo-500 ring-2 ring-indigo-500 z-10' 
                                : 'border-slate-700 bg-slate-800 hover:border-slate-500'
                            }`}
                            style={{ width: `${getWidth(scene.duration)}px` }} 
                            title={`Scene ${i+1}: ${scene.duration || 5}s`}
                          >
                              {scene.image_url && <img src={scene.image_url} className={`w-full h-full object-cover transition-opacity ${isSelected ? 'opacity-100' : 'opacity-50 group-hover:opacity-80'}`} alt="" />}
                              <div className="absolute bottom-1 left-2 text-xs font-medium text-white shadow-sm truncate w-11/12">{scene.text_segment}</div>
                              <div className="absolute top-1 right-1 bg-black/50 text-white text-[10px] px-1 rounded border border-white/10">
                                  {scene.duration || 5}s
                              </div>
                              {scene.video_url && (
                                  <div className="absolute top-1 left-1 bg-green-500/80 text-white p-0.5 rounded-full">
                                      <Play className="w-2 h-2 fill-current" />
                                  </div>
                              )}
                          </div>
                      );
                  })}
                  <div className="w-20 shrink-0"></div>
              </div>
          </div>
          {/* Time ruler */}
          <div className="h-8 mt-2 bg-indigo-900/30 rounded border border-indigo-900/50 flex items-center px-2 overflow-x-auto custom-scrollbar">
               <div className="flex gap-1">
                   {scenes.map((scene, i) => (
                       <div 
                         key={i} 
                         className={`h-4 rounded-sm shrink-0 border transition-colors ${selectedSceneId === scene.id ? 'bg-indigo-400 border-indigo-300' : 'bg-indigo-500/30 border-indigo-500/20'}`}
                         style={{ width: `${getWidth(scene.duration)}px` }} 
                       ></div>
                   ))}
               </div>
          </div>
      </div>
    </div>
  );
};