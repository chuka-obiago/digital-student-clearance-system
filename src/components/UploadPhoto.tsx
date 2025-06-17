import React, { useRef, useState, useEffect } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { uploadToCloudinary } from '../lib/cloudinary';
import UserIcon from '../assets/images/studenticon.png';

const MAX_FILE_SIZE_MB = 2;

interface UploadPhotoProps {
  onPhotoUpdate?: (photoUrl: string | null) => void;
}

const UploadPhoto: React.FC<UploadPhotoProps> = ({ onPhotoUpdate }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Listen to auth state changes and load user photo
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser?.uid) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.photoUrl) {
              setImageSrc(userData.photoUrl);
            }
          }
        } catch (error) {
          console.error('Error loading user photo:', error);
        }
      } else {
        setImageSrc(null);
      }
      
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);



  // Save photo URL to Firestore
  const savePhotoToFirestore = async (photoUrl: string) => {
    if (!user?.uid) throw new Error('User not authenticated');

    const userDocRef = doc(db, 'users', user.uid);
    
    // Use setDoc with merge to create document if it doesn't exist
    await setDoc(userDocRef, {
      photoUrl,
      updatedAt: new Date(),
    }, { merge: true });
  };

  // Remove photo from Firestore
  const removePhotoFromFirestore = async () => {
    if (!user?.uid) throw new Error('User not authenticated');

    const userDocRef = doc(db, 'users', user.uid);
    
    // Use setDoc with merge to ensure document exists
    await setDoc(userDocRef, {
      photoUrl: null,
      updatedAt: new Date(),
    }, { merge: true });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      alert(`File too large. Max size is ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    if (!user?.uid) {
      alert('Please log in to upload a photo.');
      return;
    }

    setIsUploading(true);

    try {
      // Upload to Cloudinary
      const photoUrl = await uploadToCloudinary(file);
      
      // Save URL to Firestore
      await savePhotoToFirestore(photoUrl);
      
      // Update local state
      setImageSrc(photoUrl);
      setIsModalOpen(false);
      
      // Notify parent component if callback provided
      onPhotoUpdate?.(photoUrl);
      
      // Success message shows different text for new upload vs update
      alert(imageSrc ? 'Photo updated successfully!' : 'Photo uploaded successfully!');
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleBoxClick = () => {
    if (!isLoading) {
      setIsModalOpen(true);
    }
  };

  const handleUploadClick = () => {
    inputRef.current?.click();
  };

  const handleRemove = async () => {
    if (!user?.uid) {
      alert('Please log in to remove photo.');
      return;
    }

    setIsUploading(true);

    try {
      // Remove from Firestore
      await removePhotoFromFirestore();
      
      // Update local state
      setImageSrc(null);
      setIsModalOpen(false);
      
      // Notify parent component if callback provided
      onPhotoUpdate?.(null);
      
      alert('Photo removed successfully!');
    } catch (error) {
      console.error('Error removing photo:', error);
      alert('Failed to remove photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center">
        <div className="w-48 h-48 rounded-full bg-gray-200 animate-pulse flex justify-center items-center">
          <span className="text-gray-500">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center">
      <div
        onClick={handleBoxClick}
        className="w-48 h-48 rounded-full overflow-hidden border-2 border-dashed border-gray-300 flex justify-center items-center cursor-pointer hover:border-blue-400 transition relative"
      >
        {imageSrc || !isLoading ? (
          <img
            src={imageSrc || UserIcon}
            alt="Uploaded or placeholder"
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-500">
            <Upload className="w-8 h-8 mb-2" />
            <span className="text-sm">Upload Photo</span>
          </div>
        )}
        {isUploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col justify-center items-center">
            <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
            <span className="text-white text-sm">Uploading...</span>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg relative max-w-sm w-full">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              disabled={isUploading}
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="w-full h-64 mb-4 relative">
              <img
                src={imageSrc || UserIcon}
                alt="Enlarged preview"
                className="w-full h-full object-cover rounded-md"
              />
              {isUploading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col justify-center items-center rounded-md">
                  <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
                  <span className="text-white text-sm">
                    {imageSrc ? 'Updating...' : 'Uploading...'}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex justify-between">
              <button
                onClick={handleRemove}
                disabled={isUploading || !imageSrc}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Removing...
                  </>
                ) : (
                  'Remove'
                )}
              </button>
              <button
                onClick={handleUploadClick}
                disabled={isUploading}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {imageSrc ? 'Updating...' : 'Uploading...'}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    {imageSrc ? 'Change Photo' : 'Upload Photo'}
                  </>
                )}
              </button>
            </div>
            
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              disabled={isUploading}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadPhoto;