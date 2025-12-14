import React, { useState } from 'react';
import { Image as ImageIcon, Video, Music, Download, Search, Filter, Calendar } from 'lucide-react';
import { Project } from '../types';
import { Button } from '../components/ui/Button';

interface AssetsLibraryProps {
  projects: Project[];
}

interface Asset {
    id: string;
    type: 'image' | 'video' | 'audio';
    url: string;
    name: string;
    projectTitle: string;
    date: string;
}

export const AssetsLibrary: React.FC<AssetsLibraryProps> = ({ projects }) => {
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video' | 'audio'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract all assets from all projects
  const allAssets: Asset[] = projects.flatMap(p => {
    const projectAssets: Asset[] = [];
    
    // 1. Original Source Video
    if (p.original_video_url) {
        projectAssets.push({
            id: `${p.id}-source`,
            type: 'video',
            url: p.original_video_url,
            name: 'Source Video Upload',
            projectTitle: p.title,
            date: p.created_at
        });
    }

    // 2. Generated Scenes (Images, Videos, & Audio)
    if (p.scenes) {
        p.scenes.forEach((s, idx) => {
            if (s.image_url) {
                projectAssets.push({
                    id: `${s.id}-img`,
                    type: 'image',
                    url: s.image_url,
                    name: `Scene ${idx + 1} Image`,
                    projectTitle: p.title,
                    date: p.last_edited_at // Approximate
                });
            }
            if (s.video_url) {
                projectAssets.push({
                    id: `${s.id}-vid`,
                    type: 'video',
                    url: s.video_url,
                    name: `Scene ${idx + 1} Veo Video`,
                    projectTitle: p.title,
                    date: p.last_edited_at
                });
            }
            if (s.audio_url) {
                projectAssets.push({
                    id: `${s.id}-audio`,
                    type: 'audio',
                    url: s.audio_url,
                    name: `Scene ${idx + 1} Audio Mix`,
                    projectTitle: p.title,
                    date: p.last_edited_at
                });
            }
        });
    }

    // 3. Audio Tracks (Legacy or full tracks)
    if (p.audio_tracks) {
        p.audio_tracks.forEach(t => {
            projectAssets.push({
                id: t.id,
                type: 'audio',
                url: t.file_url,
                name: `${t.language_name} (${t.voice_id})`,
                projectTitle: p.title,
                date: new Date(t.created_at).toISOString()
            });
        });
    }

    return projectAssets;
  });

  // Sort by date (newest first)
  allAssets.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredAssets = allAssets.filter(asset => {
      const matchesType = filterType === 'all' || asset.type === filterType;
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = asset.name.toLowerCase().includes(searchLower) || 
                            asset.projectTitle.toLowerCase().includes(searchLower);
      return matchesType && matchesSearch;
  });

  const handleDownload = (asset: Asset) => {
      const a = document.createElement('a');
      a.href = asset.url;
      // Extract extension or default
      let ext = '';
      if (asset.type === 'image') ext = 'png';
      else if (asset.type === 'video') ext = 'mp4';
      else if (asset.type === 'audio') ext = 'wav';
      
      a.download = `${asset.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assets Library</h1>
          <p className="text-slate-500">Manage all media generated across your projects.</p>
        </div>
        
        <div className="flex gap-2">
            <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input 
                    type="text" 
                    placeholder="Search assets..." 
                    className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['all', 'image', 'video', 'audio'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type as any)}
                className={`px-4 py-2 rounded-full text-sm font-medium capitalize flex items-center gap-2 transition-colors ${
                    filterType === type 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                  {type === 'image' && <ImageIcon className="w-4 h-4" />}
                  {type === 'video' && <Video className="w-4 h-4" />}
                  {type === 'audio' && <Music className="w-4 h-4" />}
                  {type === 'all' && <Filter className="w-4 h-4" />}
                  {type}s
              </button>
          ))}
      </div>

      {/* Grid */}
      {filteredAssets.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <Search className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg font-medium">No assets found</p>
              <p className="text-sm">Try generating content in your projects first.</p>
          </div>
      ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-10">
              {filteredAssets.map((asset) => (
                  <div key={asset.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden group shadow-sm hover:shadow-md transition-all flex flex-col">
                      <div className="aspect-video bg-slate-100 relative overflow-hidden flex items-center justify-center">
                          {asset.type === 'image' && (
                              <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                          )}
                          {asset.type === 'video' && (
                              <video src={asset.url} className="w-full h-full object-cover" />
                          )}
                          {asset.type === 'audio' && (
                              <div className="w-full h-full flex items-center justify-center bg-indigo-50">
                                  <Music className="w-12 h-12 text-indigo-300" />
                              </div>
                          )}

                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <Button variant="secondary" size="sm" onClick={() => handleDownload(asset)}>
                                  <Download className="w-4 h-4" />
                              </Button>
                          </div>
                          
                          {/* Type Badge */}
                          <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full uppercase font-semibold backdrop-blur-sm flex items-center gap-1">
                                {asset.type === 'video' && <Video className="w-3 h-3" />}
                                {asset.type === 'image' && <ImageIcon className="w-3 h-3" />}
                                {asset.type === 'audio' && <Music className="w-3 h-3" />}
                                {asset.type}
                          </div>
                      </div>
                      
                      <div className="p-3 flex-1 flex flex-col">
                          <h4 className="font-medium text-slate-900 text-sm truncate" title={asset.name}>{asset.name}</h4>
                          <p className="text-xs text-slate-500 truncate mb-2">{asset.projectTitle}</p>
                          <div className="mt-auto pt-2 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400">
                              <span className="flex items-center">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {new Date(asset.date).toLocaleDateString()}
                              </span>
                          </div>
                      </div>
                  </div>
              ))}
          </div>
      )}
    </div>
  );
};