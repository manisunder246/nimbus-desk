import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTicket, requestPresignedUpload, uploadFileToPresigned, attachToTicket } from '../services/api';
import { useToast } from './Toast';
import Spinner from './Spinner';

const CATEGORIES = ['Network', 'Hardware', 'Software', 'Access', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High'];
const TITLE_MAX = 120;
const DESC_MAX  = 2000;
const FILE_MAX  = 5 * 1024 * 1024;
const ACCEPT    = 'image/*,.pdf,.txt,.log';

export default function RaiseTicketForm() {
  const nav = useNavigate();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Network');
  const [priority, setPriority] = useState('Low');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function pickFile(e) {
    const f = e.target.files?.[0];
    if (!f) return setFile(null);
    if (f.size > FILE_MAX) {
      toast.error('File exceeds 5 MB limit');
      e.target.value = '';
      return;
    }
    setFile(f);
  }

  async function submit(e) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error('Title and description are required');
      return;
    }
    setSubmitting(true);
    try {
      const ticket = await createTicket({ title: title.trim(), category, priority, description: description.trim() });
      if (file) {
        const { uploadUrl, s3Key } = await requestPresignedUpload({
          ticketId: ticket.ticketId,
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
        });
        await uploadFileToPresigned(uploadUrl, file);
        await attachToTicket(ticket.ticketId, s3Key);
      }
      toast.success('Ticket created — classifier is processing priority');
      nav('/app/tickets');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to create ticket');
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-lg shadow-sm p-8">
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
          <div className="relative">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Brief summary of the issue"
            />
            <span className="absolute right-2 bottom-1 text-[10px] text-slate-400">{title.length}/{TITLE_MAX}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Priority</label>
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-md">
              {PRIORITIES.map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`text-sm py-1.5 rounded ${
                    priority === p
                      ? 'bg-white text-slate-900 shadow-sm font-medium'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
          <div className="relative">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, DESC_MAX))}
              required
              rows={6}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Provide steps to reproduce, error messages, and any context that helps."
            />
            <span className="absolute right-2 bottom-2 text-[10px] text-slate-400">{description.length}/{DESC_MAX}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Attachment (optional)</label>
          <input
            type="file"
            accept={ACCEPT}
            onChange={pickFile}
            className="block w-full text-sm text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-slate-300 file:text-sm file:bg-white file:text-slate-700 file:hover:bg-slate-50"
          />
          <p className="text-xs text-slate-500 mt-1">Images, PDF, txt or log up to 5 MB.</p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => nav('/app/tickets')}
            className="px-4 py-2 text-sm rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-sm rounded-md bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {submitting && <Spinner size={14} />} Submit ticket
          </button>
        </div>
      </form>
    </div>
  );
}
