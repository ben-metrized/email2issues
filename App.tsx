import React, { useState } from 'react';
import { geminiService } from './services/geminiService';
import { ParsedIssue, ProcessingStatus, EmailContent } from './types';
import { CommandPreview } from './components/CommandPreview';
import { 
  Mail, 
  Sparkles, 
  Loader2, 
  Github, 
  Trash2,
  Copy,
  Terminal
} from 'lucide-react';

const App: React.FC = () => {
  const [emailContent, setEmailContent] = useState<EmailContent>({ subject: '', body: '' });
  const [issues, setIssues] = useState<ParsedIssue[]>([]);
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Helper to process raw issues from Gemini into display-ready issues
  const processParsedIssues = (rawIssues: ParsedIssue[]): ParsedIssue[] => {
    return rawIssues.map(issue => {
      // 1. Add Title Prefix
      let prefix = '';
      const lowerLabels = issue.labels.map(l => l.toLowerCase());
      if (lowerLabels.some(l => l.includes('bug'))) prefix = '[Bug] ';
      else if (lowerLabels.some(l => l.includes('feature') || l.includes('enhancement'))) prefix = '[Feature] ';
      
      const title = `${prefix}${issue.title}`.trim();

      // 2. Merge Original Context into Body
      let body = issue.body;
      if (issue.originalContext) {
        const senderPrefix = (issue.sender && issue.sender !== 'Unknown') ? `From ${issue.sender}:\n` : '';
        body = senderPrefix + body;
        body += 
          `\n\n---\n\n` + 
          `**Original Context:**\n` + 
          `\n` +
          `> ` + issue.originalContext;
      }

      return {
        ...issue,
        title,
        body,
        originalContext: undefined // Clear so it isn't merged again later
      };
    });
  };

  const handleGenerate = async () => {
    if (!emailContent.subject.trim() && !emailContent.body.trim()) return;
    
    setStatus(ProcessingStatus.ANALYZING);
    setErrorMsg(null);
    setIssues([]); // Clear previous results

    try {
      const rawIssues = await geminiService.parseEmailToIssues(emailContent.subject, emailContent.body);
      
      if (rawIssues.length === 0) {
        setErrorMsg("No actionable requests found in the email content.");
        setStatus(ProcessingStatus.IDLE);
      } else {
        const processedIssues = processParsedIssues(rawIssues);
        setIssues(processedIssues);
        setStatus(ProcessingStatus.COMPLETE);
      }
    } catch (err) {
      setErrorMsg("Failed to parse email. Please check your API key and try again.");
      setStatus(ProcessingStatus.ERROR);
    }
  };

  const handleUpdateIssue = (updated: ParsedIssue) => {
    setIssues(prev => prev.map(i => i.id === updated.id ? updated : i));
  };

  const handleDeleteIssue = (id: string) => {
    setIssues(prev => prev.filter(i => i.id !== id));
    if (issues.length <= 1) {
        setStatus(ProcessingStatus.IDLE);
    }
  };

  const escapeForShell = (str: string) => {
    if (!str) return '';
    return str
      .replace(/\\/g, '\\\\') // Escape backslashes first
      .replace(/"/g, '\\"')   // Escape double quotes
      .replace(/`/g, '\\`')   // Escape backticks
      .replace(/\$/g, '\\$'); // Escape dollar signs
  };

  const copyAllCommands = async () => {
    const allCommands = issues.map(issue => {
        const safeTitle = escapeForShell(issue.title);
        const safeBody = escapeForShell(issue.body);
        const labelsStr = issue.labels.map(l => `--label "${l}"`).join(' ');
        
        return `gh issue create --title "${safeTitle}" --body "${safeBody}" ${labelsStr}`;
    }).join('\n');
    
    await navigator.clipboard.writeText(allCommands);
    alert("All commands copied to clipboard!");
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans text-slate-800">
      
      {/* LEFT PANEL - INPUT */}
      <div className="w-full md:w-1/2 lg:w-5/12 bg-white flex flex-col border-r border-gray-200 shadow-xl z-10 h-auto md:h-screen sticky top-0 md:fixed">
        <div className="p-6 md:p-8 flex-1 overflow-y-auto">
          
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2 text-brand-600">
              <Github size={24} />
              <span className="font-bold text-lg tracking-tight text-slate-900">GitMail Agent</span>
            </div>
            <p className="text-slate-500 text-sm">
              Paste an email below. Gemini will extract tasks and generate <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 text-xs font-mono">gh issue create</code> commands for you.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-slate-700 mb-1">Email Subject</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={16} className="text-gray-400" />
                </div>
                <input
                  id="subject"
                  type="text"
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-shadow outline-none"
                  placeholder="e.g. Feedback on the Q3 Report Dashboard"
                  value={emailContent.subject}
                  onChange={(e) => setEmailContent({ ...emailContent, subject: e.target.value })}
                />
              </div>
            </div>

            <div className="flex-1 flex flex-col">
              <label htmlFor="body" className="block text-sm font-medium text-slate-700 mb-1">Email Body</label>
              <textarea
                id="body"
                className="flex-1 min-h-[300px] md:min-h-[400px] w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-shadow outline-none resize-none"
                placeholder="Paste the full email content here..."
                value={emailContent.body}
                onChange={(e) => setEmailContent({ ...emailContent, body: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <button
            onClick={handleGenerate}
            disabled={status === ProcessingStatus.ANALYZING || (!emailContent.subject && !emailContent.body)}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-white shadow-lg shadow-brand-500/30 transition-all transform active:scale-95 ${
              status === ProcessingStatus.ANALYZING
                ? 'bg-brand-400 cursor-not-allowed'
                : 'bg-brand-600 hover:bg-brand-700 hover:shadow-brand-600/40'
            }`}
          >
            {status === ProcessingStatus.ANALYZING ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Analyzing Request...</span>
              </>
            ) : (
              <>
                <Sparkles size={20} />
                <span>Generate Commands</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* RIGHT PANEL - OUTPUT */}
      <div className="w-full md:w-1/2 lg:w-7/12 ml-0 md:ml-[50%] lg:ml-[41.666%] bg-slate-50 min-h-screen p-6 md:p-8 lg:p-12 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
            
            {/* Empty State */}
            {status === ProcessingStatus.IDLE && !issues.length && (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40 mt-20">
                    <Terminal size={64} className="mb-4 text-slate-400" />
                    <h3 className="text-xl font-semibold text-slate-600">Waiting for Input</h3>
                    <p className="max-w-xs mx-auto mt-2 text-slate-500">
                        Generated CLI commands will appear here, ready for your terminal.
                    </p>
                </div>
            )}

            {/* Error State */}
            {status === ProcessingStatus.ERROR && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <p className="text-red-600 font-medium">{errorMsg}</p>
                    <button 
                        onClick={() => setStatus(ProcessingStatus.IDLE)}
                        className="mt-4 text-sm text-red-700 underline hover:text-red-800"
                    >
                        Try Again
                    </button>
                </div>
            )}

            {/* Results State */}
            {issues.length > 0 && (
                <div className="animate-fade-in-up">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full border border-green-200">
                                {issues.length} Issues Found
                            </span>
                        </h2>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setIssues([])}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <Trash2 size={16} />
                                Clear
                            </button>
                            <button 
                                onClick={copyAllCommands}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-slate-800 border border-slate-900 rounded-lg hover:bg-slate-900 hover:shadow-lg transition-all"
                            >
                                <Copy size={16} />
                                Copy All
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6 pb-20">
                        {issues.map((issue) => (
                            <CommandPreview 
                                key={issue.id} 
                                issue={issue} 
                                onUpdate={handleUpdateIssue}
                                onDelete={handleDeleteIssue}
                            />
                        ))}
                    </div>

                    <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3">
                        <div className="p-1 bg-blue-100 rounded text-blue-600 mt-0.5">
                            <Terminal size={16} />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-blue-900">Next Steps</h4>
                            <p className="text-sm text-blue-800 mt-1">
                                Open your terminal, navigate to your repository, and paste the commands.
                                Ensure you are authenticated via <code className="bg-blue-100 px-1 rounded">gh auth login</code>.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default App;