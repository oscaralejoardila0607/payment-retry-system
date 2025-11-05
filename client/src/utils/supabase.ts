import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ccejxvhnuyppxjboenww.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjZWp4dmhudXlwcHhqYm9lbnd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyOTI2MzQsImV4cCI6MjA3Nzg2ODYzNH0.2Bf1gZZ2nmSBJOkMoiX7IfZHDsav5GiJ_Mj4AlJKFGE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
