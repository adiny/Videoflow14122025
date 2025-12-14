import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileVideo, Wand2, Scissors, AlignLeft, AlertCircle, FileText, LayoutTemplate, PenLine, Trash2, RefreshCw, Youtube, ExternalLink } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { transcribeVideo, rewriteScript } from '../../services/mockAi';

interface IngestionPhaseProps {
  script: string;
  onScriptChange: (script: string) => void;
  originalScript: string;
  onOriginalScriptChange: (script: string) => void;
  videoUrl?: string;
  onVideoUpload: (url: string) => void;
  isTranscribing: boolean;
  setIsTranscribing: (loading: boolean) => void;
}

export const IngestionPhase: React.FC<IngestionPhaseProps> = ({
  script,
  onScriptChange,
  originalScript,
  onOriginalScriptChange,
  videoUrl,
  onVideoUpload,
  isTranscribing,
  setIsTranscribing
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'split'>('edit');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  
  // Input mode: 'file' | 'youtube'
  const [inputType, setInputType] = useState<'file' | 'youtube'>('file');
  const [youtubeInput, setYoutubeInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rewrite Modal State
  const [showRewriteModal, setShowRewriteModal] = useState(false);
  const [rewriteInstruction, setRewriteInstruction] = useState('');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto-switch to split view when original script becomes available
  useEffect(() => {
    if (originalScript && !manualMode) {
      setViewMode('split');
    }
  }, [originalScript, manualMode]);

  const getYoutubeId = (url: string) => {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? match[2] : null;
  };

  // Check if current videoUrl is a YouTube embed
  const isYoutube = videoUrl ? (videoUrl.includes('youtube') || videoUrl.includes('youtu.be')) : false;
  const currentVideoId = isYoutube && videoUrl ? getYoutubeId(videoUrl) : null;

  const handleFile = async (file: File) => {
    if (!file) return;

    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }

    setSelectedFile(file);
    setInputType('file');

    if (file.size < 4 * 1024 * 1024) { 
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            onVideoUpload(result);
        };
        reader.readAsDataURL(file);
    } else {
        const url = URL.createObjectURL(file);
        onVideoUpload(url);
    }
  };

  const loadYoutube = () => {
      if (!youtubeInput) return;
      
      const videoId = getYoutubeId(youtubeInput);

      if (videoId) {
          const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
          onVideoUpload(watchUrl);
          setSelectedFile(null);
      } else {
          alert("Invalid YouTube URL");
      }
  };

  const handleTranscribe = async () => {
    setIsTranscribing(true);
    try {
      let text = '';
      
      if (isYoutube && videoUrl) {
          // Pass the URL to the mocked service
          // We need to extract the ID again to ensure the backend gets a clean "watch" URL if we passed an embed URL
          const id = getYoutubeId(videoUrl);
          const cleanUrl = id ? `https://www.youtube.com/watch?v=${id}` : videoUrl;
          text = await transcribeVideo(cleanUrl);
      } else {
          let fileToProcess = selectedFile;
          // If we have a URL but no file object (e.g. restored session), try to fetch blob
          if (!fileToProcess && videoUrl && !isYoutube) {
              try {
                  const res = await fetch(videoUrl);
                  const blob = await res.blob();
                  fileToProcess = new File([blob], "uploaded_video.mp4", { type: blob.type });
              } catch (e) {
                  console.error("Failed to recover file from URL", e);
              }
          }

          if (fileToProcess) {
             text = await transcribeVideo(fileToProcess);
          }
      }
      
      if (text) {
          onOriginalScriptChange(text);
          onScriptChange(text);
          setManualMode(false);
      }
    } catch (err) {
      console.error("Transcription failed", err);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const executeRewrite = async (instruction?: string) => {
    setIsRewriting(true);
    setShowRewriteModal(false);
    try {
      const newText = await rewriteScript(script, instruction || rewriteInstruction);
      onScriptChange(newText);
    } finally {
      setIsRewriting(false);
    }
  };

  const startManualMode = () => {
      setManualMode(true);
      if (!script) onScriptChange(' ');
  };

  const handleRemoveFile = () => {
      onVideoUpload('');
      setSelectedFile(null);
      setYoutubeInput('');
      setIsTranscribing(false);
      if (fileInputRef.current) {
          fileInputRef.current.value = '';
      }
  };

  const getWatchUrl = (url: string) => {
      const id = getYoutubeId(url);
      if (id) return `https://www.youtube.com/watch?v=${id}`;
      return url;
  }

  // Generate robust embed URL for Error 153 mitigation
  // The origin param is CRITICAL for security/playback handshakes
  // The 'enablejsapi=1' allows control via JS if needed later
  const origin = isMounted ? window.location.origin : '';
  const iframeSrc = isYoutube && currentVideoId && isMounted
    ? `https://www.youtube.com/embed/${currentVideoId}?enablejsapi=1&origin=${origin}&rel=0`
    : '';

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6">
      <input 
        ref={fileInputRef}
        type="file" 
        className="hidden" 
        accept="video/*"
        onChange={(e) => e.target.files && handleFile(e.target.files[0])}
      />

      {/* Left Pane: Uploader/Player */}
      <div className="w-full lg:w-5/12 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex-1 flex flex-col">
          <h3 className="text-lg font-semibold mb-4 text-slate-900 flex items-center justify-between">
            <span className="flex items-center">
                {isYoutube ? <Youtube className="w-5 h-5 mr-2 text-red-600" /> : <FileVideo className="w-5 h-5 mr-2 text-indigo-600" />}
                Source Video
            </span>
            {videoUrl && (
                <Button variant="ghost" size="sm" onClick={handleRemoveFile} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2">
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Remove
                </Button>
            )}
          </h3>
          
          {!videoUrl ? (
             <div className="flex-1 flex flex-col">
                 <div className="flex p-1 bg-slate-100 rounded-lg mb-4">
                     <button 
                        onClick={() => setInputType('file')}
                        className={`flex-1 flex items-center justify-center py-2 text-sm font-medium rounded-md transition-colors ${inputType === 'file' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                     >
                         <UploadCloud className="w-4 h-4 mr-2" /> Upload File
                     </button>
                     <button 
                        onClick={() => setInputType('youtube')}
                        className={`flex-1 flex items-center justify-center py-2 text-sm font-medium rounded-md transition-colors ${inputType === 'youtube' ? 'bg-white shadow-sm text-red-600' : 'text-slate-500 hover:text-slate-900'}`}
                     >
                         <Youtube className="w-4 h-4 mr-2" /> YouTube URL
                     </button>
                 </div>
                 
                 {inputType === 'file' ? (
                     <div 
                        className={`flex-1 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-8 transition-colors ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-slate-50'}`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                        <UploadCloud className="w-8 h-8 text-indigo-600" />
                        </div>
                        <p className="text-lg font-medium text-slate-900 mb-1">Drag and drop your video</p>
                        <p className="text-sm text-slate-500 mb-6">MP4, MOV up to 500MB</p>
                        <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                        Select File
                        </Button>
                    </div>
                 ) : (
                     <div className="flex-1 border border-slate-200 rounded-lg bg-slate-50 p-8 flex flex-col items-center justify-center">
                         <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                            <Youtube className="w-8 h-8 text-red-600" />
                         </div>
                         <p className="text-lg font-medium text-slate-900 mb-4">Import from YouTube</p>
                         <div className="flex w-full gap-2">
                             <input 
                                type="text"
                                placeholder="Paste YouTube link here..."
                                className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                                value={youtubeInput}
                                onChange={(e) => setYoutubeInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && loadYoutube()}
                             />
                             <Button onClick={loadYoutube} disabled={!youtubeInput}>Load</Button>
                         </div>
                     </div>
                 )}
             </div>
          ) : (
            <div className="flex-1 flex flex-col">
                <div className="flex-1 bg-black rounded-lg relative overflow-hidden group flex items-center justify-center">
                    {/* Native Iframe with robust origin check and referrer policy to prevent Error 153 */}
                    <div className="w-full h-full relative">
                        {isYoutube && currentVideoId && isMounted ? (
                            <iframe 
                                className="w-full h-full"
                                src={iframeSrc}
                                title="YouTube video player"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                referrerPolicy="strict-origin-when-cross-origin"
                                allowFullScreen
                            ></iframe>
                        ) : (
                             !isYoutube ? <video src={videoUrl} className="w-full h-full object-contain" controls /> : <div className="w-full h-full bg-black flex items-center justify-center text-white/50"><RefreshCw className="animate-spin" /></div>
                        )}
                    </div>
                    
                    {/* Controls Overlay */}
                    <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            className="bg-white/90 hover:bg-white text-slate-900 border-transparent shadow-sm backdrop-blur-sm pointer-events-auto"
                            onClick={handleRemoveFile}
                        >
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                            Replace
                        </Button>
                    </div>
                </div>
                {/* Fallback for playback issues */}
                {isYoutube && (
                    <div className="mt-2 text-center text-xs text-slate-400">
                        <span className="mr-1">Playback error? Video may block embedding.</span>
                        <a 
                            href={getWatchUrl(videoUrl)} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center"
                        >
                            Watch on YouTube <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                    </div>
                )}
            </div>
          )}
        </div>
      </div>

      {/* Right Pane: Script Editor */}
      <div className="w-full lg:w-7/12 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                <AlignLeft className="w-5 h-5 mr-2 text-indigo-600" />
                Script Editor
                </h3>
                {originalScript && (
                    <div className="flex bg-slate-100 p-1 rounded-lg ml-4">
                        <button 
                            onClick={() => setViewMode('edit')}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === 'edit' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            Editor
                        </button>
                        <button 
                            onClick={() => setViewMode('split')}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === 'split' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            Split View
                        </button>
                    </div>
                )}
            </div>
            
            {script && (
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => onScriptChange(originalScript)} title="Revert to original">Original</Button>
                    <Button size="sm" variant="primary" onClick={() => setShowRewriteModal(true)} isLoading={isRewriting}>
                        <Wand2 className="w-4 h-4 mr-2" />
                        AI Rewrite
                    </Button>
                </div>
            )}
          </div>

          <div className="flex-1 relative flex gap-4 overflow-hidden">
            {isTranscribing && (
               <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-20">
                   <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                   <p className="text-slate-600 font-medium animate-pulse">
                       {isYoutube ? "Analyzing video content..." : "Transcribing audio..."}
                   </p>
               </div>
            )}
            
            {(!script && !manualMode && !isTranscribing) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-white/50 z-10">
                    {videoUrl ? (
                         <>
                            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                                {isYoutube ? <Youtube className="w-8 h-8 text-red-600" /> : <FileVideo className="w-8 h-8 text-indigo-500" />}
                            </div>
                            <p className="mb-6 text-slate-600 font-medium text-lg">Video loaded successfully</p>
                            <div className="flex gap-4">
                                <Button onClick={handleTranscribe} size="lg">
                                    <Wand2 className="w-5 h-5 mr-2" />
                                    {isYoutube ? "Get YouTube Script" : "Transcribe Video"}
                                </Button>
                                <Button variant="outline" size="lg" onClick={startManualMode}>
                                    <PenLine className="w-5 h-5 mr-2" />
                                    Write Manually
                                </Button>
                            </div>
                         </>
                    ) : (
                        <>
                            <AlertCircle className="w-10 h-10 mb-3 opacity-50" />
                            <p className="mb-4">Upload a video or use a YouTube link to generate the script.</p>
                            <Button variant="outline" size="sm" onClick={startManualMode}>
                                <PenLine className="w-4 h-4 mr-2" />
                                Write manually
                            </Button>
                        </>
                    )}
                </div>
            )}
            
            {/* Split View: Original Script Column */}
            {viewMode === 'split' && originalScript && (
                <div className="w-1/2 flex flex-col border-r border-slate-100 pr-4">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
                        <FileText className="w-3 h-3 mr-1" /> Original Transcript
                    </label>
                    <div className="flex-1 bg-slate-50 rounded-lg p-3 overflow-y-auto text-sm text-slate-600 leading-relaxed font-mono">
                        {originalScript}
                    </div>
                </div>
            )}

            {/* Editable Script Column */}
            <div className={`${viewMode === 'split' && originalScript ? 'w-1/2' : 'w-full'} flex flex-col`}>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
                     <LayoutTemplate className="w-3 h-3 mr-1" /> New Script
                </label>
                <textarea
                    className="flex-1 w-full p-4 bg-slate-50 border border-slate-200 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm leading-relaxed text-slate-800"
                    value={script}
                    onChange={(e) => onScriptChange(e.target.value)}
                    placeholder="Start typing your script here..."
                    disabled={isTranscribing}
                />
            </div>
          </div>

          {/* Action Footer */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2 overflow-x-auto pb-2">
             <Button variant="secondary" size="sm" disabled={!script || isRewriting} onClick={() => executeRewrite("Make it shorter and more concise while keeping key points.")}>
                 <Scissors className="w-3 h-3 mr-2" />
                 Shorten
             </Button>
             <Button variant="secondary" size="sm" disabled={!script || isRewriting} onClick={() => executeRewrite("Rewrite with a warm, friendly, and approachable tone.")}>
                 <span className="mr-2">😊</span>
                 Friendly Tone
             </Button>
             <Button variant="secondary" size="sm" disabled={!script || isRewriting} onClick={() => executeRewrite("Rewrite with a professional, corporate, and polished tone.")}>
                 <span className="mr-2">👔</span>
                 Professional
             </Button>
          </div>
        </div>
      </div>

      {/* Rewrite Options Modal */}
      <Modal
        isOpen={showRewriteModal}
        onClose={() => setShowRewriteModal(false)}
        title="AI Script Rewrite Options"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowRewriteModal(false)}>Cancel</Button>
            <Button onClick={() => executeRewrite()} isLoading={isRewriting}>Rewrite Script</Button>
          </>
        }
      >
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Instructions for AI</label>
                <textarea 
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    rows={4}
                    placeholder="E.g., Make it funnier, focus on the technical specs, translate to Gen Z slang..."
                    value={rewriteInstruction}
                    onChange={(e) => setRewriteInstruction(e.target.value)}
                />
            </div>
            <div className="text-xs text-slate-500">
                <p>Pro Tip: Be specific about tone, audience, and length constraints for the best results.</p>
            </div>
        </div>
      </Modal>
    </div>
  );
};