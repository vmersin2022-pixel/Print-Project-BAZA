import { createClient } from '@supabase/supabase-js';

// Используем переменные или вставляем строки напрямую для теста
const supabaseUrl = 'https://xvgubpzropafxxeazmvx.supabase.co'; 
const supabaseAnonKey = 'sb_publishable_iqsn5cDvfv0DPPMbbu8jng_GAP0zBTt';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);