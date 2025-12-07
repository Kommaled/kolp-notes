import Dexie, { Table } from 'dexie';
import { Note, Tag, Folder, Settings, defaultSettings } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Database class
class SecureNotesDB extends Dexie {
  notes!: Table<Note>;
  tags!: Table<Tag>;
  folders!: Table<Folder>;
  settings!: Table<Settings>;

  constructor() {
    super('SecureNotesDB');
    
    this.version(1).stores({
      notes: 'id, title, createdAt, updatedAt, isPinned, isDeleted, deletedAt, folderId, *tagIds',
      tags: 'id, name, createdAt',
      folders: 'id, name, parentId, createdAt',
      settings: 'id',
    });
  }
}

// Initialize database
export const db = new SecureNotesDB();

// ==================== NOTES ====================

export async function createNote(note: Partial<Note>): Promise<Note> {
  const now = new Date();
  const newNote: Note = {
    id: uuidv4(),
    title: note.title || 'Untitled Note',
    content: note.content || '',
    createdAt: now,
    updatedAt: now,
    isPinned: note.isPinned || false,
    isDeleted: false,
    tagIds: note.tagIds || [],
    folderId: note.folderId,
    isEncrypted: note.isEncrypted || false,
    encryptedTitle: note.encryptedTitle,
    encryptedContent: note.encryptedContent,
    titleIV: note.titleIV,
    contentIV: note.contentIV,
  };
  
  await db.notes.add(newNote);
  return newNote;
}

export async function updateNote(id: string, updates: Partial<Note>): Promise<void> {
  await db.notes.update(id, {
    ...updates,
    updatedAt: new Date(),
  });
}

export async function deleteNote(id: string, permanent: boolean = false): Promise<void> {
  if (permanent) {
    await db.notes.delete(id);
  } else {
    await db.notes.update(id, {
      isDeleted: true,
      deletedAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

export async function restoreNote(id: string): Promise<void> {
  await db.notes.update(id, {
    isDeleted: false,
    deletedAt: undefined,
    updatedAt: new Date(),
  });
}

export async function getNote(id: string): Promise<Note | undefined> {
  return await db.notes.get(id);
}

export async function getAllNotes(): Promise<Note[]> {
  return await db.notes.where('isDeleted').equals(0).toArray();
}

export async function getActiveNotes(): Promise<Note[]> {
  return await db.notes.filter(note => !note.isDeleted).toArray();
}

export async function getDeletedNotes(): Promise<Note[]> {
  return await db.notes.filter(note => note.isDeleted).toArray();
}

export async function getPinnedNotes(): Promise<Note[]> {
  return await db.notes.filter(note => note.isPinned && !note.isDeleted).toArray();
}

export async function getNotesByFolder(folderId: string): Promise<Note[]> {
  return await db.notes.filter(note => note.folderId === folderId && !note.isDeleted).toArray();
}

export async function getNotesByTag(tagId: string): Promise<Note[]> {
  return await db.notes.filter(note => note.tagIds.includes(tagId) && !note.isDeleted).toArray();
}

export async function searchNotes(query: string): Promise<Note[]> {
  const lowerQuery = query.toLowerCase();
  return await db.notes.filter(note => 
    !note.isDeleted && (
      note.title.toLowerCase().includes(lowerQuery) ||
      note.content.toLowerCase().includes(lowerQuery)
    )
  ).toArray();
}

export async function emptyTrash(): Promise<void> {
  const deletedNotes = await getDeletedNotes();
  await db.notes.bulkDelete(deletedNotes.map(n => n.id));
}

export async function togglePinNote(id: string): Promise<void> {
  const note = await getNote(id);
  if (note) {
    await updateNote(id, { isPinned: !note.isPinned });
  }
}

// ==================== TAGS ====================

export async function createTag(name: string, color: string = '#3b82f6'): Promise<Tag> {
  const newTag: Tag = {
    id: uuidv4(),
    name,
    color,
    createdAt: new Date(),
  };
  await db.tags.add(newTag);
  return newTag;
}

export async function updateTag(id: string, updates: Partial<Tag>): Promise<void> {
  await db.tags.update(id, updates);
}

export async function deleteTag(id: string): Promise<void> {
  // Remove tag from all notes
  const notes = await getNotesByTag(id);
  for (const note of notes) {
    await updateNote(note.id, {
      tagIds: note.tagIds.filter(tId => tId !== id),
    });
  }
  await db.tags.delete(id);
}

export async function getTag(id: string): Promise<Tag | undefined> {
  return await db.tags.get(id);
}

export async function getAllTags(): Promise<Tag[]> {
  return await db.tags.toArray();
}

export async function addTagToNote(noteId: string, tagId: string): Promise<void> {
  const note = await getNote(noteId);
  if (note && !note.tagIds.includes(tagId)) {
    await updateNote(noteId, {
      tagIds: [...note.tagIds, tagId],
    });
  }
}

export async function removeTagFromNote(noteId: string, tagId: string): Promise<void> {
  const note = await getNote(noteId);
  if (note) {
    await updateNote(noteId, {
      tagIds: note.tagIds.filter(id => id !== tagId),
    });
  }
}

// ==================== FOLDERS ====================

export async function createFolder(name: string, parentId?: string): Promise<Folder> {
  const now = new Date();
  const newFolder: Folder = {
    id: uuidv4(),
    name,
    parentId,
    createdAt: now,
    updatedAt: now,
  };
  await db.folders.add(newFolder);
  return newFolder;
}

export async function updateFolder(id: string, updates: Partial<Folder>): Promise<void> {
  await db.folders.update(id, {
    ...updates,
    updatedAt: new Date(),
  });
}

export async function deleteFolder(id: string): Promise<void> {
  // Move all notes in this folder to no folder
  const notes = await getNotesByFolder(id);
  for (const note of notes) {
    await updateNote(note.id, { folderId: undefined });
  }
  
  // Delete child folders recursively
  const childFolders = await db.folders.filter(f => f.parentId === id).toArray();
  for (const child of childFolders) {
    await deleteFolder(child.id);
  }
  
  await db.folders.delete(id);
}

export async function getFolder(id: string): Promise<Folder | undefined> {
  return await db.folders.get(id);
}

export async function getAllFolders(): Promise<Folder[]> {
  return await db.folders.toArray();
}

export async function getRootFolders(): Promise<Folder[]> {
  return await db.folders.filter(f => !f.parentId).toArray();
}

export async function getChildFolders(parentId: string): Promise<Folder[]> {
  return await db.folders.filter(f => f.parentId === parentId).toArray();
}

// ==================== SETTINGS ====================

export async function getSettings(): Promise<Settings> {
  let settings = await db.settings.get('main-settings');
  if (!settings) {
    await db.settings.add(defaultSettings);
    settings = defaultSettings;
  }
  return settings;
}

export async function updateSettings(updates: Partial<Settings>): Promise<void> {
  await db.settings.update('main-settings', updates);
}

export async function resetSettings(): Promise<void> {
  await db.settings.put(defaultSettings);
}

// ==================== IMPORT/EXPORT ====================

export async function exportAllData(): Promise<{
  notes: Note[];
  tags: Tag[];
  folders: Folder[];
  settings: Settings;
}> {
  const [notes, tags, folders, settings] = await Promise.all([
    db.notes.toArray(),
    db.tags.toArray(),
    db.folders.toArray(),
    getSettings(),
  ]);
  
  return { notes, tags, folders, settings };
}

export async function importData(data: {
  notes?: Note[];
  tags?: Tag[];
  folders?: Folder[];
}): Promise<{ notesImported: number; tagsImported: number; foldersImported: number }> {
  let notesImported = 0;
  let tagsImported = 0;
  let foldersImported = 0;

  if (data.folders) {
    for (const folder of data.folders) {
      const existing = await getFolder(folder.id);
      if (!existing) {
        await db.folders.add(folder);
        foldersImported++;
      }
    }
  }

  if (data.tags) {
    for (const tag of data.tags) {
      const existing = await getTag(tag.id);
      if (!existing) {
        await db.tags.add(tag);
        tagsImported++;
      }
    }
  }

  if (data.notes) {
    for (const note of data.notes) {
      const existing = await getNote(note.id);
      if (!existing) {
        await db.notes.add(note);
        notesImported++;
      }
    }
  }

  return { notesImported, tagsImported, foldersImported };
}

export async function clearAllData(): Promise<void> {
  await Promise.all([
    db.notes.clear(),
    db.tags.clear(),
    db.folders.clear(),
    db.settings.clear(),
  ]);
  // Re-initialize default settings
  await db.settings.add(defaultSettings);
}

// ==================== STATISTICS ====================

export async function getStatistics(): Promise<{
  totalNotes: number;
  activeNotes: number;
  deletedNotes: number;
  pinnedNotes: number;
  totalTags: number;
  totalFolders: number;
}> {
  const [allNotes, activeNotes, deletedNotes, pinnedNotes, tags, folders] = await Promise.all([
    db.notes.count(),
    db.notes.filter(n => !n.isDeleted).count(),
    db.notes.filter(n => n.isDeleted).count(),
    db.notes.filter(n => n.isPinned && !n.isDeleted).count(),
    db.tags.count(),
    db.folders.count(),
  ]);

  return {
    totalNotes: allNotes,
    activeNotes,
    deletedNotes,
    pinnedNotes,
    totalTags: tags,
    totalFolders: folders,
  };
}
