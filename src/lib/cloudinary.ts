import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'wsyilbbn',
  api_key: process.env.CLOUDINARY_API_KEY || '111599425492849',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'JAvSq2dZEPA9MQ7psxRJJ1I_xrk',
  secure: true
});

export default cloudinary;

/**
 * Uploads a base64 data string, buffer, or remote URL to Cloudinary
 * Returns the permanent, optimized HTTPS CDN URL
 */
export async function uploadToCloudinary(
  fileData: string,
  folder = 'ruaad_smart'
): Promise<string> {
  if (!fileData) return '';
  
  // If it's already an external HTTPS/CDN URL, return as is
  if (fileData.startsWith('http://') || fileData.startsWith('https://')) {
    return fileData;
  }

  try {
    const res = await cloudinary.uploader.upload(fileData, {
      folder,
      resource_type: 'auto',
      quality: 'auto:good',
      fetch_format: 'auto',
    });
    return res.secure_url;
  } catch (error: any) {
    console.error('Cloudinary upload error:', error.message);
    // Fallback to original data if upload fails so user doesn't lose their image
    return fileData;
  }
}
