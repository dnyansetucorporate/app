/**
 * Utility functions for handling image URLs and file validation
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const FILE_BASE = API_URL.replace(/\/api\/?$/i, '');

/**
 * Convert a relative or absolute image path to a full URL for display
 * @param path - The image path (e.g., 'uploads/students/filename.jpg' or full URL)
 * @returns Full URL string or null if no path provided
 */
export const buildImageUrl = (path?: string | null): string | null => {
  if (!path) return null;
  // If already a full URL, return as-is
  if (/^https?:\/\//i.test(path)) return path;
  // Otherwise, prepend the file base URL
  return `${FILE_BASE}/${String(path).replace(/^\/+/, '')}`;
};

/**
 * Validate image file before upload
 * @param file - The file to validate
 * @param maxSizeMB - Maximum file size in MB (default 1)
 * @returns Error message if validation fails, null if valid
 */
export const validateImageFile = (
  file: File,
  maxSizeMB: number = 1
): string | null => {
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return `Invalid file type. Allowed types: JPG, JPEG, PNG, GIF, WEBP`;
  }

  // Validate file size
  const maxSize = maxSizeMB * 1024 * 1024;
  if (file.size > maxSize) {
    return `File size must not exceed ${maxSizeMB}MB (Current: ${(file.size / 1024 / 1024).toFixed(2)}MB)`;
  }

  return null;
};

/**
 * Create a preview URL from a File object
 * @param file - The file to create preview for
 * @returns Object URL for preview (must be revoked after use)
 */
export const createPreviewUrl = (file: File): string => {
  return URL.createObjectURL(file);
};

/**
 * Revoke a preview URL to free up memory
 * @param url - The preview URL to revoke
 */
export const revokePreviewUrl = (url: string | null): void => {
  if (url) {
    URL.revokeObjectURL(url);
  }
};
