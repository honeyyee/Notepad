const OWNER_KEY_PREFIX = 'np-owner-';

export function createOwnerToken(cryptoApi = globalThis.crypto) {
  if (!cryptoApi?.getRandomValues) throw new Error('Secure random generation is unavailable.');
  const bytes = new Uint8Array(32);
  cryptoApi.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function saveOwnerToken(noteId, token, storage = globalThis.localStorage) {
  if (!noteId || !token) throw new Error('A note ID and owner token are required.');
  storage.setItem(OWNER_KEY_PREFIX + noteId, token);
}

export function getOwnerToken(noteId, storage = globalThis.localStorage) {
  if (!noteId || !storage) return null;
  try {
    return storage.getItem(OWNER_KEY_PREFIX + noteId);
  } catch {
    return null;
  }
}

export function forgetOwnerToken(noteId, storage = globalThis.localStorage) {
  if (noteId && storage) storage.removeItem(OWNER_KEY_PREFIX + noteId);
}

export async function createOwnedNote(client, note, token) {
  const { data, error } = await client.rpc('create_note_with_owner', {
    p_author: note.author,
    p_category: note.category,
    p_content: note.content,
    p_owner_token: token
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function deleteOwnedNote(client, noteId, token) {
  if (!token) return false;
  const { data, error } = await client.rpc('delete_own_note', {
    p_note_id: noteId,
    p_owner_token: token
  });
  if (error) throw error;
  return data === true;
}
