import supabase from './supabase';

// Initialize storage buckets if they don't exist
export async function initializeStorage() {
  try {
    // Check if avatars bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const avatarsBucket = buckets?.find(b => b.name === 'avatars');
    
    if (!avatarsBucket) {
      console.log('Creating avatars bucket...');
      const { error } = await supabase.storage.createBucket('avatars', {
        public: true,
        allowedMimeTypes: ['image/*'],
        fileSizeLimit: 5242880, // 5MB
      });
      
      if (error) {
        console.error('Error creating avatars bucket:', error);
        return false;
      }
      
      console.log('Avatars bucket created successfully');
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing storage:', error);
    return false;
  }
}

// Test upload function
export async function testUpload(userId: string) {
  try {
    const testFilePath = `avatars/test_${userId}.txt`;
    const testContent = 'test file';
    
    const { error } = await supabase.storage
      .from('avatars')
      .upload(testFilePath, new Blob([testContent]), {
        upsert: true,
        contentType: 'text/plain'
      });
    
    if (error) {
      console.error('Test upload failed:', error);
      return false;
    }
    
    // Clean up test file
    await supabase.storage.from('avatars').remove([testFilePath]);
    
    console.log('Storage test passed');
    return true;
  } catch (error) {
    console.error('Storage test failed:', error);
    return false;
  }
}
