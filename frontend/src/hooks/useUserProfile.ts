import { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';
import type { Profile } from '@/lib/types';

interface UpdateProfileData {
  name?: string;
  username?: string;
  avatar_url?: string;
}

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export function useUserProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch current user profile
  async function fetchProfile(userId: string) {
    try {
      const { data, error: err } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (err) throw err;
      setProfile(data as Profile);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Update user profile
  async function updateProfile(userId: string, data: UpdateProfileData) {
    try {
      setLoading(true);

      // Check username uniqueness if changing username
      if (data.username && data.username !== profile?.username) {
        const { data: existing, error: checkErr } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', data.username)
          .neq('id', userId)
          .single();

        if (existing || checkErr === null) {
          throw new Error('Username sudah digunakan.');
        }
      }

      const { data: updated, error: err } = await supabase
        .from('profiles')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (err) throw err;
      setProfile(updated as Profile);
      setError(null);
      return updated;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // Change password
  async function changePassword(data: ChangePasswordData) {
    try {
      setLoading(true);

      // Verify current password
      const userEmail = profile?.email;
      if (!userEmail) throw new Error('Email tidak ditemukan.');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: data.currentPassword,
      });

      if (signInError) {
        throw new Error('Password saat ini salah.');
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (updateError) throw updateError;
      setError(null);
      return true;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // Upload avatar
  async function uploadAvatar(userId: string, file: File) {
    try {
      setLoading(true);

      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Ukuran file maksimal 5MB.');
      }

      const filename = `${userId}-${Date.now()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filename, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filename);

      const { data: updated, error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: urlData.publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (updateError) throw updateError;
      setProfile(updated as Profile);
      setError(null);
      return updated;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // Get all users (admin only)
  async function getAllUsers() {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;
      setError(null);
      return data as Profile[];
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }

  return {
    profile,
    loading,
    error,
    fetchProfile,
    updateProfile,
    changePassword,
    uploadAvatar,
    getAllUsers,
  };
}
