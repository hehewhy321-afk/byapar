import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import { notes, addNote, updateNote, deleteNote, setActiveTab, type NoteItem } from '../../db/localDb';
import { IconNotebook, IconPlus, IconSearch, IconPin, IconCopy, IconCheck, IconEdit, IconTrash, IconX, IconLock } from '../icons';
import { currentLang } from '../../services/i18n';

export const NotebookView: Component = () => {
  const [showModal, setShowModal] = createSignal(false);
  const [editingNoteId, setEditingNoteId] = createSignal<string | null>(null);
  const [viewingNote, setViewingNote] = createSignal<NoteItem | null>(null);
  const [selectedCategory, setSelectedCategory] = createSignal('All');
  const [searchQuery, setSearchQuery] = createSignal('');
  const [copiedId, setCopiedId] = createSignal<string | null>(null);

  // Form
  const [noteTitle, setNoteTitle] = createSignal('');
  const [noteContent, setNoteContent] = createSignal('');
  const [noteCategory, setNoteCategory] = createSignal<NoteItem['category']>('Daily Accounts');
  const [noteColor, setNoteColor] = createSignal<NoteItem['color']>('emerald');

  const categories = ['All', 'Daily Accounts', 'Supplier Orders', 'Cheque to Clear', 'General'];

  const editingNote = createMemo(() => notes.find((n) => n.id === editingNoteId()));

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStats = (content: string) => {
    const trimmed = content.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const chars = content.length;
    return { words, chars };
  };

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

  const pinnedCount = createMemo(() => notes.filter((n) => n.isPinned).length);

  const handleOpenAdd = () => {
    setEditingNoteId(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteCategory('Daily Accounts');
    setNoteColor('emerald');
    setShowModal(true);
  };

  const handleOpenEdit = (n: NoteItem, e?: Event) => {
    if (e) e.stopPropagation();
    setEditingNoteId(n.id);
    setNoteTitle(n.title);
    setNoteContent(n.content);
    setNoteCategory(n.category);
    setNoteColor(n.color);
    if (viewingNote()) setViewingNote(null);
    setShowModal(true);
  };

  const handleSaveNote = async (e: Event) => {
    e.preventDefault();
    if (!noteTitle().trim() || !noteContent().trim()) return;

    if (editingNoteId()) {
      await updateNote(editingNoteId()!, {
        title: noteTitle().trim(),
        content: noteContent().trim(),
        category: noteCategory(),
        color: noteColor(),
      });
    } else {
      await addNote({
        title: noteTitle().trim(),
        content: noteContent().trim(),
        category: noteCategory(),
        color: noteColor(),
        isPinned: false,
      });
    }

    setShowModal(false);
  };

  const togglePin = (n: NoteItem, e?: Event) => {
    if (e) e.stopPropagation();
    updateNote(n.id, { isPinned: !n.isPinned });
  };

  const copyNote = (n: NoteItem, e?: Event) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(`${n.title}\n\n${n.content}`);
    setCopiedId(n.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleDeleteNote = async (id: string, e?: Event) => {
    if (e) e.stopPropagation();
    if (window.confirm(currentLang() === 'ne' ? 'के तपाईं यो नोट मेटाउन निश्चित हुनुहुन्छ?' : 'Are you sure you want to delete this note?')) {
      if (viewingNote()?.id === id) setViewingNote(null);
      await deleteNote(id);
    }
  };

  // Color-coded theme schemes for cards
  const getColorScheme = (color?: NoteItem['color']) => {
    switch (color) {
      case 'amber':
        return {
          cardBorder: 'border-amber-200/90 dark:border-amber-800/40 hover:border-amber-400 dark:hover:border-amber-600',
          topBar: 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400',
          badge: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/50',
          dot: 'bg-amber-500',
          glow: 'group-hover:ring-amber-500/10',
          accentText: 'text-amber-600 dark:text-amber-400',
        };
      case 'rose':
        return {
          cardBorder: 'border-rose-200/90 dark:border-rose-800/40 hover:border-rose-400 dark:hover:border-rose-600',
          topBar: 'bg-gradient-to-r from-rose-500 via-rose-400 to-pink-400',
          badge: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/50',
          dot: 'bg-rose-500',
          glow: 'group-hover:ring-rose-500/10',
          accentText: 'text-rose-600 dark:text-rose-400',
        };
      case 'blue':
        return {
          cardBorder: 'border-blue-200/90 dark:border-blue-800/40 hover:border-blue-400 dark:hover:border-blue-600',
          topBar: 'bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400',
          badge: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/50',
          dot: 'bg-blue-500',
          glow: 'group-hover:ring-blue-500/10',
          accentText: 'text-blue-600 dark:text-blue-400',
        };
      case 'purple':
        return {
          cardBorder: 'border-purple-200/90 dark:border-purple-800/40 hover:border-purple-400 dark:hover:border-purple-600',
          topBar: 'bg-gradient-to-r from-purple-500 via-purple-400 to-indigo-400',
          badge: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/50',
          dot: 'bg-purple-500',
          glow: 'group-hover:ring-purple-500/10',
          accentText: 'text-purple-600 dark:text-purple-400',
        };
      default:
        return {
          cardBorder: 'border-emerald-200/90 dark:border-emerald-800/40 hover:border-emerald-400 dark:hover:border-emerald-600',
          topBar: 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400',
          badge: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/50',
          dot: 'bg-emerald-500',
          glow: 'group-hover:ring-emerald-500/10',
          accentText: 'text-emerald-600 dark:text-emerald-400',
        };
    }
  };

  return (
    <div class="p-6 space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Top Header */}
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2.5">
            <h1 class="text-2xl font-heading font-extrabold text-gray-900 dark:text-white tracking-tight">
              {currentLang() === 'ne' ? 'नोटबुक र दैनिक नोटहरू' : 'Notebook & Daily Notes'}
            </h1>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800/50">
              {notes.length} {currentLang() === 'ne' ? 'नोटहरू' : 'notes'}
            </span>
            <Show when={pinnedCount() > 0}>
              <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 flex items-center gap-1">
                <IconPin class="w-3 h-3 text-amber-500 fill-amber-500" />
                {pinnedCount()} {currentLang() === 'ne' ? 'पिन गरिएको' : 'pinned'}
              </span>
            </Show>
          </div>
          <p class="text-xs text-gray-500 dark:text-neutral-400 mt-1">
            {currentLang() === 'ne'
              ? 'सप्लायर अर्डर, बैंक चेक, ग्राहकको विशेष अनुरोध, र पसलको दैनिक हिसाब सुरक्षित राख्नुहोस्'
              : 'Keep track of supplier orders, cheque due dates, and Kirana store daily notes'}
          </p>
        </div>

        <button class="btn-primary flex items-center gap-2 shadow-sm hover:shadow" onClick={handleOpenAdd}>
          <IconPlus class="w-4 h-4" />
          <span>{currentLang() === 'ne' ? 'नयाँ नोट थप्नुहोस्' : 'Add New Note'}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div class="stat-card flex flex-wrap items-center justify-between gap-3 !p-3 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl shadow-xs">
        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <For each={categories}>
            {(cat) => {
              const count = createMemo(() => (cat === 'All' ? notes.length : notes.filter((n) => n.category === cat).length));
              return (
                <button
                  class={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    selectedCategory() === cat
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-gray-100/80 dark:bg-neutral-800/80 text-gray-600 dark:text-neutral-300 hover:bg-gray-200/70 dark:hover:bg-neutral-700'
                  }`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  <span>{cat}</span>
                  <span
                    class={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      selectedCategory() === cat
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-200 dark:bg-neutral-700 text-gray-600 dark:text-neutral-300'
                    }`}
                  >
                    {count()}
                  </span>
                </button>
              );
            }}
          </For>
        </div>

        <div class="w-full sm:w-64 relative">
          <input
            type="text"
            placeholder={currentLang() === 'ne' ? 'नोट खोज्नुहोस्...' : 'Search notes...'}
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
            class="input-field text-xs pl-8 pr-7 py-1.5 rounded-lg"
          />
          <IconSearch class="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Show when={searchQuery()}>
            <button
              onClick={() => setSearchQuery('')}
              class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <IconX class="w-3 h-3" />
            </button>
          </Show>
        </div>
      </div>

      {/* Notes Grid */}
      <Show
        when={filteredNotes().length > 0}
        fallback={
          <div class="stat-card text-center py-16 flex flex-col items-center bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl">
            <div class="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 flex items-center justify-center text-brand-600 dark:text-brand-400 mb-3 shadow-inner">
              <IconNotebook class="w-8 h-8" />
            </div>
            <p class="text-base font-bold text-gray-800 dark:text-white mb-1">
              {searchQuery() || selectedCategory() !== 'All'
                ? currentLang() === 'ne'
                  ? 'कुनै नोट फेला परेन'
                  : 'No notes match your filter'
                : currentLang() === 'ne'
                ? 'तपाईंको नोटबुक खाली छ'
                : 'Your notebook is empty'}
            </p>
            <p class="text-xs text-gray-400 dark:text-neutral-400 max-w-sm mb-4">
              {searchQuery() || selectedCategory() !== 'All'
                ? currentLang() === 'ne'
                  ? 'खोज शब्द वा श्रेणी परिवर्तन गरेर पुन: प्रयास गर्नुहोस्।'
                  : 'Try adjusting your search query or selecting a different category.'
                : currentLang() === 'ne'
                ? 'सप्लायर अर्डर, ग्राहकको अनुरोध, वा दैनिक हिसाब नोट गर्न नयाँ नोट बनाउनुहोस्।'
                : 'Write down supplier orders, customer requests, or daily financial summaries to stay organized.'}
            </p>
            <button class="btn-primary text-xs flex items-center gap-2" onClick={handleOpenAdd}>
              <IconPlus class="w-4 h-4" />
              <span>{currentLang() === 'ne' ? 'पहिलो नोट सिर्जना गर्नुहोस्' : 'Create Your First Note'}</span>
            </button>
          </div>
        }
      >
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <For each={filteredNotes()}>
            {(note) => {
              const scheme = createMemo(() => getColorScheme(note.color));
              const stats = createMemo(() => getStats(note.content));
              const isLong = createMemo(() => note.content.length > 200 || note.content.split('\n').length > 5);

              return (
                <div
                  onClick={() => setViewingNote(note)}
                  class={`relative flex flex-col justify-between rounded-2xl bg-white dark:bg-neutral-900 border ${
                    scheme().cardBorder
                  } transition-all duration-200 hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-neutral-950/50 cursor-pointer overflow-hidden group`}
                >
                  {/* Top Color Accent Strip */}
                  <div class={`h-1.5 w-full ${scheme().topBar}`} />

                  {/* Card Content */}
                  <div class="p-5 flex-1 flex flex-col">
                    {/* Header Bar */}
                    <div class="flex items-center justify-between gap-2 mb-3">
                      <div class="flex items-center gap-2">
                        <span
                          class={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                            scheme().badge
                          }`}
                        >
                          <span class={`w-1.5 h-1.5 rounded-full ${scheme().dot}`} />
                          {note.category}
                        </span>
                        <Show when={note.isPinned}>
                          <span class="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                            <IconPin class="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                            {currentLang() === 'ne' ? 'पिन' : 'Pinned'}
                          </span>
                        </Show>
                      </div>

                      <button
                        class={`p-1.5 rounded-lg text-xs transition ${
                          note.isPinned
                            ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100'
                            : 'text-gray-400 opacity-60 hover:opacity-100 hover:bg-gray-100 dark:hover:bg-neutral-800'
                        }`}
                        title={note.isPinned ? 'Unpin from top' : 'Pin note to top'}
                        onClick={(e) => togglePin(note, e)}
                      >
                        <IconPin class="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Note Title */}
                    <h3 class="font-heading font-bold text-base text-gray-900 dark:text-neutral-100 mb-2 leading-snug line-clamp-2">
                      {note.title}
                    </h3>

                    {/* Note Body with comfortable line spacing and reading text */}
                    <div class="relative flex-1">
                      <p class="text-[13px] text-gray-600 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed line-clamp-5">
                        {note.content}
                      </p>

                      <Show when={isLong()}>
                        <div class="mt-2">
                          <span class={`text-xs font-semibold hover:underline flex items-center gap-1 ${scheme().accentText}`}>
                            {currentLang() === 'ne' ? 'पूरै पढ्नुहोस् →' : 'Read full note →'}
                          </span>
                        </div>
                      </Show>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div class="px-5 py-3 bg-gray-50/70 dark:bg-neutral-800/40 border-t border-gray-100 dark:border-neutral-800/80 flex items-center justify-between gap-2 text-[11px] text-gray-500 dark:text-neutral-400">
                    <div class="flex items-center gap-1.5" title="Creation timestamp is locked & immutable">
                      <IconLock class="w-3 h-3 text-amber-500 flex-shrink-0" />
                      <span class="font-medium text-[10.5px]">
                        {formatDateTime(note.createdAt || note.updatedAt)}
                      </span>
                    </div>

                    <div class="flex items-center gap-1">
                      <span class="text-[10px] text-gray-400 dark:text-neutral-500 mr-1 hidden sm:inline">
                        {stats().words} {currentLang() === 'ne' ? 'शब्द' : 'words'}
                      </span>

                      {/* Copy Button */}
                      <button
                        class="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-neutral-200 hover:bg-gray-200/60 dark:hover:bg-neutral-700 transition"
                        title={currentLang() === 'ne' ? 'प्रतिलिपि' : 'Copy'}
                        onClick={(e) => copyNote(note, e)}
                      >
                        <Show when={copiedId() === note.id} fallback={<IconCopy class="w-3.5 h-3.5" />}>
                          <IconCheck class="w-3.5 h-3.5 text-emerald-500" />
                        </Show>
                      </button>

                      {/* Edit Button */}
                      <button
                        class="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-gray-200/60 dark:hover:bg-neutral-700 transition"
                        title={currentLang() === 'ne' ? 'सम्पादन' : 'Edit'}
                        onClick={(e) => handleOpenEdit(note, e)}
                      >
                        <IconEdit class="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button */}
                      <button
                        class="p-1.5 rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                        title={currentLang() === 'ne' ? 'मेटाउनुहोस्' : 'Delete'}
                        onClick={(e) => handleDeleteNote(note.id, e)}
                      >
                        <IconTrash class="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </Show>

      {/* Full Note Reader Modal */}
      <Show when={viewingNote()}>
        {(current) => {
          const scheme = createMemo(() => getColorScheme(current().color));
          const stats = createMemo(() => getStats(current().content));
          return (
            <div class="modal-overlay animate-fade-in" onClick={() => setViewingNote(null)}>
              <div
                class="modal-content !max-w-2xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-2xl p-0"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Accent Top Bar */}
                <div class={`h-2 w-full ${scheme().topBar}`} />

                <div class="p-6">
                  {/* Modal Header */}
                  <div class="flex items-center justify-between pb-3.5 border-b border-gray-100 dark:border-neutral-800 mb-4 gap-3">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span
                        class={`text-xs font-semibold px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                          scheme().badge
                        }`}
                      >
                        <span class={`w-2 h-2 rounded-full ${scheme().dot}`} />
                        {current().category}
                      </span>
                      <Show when={current().isPinned}>
                        <span class="flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                          <IconPin class="w-3 h-3 text-amber-500 fill-amber-500" />
                          {currentLang() === 'ne' ? 'पिन गरिएको' : 'Pinned'}
                        </span>
                      </Show>
                    </div>

                    <div class="flex items-center gap-2">
                      <button
                        onClick={(e) => copyNote(current(), e)}
                        class="btn-outline !py-1 !px-2.5 text-xs flex items-center gap-1.5"
                      >
                        <Show when={copiedId() === current().id} fallback={<IconCopy class="w-3.5 h-3.5" />}>
                          <IconCheck class="w-3.5 h-3.5 text-emerald-500" />
                        </Show>
                        <span>
                          {copiedId() === current().id
                            ? currentLang() === 'ne'
                              ? 'प्रतिलिपि भयो'
                              : 'Copied'
                            : currentLang() === 'ne'
                            ? 'कपि'
                            : 'Copy'}
                        </span>
                      </button>
                      <button
                        onClick={(e) => handleOpenEdit(current(), e)}
                        class="btn-outline !py-1 !px-2.5 text-xs flex items-center gap-1.5 text-brand-600 dark:text-brand-400"
                      >
                        <IconEdit class="w-3.5 h-3.5" />
                        <span>{currentLang() === 'ne' ? 'सम्पादन' : 'Edit'}</span>
                      </button>
                      <button
                        onClick={() => setViewingNote(null)}
                        class="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800"
                      >
                        <IconX class="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Note Title */}
                  <h2 class="text-xl font-heading font-extrabold text-gray-900 dark:text-white mb-4 leading-tight">
                    {current().title}
                  </h2>

                  {/* Note Full Content with pristine reading typography */}
                  <div class="max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin">
                    <div class="p-4 rounded-xl bg-gray-50/80 dark:bg-neutral-800/50 border border-gray-100 dark:border-neutral-800">
                      <p class="text-sm font-normal text-gray-800 dark:text-neutral-200 whitespace-pre-wrap leading-relaxed select-text font-sans">
                        {current().content}
                      </p>
                    </div>
                  </div>

                  {/* Metadata and Stats Footer */}
                  <div class="mt-4 pt-3.5 border-t border-gray-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500 dark:text-neutral-400">
                    <div class="flex items-center gap-2">
                      <div class="flex items-center gap-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-800/40">
                        <IconLock class="w-3.5 h-3.5" />
                        <span>{currentLang() === 'ne' ? 'सिर्जना:' : 'Created:'} {formatDateTime(current().createdAt || current().updatedAt)}</span>
                      </div>
                      <Show when={current().updatedAt && current().updatedAt !== current().createdAt}>
                        <span class="text-[11px] text-gray-400">
                          ({currentLang() === 'ne' ? 'सम्पादित:' : 'Updated:'} {formatDateTime(current().updatedAt)})
                        </span>
                      </Show>
                    </div>

                    <div class="flex items-center gap-2 text-xs font-medium">
                      <span>{stats().words} {currentLang() === 'ne' ? 'शब्दहरू' : 'words'}</span>
                      <span>•</span>
                      <span>{stats().chars} {currentLang() === 'ne' ? 'अक्षरहरू' : 'characters'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        }}
      </Show>

      {/* Add / Edit Note Modal */}
      <Show when={showModal()}>
        <div class="modal-overlay animate-fade-in" onClick={() => setShowModal(false)}>
          <div
            class="modal-content !max-w-md p-6 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div class="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-neutral-800 mb-4">
              <h3 class="font-heading font-bold text-base text-gray-900 dark:text-white">
                {editingNoteId()
                  ? currentLang() === 'ne'
                    ? 'नोट सम्पादन गर्नुहोस्'
                    : 'Edit Note'
                  : currentLang() === 'ne'
                  ? 'नयाँ नोट सिर्जना गर्नुहोस्'
                  : 'Create New Note'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                class="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-lg"
              >
                <IconX class="w-4 h-4" />
              </button>
            </div>

            <Show when={editingNoteId() && editingNote()}>
              <div class="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 mb-3.5">
                <div class="flex items-center gap-2">
                  <IconLock class="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <div>
                    <p class="font-bold text-[11px]">
                      {currentLang() === 'ne' ? 'सिर्जना गरिएको मिति र समय (लक गरिएको):' : 'Created Date & Time (Locked):'}
                    </p>
                    <p class="text-[11px] font-mono text-gray-700 dark:text-neutral-300">
                      {formatDateTime(editingNote()?.createdAt || editingNote()?.updatedAt)}
                    </p>
                  </div>
                </div>
                <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-200/70 dark:bg-amber-800/50 text-amber-900 dark:text-amber-200">
                  {currentLang() === 'ne' ? 'अपरिवर्तनीय' : 'Immutable'}
                </span>
              </div>
            </Show>

            <form onSubmit={handleSaveNote} class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-gray-700 dark:text-neutral-300 mb-1">
                  {currentLang() === 'ne' ? 'शीर्षक *' : 'Title *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={currentLang() === 'ne' ? 'उदा. कालिमाटीबाट तरकारी अर्डर' : 'e.g. Weekly vegetable order from Kalimati'}
                  value={noteTitle()}
                  onInput={(e) => setNoteTitle(e.currentTarget.value)}
                  class="input-field text-sm"
                  autofocus
                />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-gray-700 dark:text-neutral-300 mb-1">
                    {currentLang() === 'ne' ? 'श्रेणी' : 'Category'}
                  </label>
                  <select
                    value={noteCategory()}
                    onChange={(e) => setNoteCategory(e.currentTarget.value as any)}
                    class="input-field text-xs py-2"
                  >
                    <option value="Daily Accounts">Daily Accounts</option>
                    <option value="Supplier Orders">Supplier Orders</option>
                    <option value="Cheque to Clear">Cheque to Clear</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-700 dark:text-neutral-300 mb-1">
                    {currentLang() === 'ne' ? 'नोट रङ' : 'Note Color'}
                  </label>
                  <div class="flex items-center gap-2 mt-1.5">
                    {(['emerald', 'amber', 'blue', 'rose', 'purple'] as NoteItem['color'][]).map((c) => (
                      <button
                        type="button"
                        class={`w-6 h-6 rounded-full border-2 transition-all ${
                          noteColor() === c
                            ? 'border-gray-900 dark:border-white scale-125 shadow-sm'
                            : 'border-transparent opacity-75 hover:opacity-100 hover:scale-110'
                        } ${
                          c === 'emerald'
                            ? 'bg-emerald-500'
                            : c === 'amber'
                            ? 'bg-amber-500'
                            : c === 'blue'
                            ? 'bg-blue-500'
                            : c === 'rose'
                            ? 'bg-rose-500'
                            : 'bg-purple-500'
                        }`}
                        onClick={() => setNoteColor(c)}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-700 dark:text-neutral-300 mb-1">
                  {currentLang() === 'ne' ? 'नोट विवरण *' : 'Note Content *'}
                </label>
                <textarea
                  required
                  rows={6}
                  placeholder={
                    currentLang() === 'ne'
                      ? 'यहाँ आफ्नो विवरण वा हिसाब लेख्नुहोस्...'
                      : 'Write your notes, lists, supplier order items, or daily totals...'
                  }
                  value={noteContent()}
                  onInput={(e) => setNoteContent(e.currentTarget.value)}
                  class="input-field text-xs leading-relaxed"
                />
              </div>

              <div class="pt-3 flex gap-2.5 border-t border-gray-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  class="btn-outline flex-1 justify-center text-xs py-2"
                >
                  {currentLang() === 'ne' ? 'रद्द' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  class="btn-primary flex-1 justify-center text-xs py-2 shadow-sm"
                >
                  {editingNoteId()
                    ? currentLang() === 'ne'
                      ? 'परिवर्तन सेभ गर्नुहोस्'
                      : 'Save Changes'
                    : currentLang() === 'ne'
                    ? 'नोट सिर्जना गर्नुहोस्'
                    : 'Create Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>
    </div>
  );
};
