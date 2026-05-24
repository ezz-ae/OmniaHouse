/**
 * Notes types — mirror the SQL:
 *   notes        (20260606)
 *   note_shares  (20260606)
 *
 * The content field is a ProseMirror/Tiptap JSON document so the Notebook
 * room can render rich text without storing HTML.
 */

export type NoteContent = {
  type: 'doc';
  content: any[];                // ProseMirror nodes
};

export type Note = {
  id: string;
  org_id: string;
  user_id: string;
  title: string;
  content: NoteContent;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type NoteShare = {
  note_id: string;
  user_id: string;               // shared with
  org_id: string;
};
