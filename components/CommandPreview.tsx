import React, { useState, useEffect } from 'react';
import { ParsedIssue } from '../types';
import { Copy, Check, Edit2, Disc } from 'lucide-react';

interface CommandPreviewProps {
  issue: ParsedIssue;
  onUpdate: (updatedIssue: ParsedIssue) => void;
  onDelete: (id: string) => void;
}

export const CommandPreview: React.FC<CommandPreviewProps> = ({ issue, onUpdate, onDelete }) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Local state for editing before committing changes
  const [editedIssue, setEditedIssue] = useState(issue);

  useEffect(() => {
    setEditedIssue(issue);
  }, [issue]);

  const generateCommand = (i: ParsedIssue) => {
    // Escape double quotes for shell safety
    const safeTitle = i.title.replace(/"/g, '\\"');
    const safeBody = i.body.replace(/"/g, '\\"').replace(/`/g, '\\`');
    
    // Construct labels string
    const labelsStr = i.labels.map(l => `--label "${l}"`).join(' ');

    return `gh issue create --title "${safeTitle}" --body "${safeBody}" ${labelsStr}`;
  };

  const handleCopy = async () => {
    const command = generateCommand(editedIssue);
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveEdits = () => {
    onUpdate(editedIssue);
    setIsEditing(false);
  };

  const getLabelStyle = (label: string) => {
    const lower = label.toLowerCase();
    if (lower.includes('bug')) {
      return 'bg-red-100 text-red-700 border-red-200';
    }
    if (lower.includes('enhancement') || lower.includes('feature')) {
      return 'bg-blue-100 text-blue-700 border-blue-200';
    }
    return 'bg-gray-100 text-gray-600 border-gray-200';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-6 transition-all hover:shadow-md">
      
      {/* Header / Meta */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="p-1.5 rounded-md bg-white shadow-sm border border-gray-200 text-brand-600">
            <Disc size={16} />
          </div>
          
          <div className="flex flex-wrap gap-1">
            {editedIssue.labels.length > 0 ? (
              editedIssue.labels.map((label, idx) => (
                <span key={idx} className={`text-xs px-2 py-0.5 rounded-full border ${getLabelStyle(label)}`}>
                  {label}
                </span>
              ))
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 italic border border-gray-200">
                No labels
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-auto">
           <button 
            onClick={() => setIsEditing(!isEditing)}
            className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
            title="Edit Issue Details"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={() => onDelete(issue.id)}
            className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
          >
            Remove
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4">
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Title</label>
              <input
                type="text"
                value={editedIssue.title}
                onChange={(e) => setEditedIssue({...editedIssue, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Body (Markdown)</label>
              <textarea
                value={editedIssue.body}
                onChange={(e) => setEditedIssue({...editedIssue, body: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm h-32 font-mono"
              />
            </div>
             <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Labels (comma separated)</label>
              <input
                type="text"
                value={editedIssue.labels.join(', ')}
                onChange={(e) => setEditedIssue({...editedIssue, labels: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
               <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md">Cancel</button>
               <button onClick={saveEdits} className="px-3 py-1.5 text-sm bg-brand-600 text-white hover:bg-brand-700 rounded-md">Save Changes</button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-4">
               <h3 className="font-semibold text-gray-900 mb-1">{editedIssue.title}</h3>
               <p className="text-gray-600 text-sm whitespace-pre-line">{editedIssue.body}</p>
            </div>

             {/* Code Block for Copying */}
            <div className="relative group">
              <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg text-xs md:text-sm font-mono overflow-x-auto custom-scrollbar whitespace-pre-wrap break-all">
                {generateCommand(editedIssue)}
              </pre>
              <button
                onClick={handleCopy}
                className="absolute top-2 right-2 p-2 bg-slate-800 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-700 focus:opacity-100"
                title="Copy to clipboard"
              >
                {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              </button>
            </div>
            {issue.originalContext && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-100 rounded-md">
                    <p className="text-xs font-semibold text-yellow-800 uppercase mb-1">Original Email Context</p>
                    <p className="text-xs text-yellow-800 italic">"{issue.originalContext}"</p>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};