"use client";
import { useState, useEffect } from 'react';
import { Camera, Upload, X, Save, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import supabase from '@/lib/supabase';
import { initializeStorage } from '@/lib/storage';

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [storageReady, setStorageReady] = useState(false);

  // Mark storage as ready by default (bucket should exist)
  useEffect(() => {
    setStorageReady(true);
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('Image size should be less than 5MB');
        return;
      }

      setAvatarFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUpload = async () => {
    if (!avatarFile || !profile) return;

    setUploading(true);
    try {
      console.log('Starting avatar upload for user:', profile.id);
      console.log('File:', avatarFile.name, 'Size:', avatarFile.size, 'Type:', avatarFile.type);

      let avatarUrl = '';

      // Try Supabase Storage first
      try {
        // Generate unique filename
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${profile.id}_${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        console.log('Attempting Supabase Storage upload to:', filePath);

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, {
            upsert: true,
            contentType: avatarFile.type
          });

        if (uploadError) {
          console.warn('Supabase Storage failed, trying fallback:', uploadError.message);
          throw new Error(`Storage upload failed: ${uploadError.message}`);
        }

        console.log('Supabase Storage upload successful:', uploadData);

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        avatarUrl = publicUrl;
        console.log('Supabase public URL:', avatarUrl);

      } catch (storageError) {
        console.warn('Storage upload failed, using base64 fallback');
        
        // Fallback: Convert to base64 and store directly in database
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result);
          };
          reader.readAsDataURL(avatarFile);
        });
        
        avatarUrl = await base64Promise;
        console.log('Using base64 fallback, length:', avatarUrl.length);
      }

      // Update profile with avatar URL
      const { data: updateData, error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', profile.id)
        .select()
        .single();

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw new Error(`Profile update failed: ${updateError.message}`);
      }

      console.log('Profile updated:', updateData);

      // Refresh profile data
      await refreshProfile();
      
      // Clear state
      setAvatarFile(null);
      setPreviewUrl('');
      
      alert('Avatar updated successfully!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to upload avatar: ${errorMessage}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      // Remove avatar URL from profile
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', profile.id);

      if (error) throw error;

      await refreshProfile();
      alert('Avatar removed successfully!');
    } catch (error) {
      console.error('Error removing avatar:', error);
      alert('Failed to remove avatar');
    } finally {
      setSaving(false);
    }
  };

  const cancelUpload = () => {
    setAvatarFile(null);
    setPreviewUrl('');
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#05070a] text-slate-200 p-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-200 p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white italic mb-2">
            PROFILE
          </h1>
          <p className="text-slate-500">
            Manage your profile information and avatar
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-[#0a0f18] border border-slate-800 rounded-3xl p-8 space-y-6">
          {/* Avatar Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Profile Picture</h2>
            
            <div className="flex items-center gap-6">
              {/* Current Avatar */}
              <div className="relative">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover ring-2 ring-cyan-500/20"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center">
                    <span className="text-2xl font-bold text-slate-400">
                      {profile.name?.[0]?.toUpperCase() ?? '?'}
                    </span>
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-3">
                {previewUrl ? (
                  // Preview state
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-16 h-16 rounded-full object-cover border-2 border-cyan-500/50"
                      />
                      <div className="flex-1">
                        <p className="text-sm text-slate-300">New avatar preview</p>
                        <p className="text-xs text-slate-500">{avatarFile?.name}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleUpload}
                        disabled={uploading}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 rounded-lg transition-colors"
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Save Avatar
                          </>
                        )}
                      </button>
                      <button
                        onClick={cancelUpload}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // Normal state
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg cursor-pointer transition-colors">
                      <Upload className="w-4 h-4" />
                      <span className="text-sm">Choose new avatar</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                    {profile.avatar_url && (
                      <button
                        onClick={handleRemoveAvatar}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Removing...
                          </>
                        ) : (
                          <>
                            <X className="w-4 h-4" />
                            Remove Avatar
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <div className="space-y-4 border-t border-slate-800 pt-6">
            <h2 className="text-lg font-bold text-white">Profile Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider">Name</label>
                <p className="text-white font-medium">{profile.name}</p>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider">Email</label>
                <p className="text-white font-medium">{profile.email}</p>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider">Role</label>
                <p className="text-white font-medium">{profile.role}</p>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider">Member Since</label>
                <p className="text-white font-medium">
                  {new Date(profile.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
