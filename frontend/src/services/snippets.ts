import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { SavedCode } from '../types';

function assertConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase not configured — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env');
  }
}

// Table: public.saved_snippets (id uuid, user_id uuid, title text, source_code text, created_at, updated_at)
// Map DB snake_case to frontend camelCase
function mapRow(row: {
  id: string;
  title: string;
  source_code: string;
  created_at: string;
  updated_at: string;
}): SavedCode {
  return {
    id: row.id,
    title: row.title,
    sourceCode: row.source_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const snippetsAPI = {
  async list(): Promise<SavedCode[]> {
    assertConfigured();
    const { data, error } = await supabase
      .from('saved_snippets')
      .select('id, title, source_code, created_at, updated_at')
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<SavedCode> {
    assertConfigured();
    const { data, error } = await supabase
      .from('saved_snippets')
      .select('id, title, source_code, created_at, updated_at')
      .eq('id', id)
      .single();
    if (error) throw new Error(error.message);
    return mapRow(data);
  },

  async create(title: string, sourceCode: string): Promise<SavedCode> {
    assertConfigured();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('saved_snippets')
      .insert({ user_id: user.id, title, source_code: sourceCode })
      .select('id, title, source_code, created_at, updated_at')
      .single();
    if (error) throw new Error(error.message);
    return mapRow(data);
  },

  async update(id: string, title: string, sourceCode: string): Promise<SavedCode> {
    assertConfigured();
    const { data, error } = await supabase
      .from('saved_snippets')
      .update({ title, source_code: sourceCode })
      .eq('id', id)
      .select('id, title, source_code, created_at, updated_at')
      .single();
    if (error) throw new Error(error.message);
    return mapRow(data);
  },

  async remove(id: string): Promise<void> {
    assertConfigured();
    const { error } = await supabase.from('saved_snippets').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};
