import test from 'node:test';
import assert from 'node:assert/strict';
import { createOwnedNote, deleteOwnedNote } from '../src/noteOwnership.js';

// In-memory RPC contract test: mirrors the database's token-checked create/delete flow.
function createFakeDatabase() {
  const notes = new Map();
  const ownerHashes = new Map();
  return {
    notes,
    rpc: async (name, args) => {
      if (name === 'create_note_with_owner') {
        const id = 'note-' + (notes.size + 1);
        const row = { id, author: args.p_author, category: args.p_category, content: args.p_content };
        notes.set(id, row);
        ownerHashes.set(id, args.p_owner_token);
        return { data: row, error: null };
      }
      if (name === 'delete_own_note') {
        if (ownerHashes.get(args.p_note_id) !== args.p_owner_token) return { data: false, error: null };
        notes.delete(args.p_note_id);
        ownerHashes.delete(args.p_note_id);
        return { data: true, error: null };
      }
      return { data: null, error: new Error('Unknown RPC') };
    }
  };
}

test('only the matching owner token can delete a note', async () => {
  const db = createFakeDatabase();
  const note = await createOwnedNote(db, {
    author: 'a stranger', category: 'thought', content: 'hello wall'
  }, 'owner-secret');
  assert.equal(db.notes.has(note.id), true);

  assert.equal(await deleteOwnedNote(db, note.id, 'someone-elses-secret'), false);
  assert.equal(db.notes.has(note.id), true);

  assert.equal(await deleteOwnedNote(db, note.id, 'owner-secret'), true);
  assert.equal(db.notes.has(note.id), false);
});

test('deleting without a token is rejected without calling the database', async () => {
  let called = false;
  const db = { rpc: async () => { called = true; return { data: true, error: null }; } };
  assert.equal(await deleteOwnedNote(db, 'note-1', null), false);
  assert.equal(called, false);
});
