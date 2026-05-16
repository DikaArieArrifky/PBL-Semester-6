const supabase = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

// Custom user service yang menggunakan separate table (safe approach)
async function createCustomUser(req, res) {
  const { email, name, password, role, cross_id } = req.body;

  console.log('[createCustomUser] Request body:', { email, name, role, cross_id, hasPassword: !!password });

  if (!email || !name || !password) {
    return res.status(400).json({
      error: 'email, name, password wajib diisi.'
    });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: 'Format email tidak valid.'
    });
  }

  // Password validation
  if (password.length < 6) {
    return res.status(400).json({
      error: 'Password minimal 6 karakter.'
    });
  }

  // Normalkan role ke kapital sesuai constraint schema
  const allowedRoles = ['Admin', 'Staff'];
  const normalizedRole = allowedRoles.find(
    r => r.toLowerCase() === (role ?? 'staff').toLowerCase()
  ) ?? 'Staff';

  try {
    // Generate UUID untuk user ID
    const userId = uuidv4();
    console.log('[createCustomUser] Generated user ID:', userId);

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('[createCustomUser] Password hashed');

    // Create user di custom_users table (separate from profiles)
    const { data: userData, error: userError } = await supabase
      .from('custom_users')
      .insert([{
        id: userId,
        email: email.toLowerCase(),
        name: name.trim(),
        password_hash: hashedPassword,
        role: normalizedRole,
        cross_id: cross_id ?? null,
        created_by: 'admin_interface'
      }])
      .select()
      .single();

    console.log('[createCustomUser] Custom user creation response:', { userData, userError });

    if (userError) {
      console.error('[createCustomUser] Custom user creation failed:', userError);
      return res.status(400).json({ 
        error: `Gagal membuat user: ${userError.message}. Pastikan table custom_users sudah dibuat.` 
      });
    }

    console.log('[createCustomUser] User created successfully in custom_users table');
    res.status(201).json({
      id: userId,
      email: email.toLowerCase(),
      name: name.trim(),
      role: normalizedRole,
      user_type: 'custom',
      note: 'User created via custom API. Login akan menggunakan custom auth system.'
    });

  } catch (error) {
    console.error('[createCustomUser] Unexpected error:', error);
    res.status(500).json({ 
      error: `Internal server error: ${error.message}` 
    });
  }
}

// Custom login function
async function customLogin(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Email dan password wajib diisi.'
    });
  }

  try {
    // Cari user di custom_users table
    const { data: user, error: userError } = await supabase
      .from('custom_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('is_active', true)
      .single();

    if (userError || !user) {
      return res.status(401).json({
        error: 'Email atau password salah.'
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        error: 'Email atau password salah.'
      });
    }

    // Return user data (tanpa password)
    const { password_hash, ...userWithoutPassword } = user;

    res.status(200).json({
      user: userWithoutPassword,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('[customLogin] Error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
}

// Get all users (both profiles and custom_users)
async function getAllUsers(req, res) {
  try {
    // Get Supabase auth users from profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    // Get custom users
    const { data: customUsers, error: customUsersError } = await supabase
      .from('custom_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }

    if (customUsersError) {
      console.error('Error fetching custom users:', customUsersError);
    }

    // Combine and format data
    const allUsers = [
      ...(profiles || []).map(p => ({ ...p, user_type: 'supabase_auth' })),
      ...(customUsers || []).map(u => ({ 
        ...u, 
        user_type: 'custom',
        // Rename password_hash to avoid exposing it
        password_hash: undefined 
      }))
    ];

    res.status(200).json({
      users: allUsers,
      total: allUsers.length
    });

  } catch (error) {
    console.error('[getAllUsers] Error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
}

module.exports = { createCustomUser, customLogin, getAllUsers };
