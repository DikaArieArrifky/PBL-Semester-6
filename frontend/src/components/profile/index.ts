/**
 * Profile & User Management Components Index
 * 
 * This file serves as a central reference for all profile and user management components
 * across the application.
 */

// ─── User Profile Components ──────────────────────────────────────────────────

/**
 * UserProfileCard Component
 * Location: src/components/profile/UserProfileCard.tsx
 * 
 * A reusable card component for displaying user profile information.
 * 
 * @example
 * import { UserProfileCard } from '@/components/profile/UserProfileCard';
 * 
 * // Full card layout
 * <UserProfileCard 
 *   profile={profile}
 *   isCurrentUser={true}
 * />
 * 
 * // Compact layout (single line)
 * <UserProfileCard 
 *   profile={profile}
 *   compact={true}
 * />
 * 
 * @interface Props
 * - profile: Profile - User profile data
 * - isCurrentUser?: boolean - Show edit button if true
 * - compact?: boolean - Use compact layout
 */
export { UserProfileCard } from './profile/UserProfileCard';

/**
 * UserList Component
 * Location: src/components/profile/UserList.tsx
 * 
 * A reusable component for displaying a list of users with actions.
 * 
 * @example
 * import { UserList } from '@/components/profile/UserList';
 * 
 * <UserList 
 *   users={userArray}
 *   loading={isLoading}
 *   onSelectUser={(user) => handleUserClick(user)}
 *   showLink={true}
 * />
 * 
 * @interface Props
 * - users: Profile[] - Array of users to display
 * - loading?: boolean - Loading state
 * - onSelectUser?: (user: Profile) => void - Callback on user selection
 * - showLink?: boolean - Show link to user detail page
 */
export { UserList } from './profile/UserList';

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * useUserProfile Hook
 * Location: src/hooks/useUserProfile.ts
 * 
 * Custom hook for managing user profile operations.
 * 
 * @example
 * import { useUserProfile } from '@/hooks/useUserProfile';
 * 
 * const {
 *   profile,
 *   loading,
 *   error,
 *   fetchProfile,
 *   updateProfile,
 *   changePassword,
 *   uploadAvatar,
 *   getAllUsers,
 * } = useUserProfile();
 * 
 * // Fetch a specific user
 * await fetchProfile(userId);
 * 
 * // Update user profile
 * await updateProfile(userId, {
 *   name: 'New Name',
 *   username: 'newusername'
 * });
 * 
 * // Change password
 * await changePassword({
 *   currentPassword: '...',
 *   newPassword: '...'
 * });
 * 
 * // Upload avatar
 * await uploadAvatar(userId, avatarFile);
 * 
 * // Get all users (admin only)
 * const allUsers = await getAllUsers();
 * 
 * @returns {Object}
 * - profile: Profile | null - Current user profile
 * - loading: boolean - Loading state
 * - error: string | null - Error message if any
 * - fetchProfile: (userId: string) => Promise<void>
 * - updateProfile: (userId: string, data: UpdateProfileData) => Promise<Profile>
 * - changePassword: (data: ChangePasswordData) => Promise<boolean>
 * - uploadAvatar: (userId: string, file: File) => Promise<Profile>
 * - getAllUsers: () => Promise<Profile[]>
 */
export { useUserProfile } from './useUserProfile';

// ─── Pages ────────────────────────────────────────────────────────────────────

/**
 * Profile Page (User's Personal Profile)
 * Location: src/pages/profile/index.tsx
 * Access: /profile
 * Auth: Required
 * 
 * Page for users to manage their personal profile with three tabs:
 * 
 * 1. Profile Tab
 *    - View email (read-only)
 *    - Edit name
 *    - Edit username
 *    - View role
 *    - View crossing assignment
 *    - View account dates
 * 
 * 2. Avatar Tab
 *    - Upload profile picture
 *    - Preview avatar
 *    - File validation (max 5MB)
 * 
 * 3. Password Tab
 *    - Verify current password
 *    - Set new password
 *    - Password strength requirements
 * 
 * Features:
 * - Edit personal information
 * - Upload/change avatar
 * - Change password securely
 * - Logout button
 * - Success/error messages
 */

/**
 * User Detail Page (Public User Profile)
 * Location: src/pages/user/[id].tsx
 * Access: /user/:userId
 * Auth: Required
 * 
 * Public profile page for viewing other users' information.
 * 
 * Displays:
 * - User avatar
 * - Full name and username
 * - Email address
 * - Role (Admin/Staff)
 * - Crossing assignment (if staff)
 * - Join date
 * - Last updated date
 * 
 * Features:
 * - View other users' public profiles
 * - Back navigation
 * - Error handling for non-existent users
 */

/**
 * User Management Page (Admin Only)
 * Location: src/pages/admin/users.tsx
 * Access: /admin/users
 * Auth: Required (super_admin only)
 * 
 * Admin dashboard for managing all system users.
 * 
 * Features:
 * - View list of all users in table format
 * - Create new users (with email, name, username, password, role, crossing)
 * - Edit user information (name, username, role, crossing)
 * - Delete users
 * - Search/filter functionality
 * 
 * Modal Forms:
 * - Add User: Create new user account
 * - Edit User: Modify existing user details
 */

/**
 * Settings & Preferences Page
 * Location: src/pages/settings/index.tsx
 * Access: /settings
 * Auth: Required
 * 
 * User settings and preferences management page.
 * 
 * Tabs:
 * 
 * 1. Notifications
 *    - Email notifications toggle
 *    - Push notifications toggle
 *    - Alert type preferences
 * 
 * 2. Appearance
 *    - Dark mode toggle
 *    - Language selection (ID/EN)
 *    - Theme customization
 * 
 * 3. Privacy
 *    - Profile visibility settings
 *    - Activity status visibility
 *    - Data & privacy information
 * 
 * Features:
 * - Toggle options for different settings
 * - Save preferences to localStorage
 * - Success/error feedback
 */

// ─── Data Types ───────────────────────────────────────────────────────────────

/**
 * Profile Type
 * Location: src/lib/types.ts
 * 
 * interface Profile {
 *   id: string;              // User ID from Supabase Auth
 *   email: string;           // Email address
 *   username: string;        // Unique username
 *   name: string;            // Full name
 *   role: 'super_admin' | 'staff'; // User role
 *   avatar_url: string | null; // Avatar image URL
 *   cross_id: string | null; // Assigned crossing (null = super admin)
 *   created_at: string;      // ISO datetime
 *   updated_at: string;      // ISO datetime
 * }
 */

// ─── Database Schema ──────────────────────────────────────────────────────────

/**
 * Supabase Tables Used
 * 
 * 1. profiles
 *    - id (uuid, primary key)
 *    - email (text, unique)
 *    - username (text, unique)
 *    - name (text)
 *    - role (text: 'super_admin' | 'staff')
 *    - avatar_url (text, nullable)
 *    - cross_id (text, nullable)
 *    - created_at (timestamp)
 *    - updated_at (timestamp)
 * 
 * 2. Storage Buckets
 *    - avatars (public bucket for user avatar images)
 */

// ─── API Endpoints ───────────────────────────────────────────────────────────

/**
 * Backend API Endpoints Required
 * 
 * POST /api/admin/users
 * Create a new user (admin only)
 * 
 * @body {
 *   email: string,
 *   name: string,
 *   username: string,
 *   password: string,
 *   role: 'super_admin' | 'staff',
 *   cross_id?: string
 * }
 * 
 * @returns {
 *   id: string,
 *   email: string,
 *   username: string,
 *   name: string,
 *   role: string,
 *   cross_id: string | null
 * }
 * 
 * ---
 * 
 * DELETE /api/admin/users/:userId
 * Delete a user (admin only)
 * 
 * @returns { success: boolean }
 */

// ─── Styling ──────────────────────────────────────────────────────────────────

/**
 * Styling Guidelines
 * 
 * Colors:
 * - Primary: Cyan (#06b6d4)
 * - Background: Dark slate (#05070a)
 * - Card: Slightly lighter slate (#0a0f18)
 * - Text: Slate 200-300
 * - Borders: Slate 700-800
 * 
 * Components use Tailwind CSS with custom color palette.
 * Icons from Lucide React.
 */

// ─── Security Considerations ──────────────────────────────────────────────────

/**
 * Security Features Implemented
 * 
 * 1. Authentication
 *    - withAuth HOC wrapper protects routes
 *    - Role-based access control
 * 
 * 2. Password Security
 *    - Current password verification before change
 *    - Minimum 8 character requirement
 *    - Password validation
 * 
 * 3. Username Uniqueness
 *    - Automatic uniqueness check before save
 *    - Prevents duplicate usernames
 * 
 * 4. Avatar Upload
 *    - File size validation (max 5MB)
 *    - File type validation (images only)
 *    - Secure storage with unique filenames
 * 
 * 5. Access Control
 *    - Admin pages require 'super_admin' role
 *    - User pages require authentication
 *    - Public profiles show limited information
 */

export default {};
