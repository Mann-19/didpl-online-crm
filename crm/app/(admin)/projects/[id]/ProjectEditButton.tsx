'use client';

import { useState, useTransition } from 'react';
import { Edit2, X, Save } from 'lucide-react';
import { updateProject } from '../../projects.actions';

interface Props {
  project: {
    id: string;
    name: string;
    location?: string;
    description?: string;
    total_area_sqyd?: number;
  };
}

export default function ProjectEditButton({ project }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: project.name || '',
    location: project.location || '',
    description: project.description || '',
    total_area_sqyd: String(project.total_area_sqyd || ''),
  });
  const [error, setError] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      try {
        await updateProject(project.id, {
          name: form.name,
          location: form.location,
          description: form.description,
          total_area_sqyd: parseFloat(form.total_area_sqyd) || null,
        });
        setShowModal(false);
        window.location.reload();
      } catch (err: any) {
        setError(err?.message || 'Failed to update project');
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
      >
        <Edit2 className="w-4 h-4" /> Edit Project
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Edit Project</h3>
                <p className="text-sm text-gray-500">Update project information</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>
              )}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Project Name *</label>
                <input
                  required
                  className="p-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-violet-500 outline-none"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Location</label>
                <input
                  className="p-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-violet-500 outline-none"
                  value={form.location}
                  onChange={e => setForm({ ...form, location: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Total Area (sq.yd)</label>
                <input
                  type="number"
                  className="p-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-violet-500 outline-none"
                  value={form.total_area_sqyd}
                  onChange={e => setForm({ ...form, total_area_sqyd: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Description</label>
                <textarea
                  rows={3}
                  className="p-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-violet-500 outline-none resize-none"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={isPending}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50">
                  <Save className="w-4 h-4" />
                  {isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
