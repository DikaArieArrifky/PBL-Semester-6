const supabase = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

// ---------------------------------------------------------------------------
// Schema acuan profiles:
//   id, email, name, role (CHECK: 'Admin' | 'Staff'),
//   avatar_url, cross_id, created_at, updated_at
//
// TIDAK ada kolom: username
// role harus kapital: 'Admin' atau 'Staff'
// ---------------------------------------------------------------------------

async function createUser(req, res) {
  const { email, name, password, role, cross_id } = req.body;

  console.log('[createUser] Request body:', { email, name, role, cross_id, hasPassword: !!password });
  console.log('[createUser] Environment check:', {
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...',
    keyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...'
  });

  if (!email || !name || !password) {
    return res.status(400).json({
      error: 'email, name, password wajib diisi.'
    });
  }

  // Check Supabase configuration
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[createUser] Missing Supabase configuration');
    return res.status(500).json({
      error: 'Supabase configuration missing. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend .env'
    });
  }

  // Normalkan role ke kapital sesuai constraint schema
  const allowedRoles = ['Admin', 'Staff'];
  const normalizedRole = allowedRoles.find(
    r => r.toLowerCase() === (role ?? 'staff').toLowerCase()
  ) ?? 'Staff';

  console.log('[createUser] Creating user with service role key...');

  try {
    // Create auth user using service role key
    console.log('[createUser] Attempting to create auth user...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: name.trim(),
        role: normalizedRole,
        cross_id: cross_id || null
      }
    });

    console.log('[createUser] Auth response:', { 
      authData: authData ? { id: authData.user?.id, email: authData.user?.email } : null, 
      authError 
    });

    if (authError) {
      console.error('[createUser] Auth creation failed:', authError);
      
      // Try alternative approach - create user without metadata first
      console.log('[createUser] Trying without metadata...');
      const { data: authData2, error: authError2 } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });

      console.log('[createUser] Alternative auth response:', { 
        authData2: authData2 ? { id: authData2.user?.id, email: authData2.user?.email } : null, 
        authError2 
      });

      if (authError2) {
        console.error('[createUser] Both auth attempts failed');
        return res.status(400).json({ 
          error: `Supabase auth error: ${authError2.message}. 

Debug info:
- Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}
- Service Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Present' : 'Missing'}
- Error: ${authError2.message}

Solusi: 
1. Pastikan service role key benar dari Supabase dashboard
2. Pastikan NEXT_PUBLIC_SUPABASE_URL benar
3. Coba buat user manual di Supabase dashboard` 
        });
      }

      const userId = authData2.user.id;
      console.log('[createUser] User created without metadata, ID:', userId);

      // Create profile separately
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: userId,
          email: email.toLowerCase(),
          name: name.trim(),
          role: normalizedRole,
          cross_id: cross_id ?? null
        }])
        .select()
        .single();

      if (profileError) {
        console.error('[createUser] Profile creation failed:', profileError);
        return res.status(400).json({ 
          error: `Profile creation failed: ${profileError.message}` 
        });
      }

      console.log('[createUser] User and profile created successfully');
      return res.status(201).json({
        id: userId,
        email: email.toLowerCase(),
        name: name.trim(),
        role: normalizedRole
      });
    }

    const userId = authData.user.id;
    console.log('[createUser] Auth user created successfully, ID:', userId);

    // Check if profile already exists (auto-created by trigger)
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (checkError && checkError.code === 'PGRST116') {
      // Profile doesn't exist, create it manually
      console.log('[createUser] Profile not found, creating manually...');
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: userId,
          email: email.toLowerCase(),
          name: name.trim(),
          role: normalizedRole,
          cross_id: cross_id ?? null
        }])
        .select()
        .single();

      if (profileError) {
        console.error('[createUser] Profile creation failed:', profileError);
        return res.status(400).json({ 
          error: `Profile creation failed: ${profileError.message}` 
        });
      }
    } else if (checkError) {
      console.error('[createUser] Profile check failed:', checkError);
      return res.status(400).json({ 
        error: `Profile check failed: ${checkError.message}` 
      });
    }

    console.log('[createUser] User created successfully via service role key');
    res.status(201).json({
      id: userId,
      email: email.toLowerCase(),
      name: name.trim(),
      role: normalizedRole
    });

  } catch (error) {
    console.error('[createUser] Unexpected error:', error);
    res.status(500).json({ 
      error: `Internal server error: ${error.message}` 
    });
  }
}

async function deleteUser(req, res) {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'User id diperlukan.' });
  }

  const { error: authError } =
    await supabase.auth.admin.deleteUser(id);

  if (authError) {
    return res.status(400).json({ error: authError.message });
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .delete()
    .eq('id', id);

  if (profileError) {
    console.warn('[deleteUser] profil gagal dihapus:', profileError.message);
  }

  res.json({ success: true });
}

async function deleteDevice(req, res) {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Device id diperlukan.' });
  }

  try {
    // Ambil daftar komponen untuk device ini
    const { data: components } = await supabase
      .from('device_components')
      .select('component_id')
      .eq('device_id', id);

    if (components && components.length > 0) {
      const componentIds = components.map(c => c.component_id);
      
      // Hapus data yang mereferensikan component_id
      await supabase.from('sensor_events').delete().in('component_id', componentIds);
      await supabase.from('alerts').delete().in('component_id', componentIds);
      await supabase.from('latest_component_state').delete().in('component_id', componentIds);
      
      // Hapus device_components
      await supabase.from('device_components').delete().eq('device_id', id);
    }

    // Hapus device (service role key bypasses RLS)
    const { data, error } = await supabase
      .from('devices')
      .delete()
      .eq('device_id', id)
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Device tidak ditemukan.' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[deleteDevice] Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { createUser, deleteUser, deleteDevice };