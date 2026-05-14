import { createClient } from '@supabase/supabase-js';

// Create admin client with service role key for user management
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!, // Use service role key from frontend env
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

export default supabaseAdmin;
