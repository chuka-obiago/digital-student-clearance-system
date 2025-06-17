import axios from 'axios';

export const uploadToCloudinary = async (file: File) => {
  const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', preset);

  // Add resource_type for PDFs
  if (file.type === 'application/pdf') {
    formData.append('resource_type', 'raw');
  }

  try {
    const res = await axios.post(
      `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      formData
    );
    return res.data.secure_url; // <- store this in Firestore
  } catch (err) {
    console.error('Upload failed:', err);
    throw err;
  }
};


