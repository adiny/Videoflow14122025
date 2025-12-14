import React, { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, RefreshCw, Wand2, GripVertical, CheckCircle2, Clock, Trash2, Plus, Upload, Play, Pause, Settings as SettingsIcon } from 'lucide-react';
import { Scene } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { generateImage, editImage } from '../../services/mockAi';

interface StoryboardPhaseProps {
  scenes: Scene[];
  onUpdateScene: (sceneId: string, updates: Partial<Scene>) => void;
}

export const StoryboardPhase: React.FC<StoryboardPhaseProps> = ({ scenes, onUpdateScene }) => {
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [elementFiles, setElementFiles] = useState<File[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  
  // Generation Settings State
  const [genConfig, setGenConfig] = useState<{
      model: 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview';
      aspectRatio: string;
      imageSize: string;
      useGrounding: boolean;
  }>({
      model: 'gemini-3-pro-image-preview',
      aspectRatio: '16:9',
      imageSize: '1K',
      useGrounding: false
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Ref for the replacement image input
  const replaceImageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingSceneId, setUploadingSceneId] = useState<string | null>(null);

  const elementInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
        if(audioRef.current) audioRef.current.pause();
    }
  }, []);

  const handleGenerateImage = async (scene: Scene) => {
    setGeneratingId(scene.id);
    try {
      // Pass configuration to generation service
      const url = await generateImage(scene.visual_prompt, genConfig);
      onUpdateScene(scene.id, { image_url: url });
    } finally {
      setGeneratingId(null);
    }
  };

  const playSceneAudio = (scene: Scene) => {
      if (!scene.audio_url) return;

      if (audioRef.current) {
          audioRef.current.pause();
          if (playingAudioId === scene.id) {
              setPlayingAudioId(null);
              return;
          }
      }

      const audio = new Audio(scene.audio_url);
      audioRef.current = audio;
      setPlayingAudioId(scene.id);
      
      audio.onended = () => setPlayingAudioId(null);
      audio.play().catch(console.error);
  };

  const handleRemoveImage = (sceneId: string) => {
      onUpdateScene(sceneId, { image_url: undefined });
  };

  const handleEditConfirm = async () => {
      if (!editingScene || !editingScene.image_url || !editPrompt) return;
      
      setIsEditing(true);
      try {
          const newUrl = await editImage(editingScene.image_url, editPrompt, elementFiles);
          onUpdateScene(editingScene.id, { image_url: newUrl });
          setEditingScene(null);
          setEditPrompt('');
          setElementFiles([]);
      } catch (e) {
          alert("Failed to edit image");
      } finally {
          setIsEditing(false);
      }
  };

  const closeEditModal = () => {
      setEditingScene(null);
      setElementFiles([]);
      setEditPrompt('');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const newFiles = Array.from(e.target.files);
          // Limit total to 5
          setElementFiles(prev => [...prev, ...newFiles].slice(0, 5));
          if (elementInputRef.current) elementInputRef.current.value = '';
      }
  };

  const removeFile = (index: number) => {
      setElementFiles(prev => prev.filter((_, i) => i !== index));
  };

  const triggerUpload = (sceneId: string) => {
    setUploadingSceneId(sceneId);
    replaceImageInputRef.current?.click();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingSceneId) {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                onUpdateScene(uploadingSceneId, { image_url: event.target.result as string });
            }
            setUploadingSceneId(null);
        };
        reader.readAsDataURL(file);
    } else {
        setUploadingSceneId(null);
    }
    // Reset input
    if (replaceImageInputRef.current) replaceImageInputRef.current.value = '';
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <input 
        type="file" 
        ref={replaceImageInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleImageUpload} 
      />

      <div className="flex justify-between items-center mb-2">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Storyboard Scenes</h3>
          <p className="text-sm text-slate-500">Customize visuals for each timed segment.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setIsSettingsOpen(true)}>
                <SettingsIcon className="w-4 h-4 mr-2" />
                Settings
            </Button>
            <Button variant="outline" size="sm" onClick={() => scenes.forEach(s => !s.image_url && handleGenerateImage(s))}>
                <Wand2 className="w-4 h-4 mr-2" />
                Auto-Generate Images
            </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4 pb-10">
        {scenes.map((scene, index) => (
          <div key={scene.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex gap-6 group hover:border-indigo-300 transition-all">
            {/* Index/Grip */}
            <div className="flex flex-col items-center gap-2 pt-2 text-slate-400">
                <span className="font-mono text-sm font-bold bg-slate-100 w-6 h-6 rounded flex items-center justify-center">{index + 1}</span>
                <GripVertical className="w-5 h-5 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Content */}
            <div className="flex-1 space-y-4">
               <div className="flex items-start justify-between gap-4">
                   <div className="flex-1">
                       <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Narration</label>
                          <div className="flex items-center gap-2">
                              {scene.audio_url && (
                                  <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center border border-green-100">
                                      <CheckCircle2 className="w-3 h-3 mr-1" /> Mixed
                                  </span>
                              )}
                              <span className="flex items-center text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {scene.duration || 5}s
                              </span>
                          </div>
                       </div>
                       
                       {/* Script Display */}
                       <p className="text-slate-900 text-sm leading-relaxed p-2 bg-slate-50 rounded border border-slate-100 mb-2">
                           {scene.text_segment}
                       </p>

                       {/* Audio Controls */}
                       <div className="flex gap-2">
                           {scene.audio_url && (
                               <Button 
                                    size="sm" 
                                    variant="secondary"
                                    onClick={() => playSceneAudio(scene)}
                                    className="text-xs"
                               >
                                   {playingAudioId === scene.id ? (
                                     <>
                                        <Pause className="w-3.5 h-3.5 fill-current mr-2" />
                                        Pause Audio
                                     </>
                                   ) : (
                                     <>
                                        <Play className="w-3.5 h-3.5 fill-current mr-2" />
                                        Play Audio
                                     </>
                                   )}
                               </Button>
                           )}
                       </div>
                   </div>
               </div>

               <div>
                   <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Visual Prompt</label>
                   <div className="flex gap-2">
                       <input 
                           type="text" 
                           className="flex-1 text-sm border border-slate-200 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                           value={scene.visual_prompt}
                           onChange={(e) => onUpdateScene(scene.id, { visual_prompt: e.target.value })}
                       />
                       <Button 
                           size="sm" 
                           variant="secondary" 
                           onClick={() => handleGenerateImage(scene)}
                           disabled={generatingId === scene.id}
                        >
                           {generatingId === scene.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                       </Button>
                   </div>
               </div>
            </div>

            {/* Visual Preview */}
            <div className="w-48 aspect-video bg-slate-100 rounded-lg border border-slate-200 overflow-hidden relative shrink-0 group/image">
                {scene.image_url ? (
                    <>
                        <img src={scene.image_url} alt="Scene visual" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center gap-1.5 px-2">
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                className="h-7 w-7 p-0" 
                                onClick={() => setEditingScene(scene)} 
                                title="Edit / Add Elements"
                            >
                                <Wand2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                className="h-7 w-7 p-0" 
                                onClick={() => triggerUpload(scene.id)} 
                                title="Replace with Upload"
                            >
                                <Upload className="w-3.5 h-3.5" />
                            </Button>
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                className="h-7 w-7 p-0" 
                                onClick={() => handleGenerateImage(scene)} 
                                title="Regenerate"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                            </Button>
                            <Button 
                                variant="danger" 
                                size="sm" 
                                className="h-7 w-7 p-0" 
                                onClick={() => handleRemoveImage(scene.id)} 
                                title="Remove"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                        {!generatingId && <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1 shadow-sm pointer-events-none group-hover/image:opacity-0 transition-opacity">
                            <CheckCircle2 className="w-3 h-3" />
                        </div>}
                         {generatingId === scene.id && (
                             <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                                 <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                             </div>
                         )}
                    </>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                        {generatingId === scene.id ? (
                            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-2"></div>
                        ) : (
                            <>
                                <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                                <span className="text-xs">No Image</span>
                                <div className="flex gap-2 mt-2">
                                    <Button size="sm" variant="ghost" className="text-xs px-2 h-7" onClick={() => handleGenerateImage(scene)}>Generate</Button>
                                    <Button size="sm" variant="ghost" className="text-xs px-2 h-7" onClick={() => triggerUpload(scene.id)}>Upload</Button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
          </div>
        ))}
      </div>

      {/* Generation Settings Modal */}
      <Modal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        title="Image Generation Settings"
        footer={<Button onClick={() => setIsSettingsOpen(false)}>Done</Button>}
      >
          <div className="space-y-4">
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
                  <select 
                    className="w-full border border-slate-300 rounded-md p-2 text-sm"
                    value={genConfig.model}
                    onChange={(e) => setGenConfig(prev => ({ ...prev, model: e.target.value as any }))}
                  >
                      <option value="gemini-2.5-flash-image">Gemini 2.5 Flash (Fast)</option>
                      <option value="gemini-3-pro-image-preview">Gemini 3 Pro (High Quality)</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                      {genConfig.model === 'gemini-2.5-flash-image' 
                        ? 'Optimized for speed and efficiency.' 
                        : 'Designed for professional asset production, supports 2K/4K and Grounding.'}
                  </p>
              </div>

              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Aspect Ratio</label>
                  <select 
                    className="w-full border border-slate-300 rounded-md p-2 text-sm"
                    value={genConfig.aspectRatio}
                    onChange={(e) => setGenConfig(prev => ({ ...prev, aspectRatio: e.target.value }))}
                  >
                      {['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'].map(r => (
                          <option key={r} value={r}>{r}</option>
                      ))}
                  </select>
              </div>

              {genConfig.model === 'gemini-3-pro-image-preview' && (
                  <>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Resolution</label>
                        <select 
                            className="w-full border border-slate-300 rounded-md p-2 text-sm"
                            value={genConfig.imageSize}
                            onChange={(e) => setGenConfig(prev => ({ ...prev, imageSize: e.target.value }))}
                        >
                            <option value="1K">1K (Standard)</option>
                            <option value="2K">2K (High)</option>
                            <option value="4K">4K (Ultra)</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                        <input 
                            type="checkbox" 
                            id="grounding"
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                            checked={genConfig.useGrounding}
                            onChange={(e) => setGenConfig(prev => ({ ...prev, useGrounding: e.target.checked }))}
                        />
                        <label htmlFor="grounding" className="text-sm font-medium text-slate-700">Enable Google Search Grounding</label>
                    </div>
                    <p className="text-xs text-slate-500">
                        Grounding allows the model to use real-world data (e.g., weather, stocks) if mentioned in the prompt.
                    </p>
                  </>
              )}
          </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingScene} onClose={closeEditModal} title="Edit Image / Add Elements (Nano Banana Pro)">
          <div className="space-y-4">
              <div className="flex gap-4">
                  <div className="w-2/3 space-y-4">
                        <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-200 relative">
                            {editingScene?.image_url && <img src={editingScene.image_url} className="w-full h-full object-contain" alt="Editing target" />}
                        </div>
                  </div>
                  <div className="w-1/3 flex flex-col gap-4">
                      <div className="flex-1 bg-slate-50 border border-slate-200 border-dashed rounded-lg p-3 flex flex-col">
                          <div className="flex justify-between items-center mb-3">
                              <span className="text-xs text-slate-600 font-medium">Reference Elements ({elementFiles.length}/5)</span>
                              <Button 
                                size="sm" 
                                variant="secondary" 
                                onClick={() => elementInputRef.current?.click()}
                                disabled={elementFiles.length >= 5}
                                className="h-6 text-xs"
                              >
                                  <Plus className="w-3 h-3 mr-1" /> Add
                              </Button>
                          </div>
                          
                          <input 
                            type="file" 
                            accept="image/*" 
                            multiple
                            className="hidden" 
                            ref={elementInputRef}
                            onChange={handleFileSelect}
                          />
                          
                          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                              {elementFiles.length === 0 ? (
                                  <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 opacity-60">
                                      <Upload className="w-6 h-6" />
                                      <span className="text-xs text-center">No images added</span>
                                  </div>
                              ) : (
                                  <div className="grid grid-cols-2 gap-2">
                                    {elementFiles.map((file, idx) => (
                                        <div key={idx} className="relative aspect-square bg-slate-200 rounded overflow-hidden group border border-slate-200">
                                            <img src={URL.createObjectURL(file)} alt="Element" className="w-full h-full object-cover" />
                                            <button 
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => removeFile(idx)}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
              </div>
              
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Instruction</label>
                  <textarea 
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    rows={3}
                    placeholder="Describe what to add or change. E.g. 'Add this logo to the wall', 'Place this character in the foreground'..."
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Using <strong>Nano Banana Pro</strong> (Gemini 3 Pro Image). Provide a reference image to add specific elements.
                  </p>
              </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={closeEditModal}>Cancel</Button>
              <Button onClick={handleEditConfirm} isLoading={isEditing} disabled={!editPrompt.trim()}>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Apply Changes
              </Button>
          </div>
      </Modal>
    </div>
  );
};