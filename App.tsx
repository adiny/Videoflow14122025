import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Editor } from './pages/Editor';
import { AssetsLibrary } from './pages/AssetsLibrary';
import { Project, MOCK_USER } from './types';
import { getAllProjects, saveProjectToDB, deleteProjectFromDB } from './services/db';
import { Loader2 } from 'lucide-react';

// Initial Mock Data
const INITIAL_PROJECTS: Project[] = [
  {
    id: 'p-1',
    user_id: MOCK_USER.id,
    title: 'Q3 Financial Update',
    status: 'completed',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    last_edited_at: new Date(Date.now() - 3600000).toISOString(),
    current_step: 3, // Start at export step
    generated_script: "The third quarter results exceeded expectations...",
    scenes: [
        {
            id: 's1', project_id: 'p-1', order_index: 0, 
            text_segment: "The third quarter results exceeded expectations...",
            visual_prompt: "Growth chart rising",
            image_url: "https://picsum.photos/seed/growth/800/600",
            duration: 5
        }
    ]
  },
  {
    id: 'p-2',
    user_id: MOCK_USER.id,
    title: 'Untitled Project 2',
    status: 'draft',
    created_at: new Date().toISOString(),
    last_edited_at: new Date().toISOString(),
    current_step: 0,
    generated_script: '',
    scenes: []
  }
];

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [currentPath, setCurrentPath] = useState(() => {
     if (typeof window === 'undefined') return '/';
     return localStorage.getItem('videoflow_path') || '/';
  });

  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
     if (typeof window === 'undefined') return null;
     return localStorage.getItem('videoflow_active_project') || null;
  });

  // --- Persistence Effects ---

  // Load from DB on mount
  useEffect(() => {
      const loadData = async () => {
          try {
              const dbProjects = await getAllProjects();
              if (dbProjects.length > 0) {
                  setProjects(dbProjects);
              } else {
                  // If DB is empty, initialize with defaults and save them
                  setProjects(INITIAL_PROJECTS);
                  for (const p of INITIAL_PROJECTS) {
                      await saveProjectToDB(p);
                  }
              }
          } catch (e) {
              console.error("Failed to load projects", e);
              setProjects(INITIAL_PROJECTS);
          } finally {
              setIsLoading(false);
          }
      };
      loadData();
  }, []);

  useEffect(() => {
    localStorage.setItem('videoflow_path', currentPath);
  }, [currentPath]);

  useEffect(() => {
    if (activeProjectId) {
        localStorage.setItem('videoflow_active_project', activeProjectId);
    } else {
        localStorage.removeItem('videoflow_active_project');
    }
  }, [activeProjectId]);

  // --- Handlers ---

  const handleCreateProject = async () => {
    const newProject: Project = {
      id: `p-${Date.now()}`,
      user_id: MOCK_USER.id,
      title: `Untitled Project ${projects.length + 1}`,
      status: 'draft',
      created_at: new Date().toISOString(),
      last_edited_at: new Date().toISOString(),
      current_step: 0,
      generated_script: '',
    };
    
    // Optimistic Update
    setProjects(prev => [newProject, ...prev]);
    setActiveProjectId(newProject.id);
    setCurrentPath(`/editor/${newProject.id}`);
    
    // DB Save
    await saveProjectToDB(newProject);
  };

  const handleImportProject = async (project: Project) => {
      const newProject = { 
          ...project, 
          id: `p-${Date.now()}`,
          title: `${project.title} (Imported)`,
          last_edited_at: new Date().toISOString()
      };
      setProjects(prev => [newProject, ...prev]);
      await saveProjectToDB(newProject);
  };

  const handleOpenProject = (id: string) => {
    setActiveProjectId(id);
    setCurrentPath(`/editor/${id}`);
  };

  const handleDeleteProject = async (id: string) => {
      setProjects(prev => prev.filter(p => p.id !== id));
      if (activeProjectId === id) {
          setActiveProjectId(null);
          setCurrentPath('/');
      }
      await deleteProjectFromDB(id);
  };

  // Improved to handle partial updates and persistent storage
  const handleUpdateProject = async (updatedFields: Partial<Project> & { id: string }) => {
      let updatedProject: Project | undefined;
      
      setProjects(prev => prev.map(p => {
        if (p.id === updatedFields.id) {
            updatedProject = { ...p, ...updatedFields, last_edited_at: new Date().toISOString() };
            return updatedProject;
        }
        return p;
      }));

      // Save the specific updated project to DB
      if (updatedProject) {
          await saveProjectToDB(updatedProject);
      }
  };

  const renderContent = () => {
    if (isLoading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            </div>
        );
    }

    if (currentPath.startsWith('/editor') && activeProjectId) {
      return (
        <Editor 
          projectId={activeProjectId} 
          onBack={() => {
              setCurrentPath('/');
              setActiveProjectId(null);
          }} 
          projects={projects}
          updateProject={handleUpdateProject}
        />
      );
    }
    
    let pageContent;
    switch (currentPath) {
      case '/':
      default:
        pageContent = (
          <Dashboard 
            projects={projects} 
            onCreateProject={handleCreateProject}
            onOpenProject={handleOpenProject}
            onDeleteProject={handleDeleteProject}
            onImportProject={handleImportProject}
            onUpdateProject={handleUpdateProject}
          />
        );
        break;
      case '/templates':
          pageContent = <div className="p-8">Templates (Coming Soon)</div>;
          break;
      case '/assets':
          pageContent = <AssetsLibrary projects={projects} />;
          break;
      case '/settings':
          pageContent = <div className="p-8">Settings (Coming Soon)</div>;
          break;
    }

    return (
      <Layout activePath={currentPath} onNavigate={(path) => {
          setCurrentPath(path);
          if (path !== '/' && !path.startsWith('/editor')) {
              setActiveProjectId(null);
          }
      }}>
        {pageContent}
      </Layout>
    );
  };

  return (
    <>
      {renderContent()}
    </>
  );
};

export default App;