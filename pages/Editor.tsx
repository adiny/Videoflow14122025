import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, ChevronRight, Save, Loader2, Edit2 } from 'lucide-react';
import { Project, Scene, AudioTrack } from '../types';
import { Button } from '../components/ui/Button';
import { IngestionPhase } from '../components/editor/IngestionPhase';
import { AudioPhase } from '../components/editor/AudioPhase';
import { StoryboardPhase } from '../components/editor/StoryboardPhase';
import { AssemblyPhase } from '../components/editor/AssemblyPhase';
import { parseScriptToScenes } from '../services/mockAi';

interface EditorProps {
  projectId: string;
  onBack: () => void;
  projects: Project[];
  updateProject: (project: Partial<Project> & { id: string }) => void;
}

const STEPS = [
  { id: 'ingestion', label: 'Script' },
  { id: 'audio', label: 'Voice & Audio' },
  { id: 'storyboard', label: 'Visuals' },
  { id: 'assembly', label: 'Export' },
];

export const Editor: React.FC<EditorProps> = ({ projectId, onBack, projects, updateProject }) => {
  const projectIndex = projects.findIndex(p => p.id === projectId);
  const project = projects[projectIndex];
  
  // Initialize from project state or default to 0
  const [currentStep, setCurrentStep] = useState(project?.current_step || 0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Rename state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');

  useEffect(() => {
      if (project) setTitleInput(project.title);
  }, [project?.title]);

  // If project not found
  if (!project) return <div>Project not found</div>;

  const handleNext = () => {
    let nextStep = currentStep;
    if (currentStep === 0) {
        // Transition from Script to Audio: Ensure scenes are generated if not present
        if (!project.scenes || project.scenes.length === 0) {
            if (project.generated_script) {
                const newScenes = parseScriptToScenes(project.generated_script);
                newScenes.forEach(s => s.project_id = project.id);
                updateProject({ id: project.id, scenes: newScenes });
            }
        }
    }
    
    if (currentStep < STEPS.length - 1) {
      nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      // Auto-save the step
      updateProject({ id: project.id, current_step: nextStep });
    }
  };

  const handleBackStep = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      // Auto-save the step
      updateProject({ id: project.id, current_step: prevStep });
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    // Simulate API delay
    setTimeout(() => {
        updateProject({ 
            id: project.id, 
            current_step: currentStep,
            // Update last_edited_at implicitly via updateProject in parent or explicit here if needed
        });
        setIsSaving(false);
    }, 800);
  };

  const handleTitleSave = () => {
      if (titleInput.trim() && titleInput !== project.title) {
          updateProject({ id: project.id, title: titleInput });
      }
      setIsEditingTitle(false);
  };

  const handleUpdateScript = (text: string) => {
      updateProject({ id: project.id, generated_script: text });
  };
  
  const handleUpdateOriginalScript = (text: string) => {
      updateProject({ id: project.id, original_script: text });
  };

  const handleVideoUpload = (url: string) => {
      updateProject({ id: project.id, original_video_url: url });
  };

  const handleVoiceSelect = (id: string) => {
      updateProject({ id: project.id, selected_voice_id: id });
  };

  const handleUpdateScene = (sceneId: string, updates: Partial<Scene>) => {
      const updatedScenes = project.scenes?.map(s => s.id === sceneId ? { ...s, ...updates } : s) || [];
      updateProject({ id: project.id, scenes: updatedScenes });
  };

  const canProceed = () => {
      if (currentStep === 0) return (!!project.generated_script && project.generated_script.trim().length > 0) && !isTranscribing;
      if (currentStep === 1) return (project.scenes?.every(s => !!s.audio_url) || false);
      if (currentStep === 2) return (project.scenes?.length || 0) > 0;
      return true;
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 h-16">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-5 h-5 mr-1" /> Back
          </Button>
          <div className="h-6 w-px bg-slate-200 mx-2"></div>
          
          {/* Editable Title */}
          {isEditingTitle ? (
              <input 
                type="text" 
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                autoFocus
                className="font-semibold text-slate-900 border border-indigo-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-xs"
              />
          ) : (
            <div 
                className="flex items-center gap-2 group cursor-pointer hover:bg-slate-50 p-1 rounded -ml-1"
                onClick={() => setIsEditingTitle(true)}
                title="Click to rename"
            >
                <h2 className="font-semibold text-slate-900 truncate max-w-xs">{project.title}</h2>
                <Edit2 className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}

          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-xs font-medium text-slate-600 border border-slate-200">
             {project.status}
          </span>
        </div>

        {/* Stepper */}
        <div className="flex items-center space-x-2">
           {STEPS.map((step, idx) => {
               const isActive = idx === currentStep;
               const isCompleted = idx < currentStep;
               return (
                   <div key={step.id} className="flex items-center">
                       <div 
                         className={`flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                             isActive ? 'bg-indigo-600 text-white shadow-sm' : 
                             isCompleted ? 'bg-indigo-50 text-indigo-700' : 'text-slate-400'
                         }`}
                       >
                           {isCompleted ? <Check className="w-4 h-4 mr-1.5" /> : <span className="mr-2 opacity-80">{idx + 1}</span>}
                           {step.label}
                       </div>
                       {idx < STEPS.length - 1 && <div className={`w-8 h-0.5 mx-2 ${idx < currentStep ? 'bg-indigo-200' : 'bg-slate-200'}`}></div>}
                   </div>
               )
           })}
        </div>

        <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save
            </Button>
            <div className="h-6 w-px bg-slate-200 mx-2"></div>
            <Button variant="secondary" onClick={handleBackStep} disabled={currentStep === 0} className={currentStep === 0 ? 'invisible' : ''}>
                Back
            </Button>
            
            {/* Audio Step Skip Option */}
            {currentStep === 1 && (
                <Button variant="ghost" onClick={handleNext} className="text-slate-500 hover:text-slate-900">
                   Skip
                </Button>
            )}

            <Button onClick={handleNext} disabled={!canProceed()}>
                {currentStep === STEPS.length - 1 ? 'Finish' : 'Next'}
                <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden p-6">
         <div className="h-full max-w-7xl mx-auto">
             {currentStep === 0 && (
                 <IngestionPhase 
                    script={project.generated_script || ''} 
                    onScriptChange={handleUpdateScript}
                    originalScript={project.original_script || ''}
                    onOriginalScriptChange={handleUpdateOriginalScript}
                    videoUrl={project.original_video_url}
                    onVideoUpload={handleVideoUpload}
                    isTranscribing={isTranscribing}
                    setIsTranscribing={setIsTranscribing}
                 />
             )}
             {currentStep === 1 && (
                 <AudioPhase 
                    selectedVoiceId={project.selected_voice_id}
                    onVoiceSelect={handleVoiceSelect}
                    scenes={project.scenes || []}
                    onUpdateScene={handleUpdateScene}
                 />
             )}
             {currentStep === 2 && (
                 <StoryboardPhase 
                    scenes={project.scenes || []}
                    onUpdateScene={handleUpdateScene}
                 />
             )}
             {currentStep === 3 && (
                 <AssemblyPhase 
                    scenes={project.scenes || []}
                    onUpdateScene={handleUpdateScene}
                 />
             )}
         </div>
      </div>
    </div>
  );
};