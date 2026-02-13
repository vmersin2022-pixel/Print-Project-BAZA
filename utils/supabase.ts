import { createClient } from '@supabase/supabase-js';

// Используем переменные или вставляем строки напрямую для теста
const supabaseUrl = 'https://mtvpselwqpxbptipwjqe.supabase.co'; 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10dnBzZWx3cXB4YnB0aXB3anFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MTg1NDIsImV4cCI6MjA4NjM5NDU0Mn0.23laBMlR8hiOKFY3-8bmDR2NAo1eaPqdaeZKeWgsczE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);