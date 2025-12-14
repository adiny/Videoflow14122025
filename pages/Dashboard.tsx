import React, { useState, useRef, useEffect } from 'react';
import { Plus, Video, Clock, Zap, Trash2, Calendar, AlertTriangle, Download, Upload, Edit2, Check, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Project, MOCK_USER } from '../types';

interface DashboardProps {
  projects: Project[];
  onCreateProject: () => void;
  onOpenProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onImportProject: (project: Project) => void;
  onUpdateProject: (project: Partial<Project> & { id: string }) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ projects, onCreateProject, onOpenProject, onDeleteProject, onImportProject, onUpdateProject }) => {
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDeleteClick = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation(); // Prevent opening the project
    setProjectToDelete(projectId);
  };

  const confirmDelete = () => {
    if (projectToDelete) {
      onDeleteProject(projectToDelete);
      setProjectToDelete(null);
    }
  };

  const cancelDelete = () => {
    setProjectToDelete(null);
  };

  const handleExport = (e: React.MouseEvent, project: Project) => {
      e.stopPropagation();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `${project.title.replace(/\s+/g, '_')}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              if (json && json.title) { // Basic validation
                   onImportProject(json);
              } else {
                  alert("Invalid project file");
              }
          } catch (err) {
              console.error("Failed to parse project file", err);
              alert("Failed to load project file");
          }
      };
      reader.readAsText(file);
      // Reset
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Renaming Handlers
  const startEditing = (e: React.MouseEvent, project: Project) => {
      e.stopPropagation();
      setEditingId(project.id);
      setEditTitle(project.title);
  };

  const saveEdit = (e: React.MouseEvent | React.KeyboardEvent | React.FocusEvent) => {
      e.stopPropagation();
      if (editingId && editTitle.trim()) {
          onUpdateProject({ id: editingId, title: editTitle });
      }
      setEditingId(null);
  };

  const cancelEdit = (e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingId(null);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".json" 
        onChange={handleFileChange} 
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, {MOCK_USER.full_name.split(' ')[0]}</h1>
          <p className="text-slate-500">Here's what's happening with your video projects today.</p>
        </div>
        <div className="flex gap-2">
            <Button onClick={handleImportClick} variant="secondary" className="shadow-sm">
                <Upload className="w-4 h-4 mr-2" />
                Import
            </Button>
            <Button onClick={onCreateProject} size="lg" className="shadow-indigo-200 shadow-lg">
                <Plus className="w-5 h-5 mr-2" />
                New Project
            </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Active Projects', value: projects.length.toString(), icon: Video, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Videos Created', value: '12', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Available Credits', value: MOCK_USER.credits.toString(), icon: Clock, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className={`p-3 rounded-lg ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Projects Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Recent Projects</h2>
        
        {projects.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
            <div className="mx-auto w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
              <Video className="w-8 h-8 text-indigo-500" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">No projects yet</h3>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">Get started by uploading your first video and let our AI do the magic.</p>
            <Button onClick={onCreateProject} variant="outline">Create your first video</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div 
                key={project.id} 
                onClick={() => onOpenProject(project.id)}
                className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col"
              >
                <div className="h-40 bg-slate-100 relative">
                   {project.scenes && project.scenes[0]?.image_url ? (
                       <img src={project.scenes[0].image_url} className="w-full h-full object-cover" alt="thumbnail" />
                   ) : (
                       <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-300">
                           <Video className="w-12 h-12" />
                       </div>
                   )}
                   <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-medium uppercase tracking-wider text-slate-700 border border-slate-200 shadow-sm">
                     {project.status}
                   </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2 h-8">
                    {editingId === project.id ? (
                        <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                            <input 
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && saveEdit(e)}
                                className="flex-1 text-sm border border-indigo-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none"
                                autoFocus
                            />
                            <button onClick={saveEdit} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-4 h-4" /></button>
                            <button onClick={cancelEdit} className="p-1 text-slate-400 hover:bg-slate-50 rounded"><X className="w-4 h-4" /></button>
                        </div>
                    ) : (
                        <>
                            <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 flex-1" title={project.title}>
                            {project.title}
                            </h3>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={(e) => startEditing(e, project)}
                                    className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-full transition-all"
                                    title="Rename Project"
                                >
                                <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={(e) => handleExport(e, project)}
                                    className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-full transition-all"
                                    title="Export / Save Project"
                                >
                                <Download className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={(e) => handleDeleteClick(e, project.id)}
                                    className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-full transition-all"
                                    title="Delete Project"
                                >
                                <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">
                    {project.generated_script || "No script generated yet..."}
                  </p>
                  <div className="flex items-center text-xs text-slate-400 pt-4 border-t border-slate-50">
                    <Calendar className="w-3.5 h-3.5 mr-1.5" />
                    Last edited {new Date(project.last_edited_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!projectToDelete}
        onClose={cancelDelete}
        title="Delete Project?"
        footer={
          <>
            <Button variant="secondary" onClick={cancelDelete}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete}>Delete Project</Button>
          </>
        }
      >
        <div className="flex items-start space-x-4">
            <div className="bg-red-100 p-2 rounded-full shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
                <p className="text-slate-600">
                    Are you sure you want to delete this project? This action cannot be undone and all associated scripts, audio, and videos will be permanently removed.
                </p>
                <p className="text-xs text-slate-500 mt-2">
                    Tip: Export the project before deleting if you want to save a backup.
                </p>
            </div>
        </div>
      </Modal>
    </div>
  );
};