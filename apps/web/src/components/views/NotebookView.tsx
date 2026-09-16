import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import { notes, addNote, updateNote, deleteNote, setActiveTab, type NoteItem } from '../../db/localDb';
import { IconNotebook, IconPlus, IconSearch, IconPin, IconCopy, IconCheck, IconEdit, IconTrash, IconX } from '../icons';

export const NotebookView: Component = () => {
  const [showModal, setShowModal] = createSignal(false);
  const [editingNoteId, setEditingNoteId] = createSignal<string | null>(null);
  const [selectedCategory, setSelectedCategory] = createSignal('All');
  const [searchQuery, setSearchQuery] = createSignal('');
  const [copiedId, setCopiedId] = createSignal<string | null>(null);

  // Form
  const [noteTitle, setNoteTitle] = createSignal('');
  const [noteContent, setNoteContent] = createSignal('');
  const [noteCategory, setNoteCategory] = createSignal<NoteItem['category']>('Daily Accounts');
  const [noteColor, setNoteColor] = createSignal<NoteItem['color']>('emerald');

  const categories = ['All', 'Daily Accounts', 'Supplier Orders', 'Cheque to Clear', 'General'];

  const filteredNotes = createMemo(() => {
    const q = searchQuery().toLowerCase().trim();
    const cat = selectedCategory();
    return [...notes]
      .filter((n) => {
        const matchesCat = cat === 'All' || n.category === cat;
        const matchesSearch = !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
        return matchesCat && matchesSearch;
      })
      .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
  });

  const handleOpenAdd = () => {
    setEditingNoteId(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteCategory('Daily Accounts');
    setNoteColor('emerald');
    setShowModal(true);
  };

  const handleOpenEdit = (n: NoteItem) => {
    setEditingNoteId(n.id);
    setNoteTitle(n.title);
    setNoteContent(n.content);
    setNoteCategory(n.category);
    setNoteColor(n.color);
    setShowModal(true);
  };

  const handleSaveNote = (e: Event) => {
    e.preventDefault();
    if (!noteTitle().trim() || !noteContent().trim()) return;

    if (editingNoteId()) {
      updateNote(editingNoteId()!, {
        title: noteTitle().trim(),
        content: noteContent().trim(),
        category: noteCategory(),
        color: noteColor(),
      });
    } else {
      addNote({
        title: noteTitle().trim(),
        content: noteContent().trim(),
        category: noteCategory(),
        color: noteColor(),
        isPinned: false,
      });
    }

    setShowModal(false);
  };

  const togglePin = (n: NoteItem) => {
    updateNote(n.id, { isPinned: !n.isPinned });
  };

  const copyNote = (n: NoteItem) => {
    navigator.clipboard.writeText(`${n.title}\n\n${n.content}`);
    setCopiedId(n.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const getColorClasses = (color: NoteItem['color']) => {
    switch (color) {
      case 'amber':
        return 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 text-amber-950 dark:text-amber-200';
      case 'rose':
        return 'bg-rose-50/80 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40 text-rose-950 dark:text-rose-200';
      case 'blue':
        return 'bg-blue-50/80 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/40 text-blue-950 dark:text-blue-200';
      case 'purple':
        return 'bg-purple-50/80 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/40 text-purple-950 dark:text-purple-200';
      default:
        return 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-950 dark:text-emerald-200';
    }
  };

  const getBadgeClasses = (color: NoteItem['color']) => {
    switch (color) {
      case 'amber':
        return 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300';
      case 'rose':
        return 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300';
      case 'blue':
        return 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300';
      case 'purple':
        return 'bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300';
      default:
        return 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300';
    }
  };

  return (
    <div class="p-6 space-y-6 animate-fade-in">
      {/* Top Header */}
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <button
            class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors text-gray-500 dark:text-neutral-400"
            onClick={() => setActiveTab('dashboard')}
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <div>
            <h1 class="text-xl font-heading font-bold text-gray-900 dark:text-white">Notebook & Daily Notes</h1>
            <p class="text-xs text-gray-400 dark:text-neutral-400">Keep track of supplier orders, cheque due dates, and Kirana store tasks</p>
          </div>
        </div>

        <button class="btn-primary flex items-center gap-2" onClick={handleOpenAdd}>
          <IconPlus class="w-4 h-4" />
          <span>Add New Note</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div class="stat-card flex flex-wrap items-center justify-between gap-3 !p-3">
        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <For each={categories}>
            {(cat) => (
              <button
                class={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory() === cat
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-gray-50 dark:bg-neutral-900 text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800'
                }`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            )}
          </For>
        </div>

        <div class="w-full sm:w-64 relative">
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
            class="input-field text-xs pl-8"
          />
          <IconSearch class="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Notes Grid */}
      <Show
        when={filteredNotes().length > 0}
        fallback={
          <div class="stat-card text-center py-16 flex flex-col items-center">
            <div class="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 flex items-center justify-center text-brand-600 dark:text-brand-400 mb-3">
              <IconNotebook class="w-8 h-8" />
            </div>
            <p class="text-sm font-bold text-gray-800 dark:text-white mb-1">Your notebook is empty</p>
            <p class="text-xs text-gray-400 dark:text-neutral-400 max-w-sm mb-4">
              Write down supplier orders, customer requests, or daily financial summaries to stay organized.
            </p>
            <button class="btn-primary text-xs flex items-center gap-2" onClick={handleOpenAdd}>
              <IconPlus class="w-4 h-4" />
              <span>Create Your First Note</span>
            </button>
          </div>
        }
      >
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <For each={filteredNotes()}>
            {(note) => (
              <div
                class={`rounded-2xl border p-4.5 transition-all duration-200 shadow-sm hover:shadow-card flex flex-col justify-between relative group ${getColorClasses(
                  note.color
                )}`}
              >
                <div>
                  <div class="flex items-start justify-between gap-2 mb-2">
                    <span class={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getBadgeClasses(note.color)}`}>
                      {note.category}
                    </span>
                    <button
                      class={`p-1 rounded-full text-xs transition ${note.isPinned ? 'text-amber-500 scale-110' : 'text-gray-400 opacity-40 group-hover:opacity-100'}`}
                      title={note.isPinned ? 'Unpin' : 'Pin to top'}
                      onClick={() => togglePin(note)}
                    >
                      <IconPin class="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 class="font-bold text-sm text-gray-900 dark:text-white mb-1.5">{note.title}</h3>
                  <p class="text-xs text-gray-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed line-clamp-6">{note.content}</p>
                </div>

                <div class="mt-4 pt-3 border-t border-black/5 dark:border-white/10 flex items-center justify-between text-[10px] text-gray-500 dark:text-neutral-400">
                  <span>{note.updatedAt}</span>
                  <div class="flex items-center gap-2">
                    <button
                      class="hover:text-gray-900 dark:hover:text-white font-medium flex items-center gap-1"
                      title="Copy content"
                      onClick={() => copyNote(note)}
                    >
                      <Show when={copiedId() === note.id} fallback={<IconCopy class="w-3.5 h-3.5" />}>
                        <IconCheck class="w-3.5 h-3.5 text-emerald-500" />
                      </Show>
                      <span>{copiedId() === note.id ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      class="hover:text-brand-600 dark:hover:text-brand-400 font-medium flex items-center gap-1"
                      title="Edit note"
                      onClick={() => handleOpenEdit(note)}
                    >
                      <IconEdit class="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      class="hover:text-red-500 dark:hover:text-red-400 font-medium p-1"
                      title="Delete note"
                      onClick={() => deleteNote(note.id)}
                    >
                      <IconTrash class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* Add / Edit Note Modal */}
      <Show when={showModal()}>
        <div class="modal-overlay animate-fade-in" onClick={() => setShowModal(false)}>
          <div class="modal-content !max-w-md p-6 bg-white dark:bg-black border border-gray-200 dark:border-neutral-800" onClick={(e) => e.stopPropagation()}>
            <div class="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-neutral-800 mb-4">
              <h3 class="font-bold text-base text-gray-900 dark:text-white">
                {editingNoteId() ? 'Edit Note' : 'Create New Note'}
              </h3>
              <button onClick={() => setShowModal(false)} class="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                <IconX class="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} class="space-y-3.5">
              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekly vegetable order from Kalimati"
                  value={noteTitle()}
                  onInput={(e) => setNoteTitle(e.currentTarget.value)}
                  class="input-field"
                  autofocus
                />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">Category</label>
                  <select
                    value={noteCategory()}
                    onChange={(e) => setNoteCategory(e.currentTarget.value as any)}
                    class="input-field text-xs"
                  >
                    <option value="Daily Accounts">Daily Accounts</option>
                    <option value="Supplier Orders">Supplier Orders</option>
                    <option value="Cheque to Clear">Cheque to Clear</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">Note Color</label>
                  <div class="flex items-center gap-2 mt-1.5">
                    {(['emerald', 'amber', 'blue', 'rose', 'purple'] as NoteItem['color'][]).map((c) => (
                      <button
                        type="button"
                        class={`w-5 h-5 rounded-full border-2 transition-transform ${
                          noteColor() === c ? 'border-gray-900 dark:border-white scale-125' : 'border-transparent'
                        } ${
                          c === 'emerald'
                            ? 'bg-emerald-400'
                            : c === 'amber'
                            ? 'bg-amber-400'
                            : c === 'blue'
                            ? 'bg-blue-400'
                            : c === 'rose'
                            ? 'bg-rose-400'
                            : 'bg-purple-400'
                        }`}
                        onClick={() => setNoteColor(c)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">Note Content *</label>
                <textarea
                  required
                  rows={5}
                  placeholder="Write your note details here..."
                  value={noteContent()}
                  onInput={(e) => setNoteContent(e.currentTarget.value)}
                  class="input-field text-xs"
                />
              </div>

              <div class="pt-3 flex gap-2 border-t border-gray-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  class="btn-outline flex-1 justify-center text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="btn-primary flex-1 justify-center text-xs"
                >
                  {editingNoteId() ? 'Save Changes' : 'Create Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>
    </div>
  );
};
