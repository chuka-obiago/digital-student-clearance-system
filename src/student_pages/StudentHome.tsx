import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MyNavbar from '../components/MyNavbar';
import UploadPhoto from '../components/UploadPhoto';
import ProgressBar from '../components/ProgressBar';
import StudentProfileModal from '../components/StudentProfileModal';

import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// Declare __app_id globally for TypeScript to recognize it.
declare const __app_id: string | undefined;

// Student data stored in Firestore
interface StudentData {
  fullName: string;
  department: string;
  level: string;
  matricNumber: string;
  email: string;
}

const UserHome: React.FC = () => {
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState<any>(null); // Authenticated Firebase user
  const [studentData, setStudentData] = useState<StudentData | null>(null); // Data fetched from Firestore

  useEffect(() => {
    // Listen for Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseUser(user);
        // User is signed in, now fetch their details from Firestore
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const userId = user.uid;

        try {
          const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/user_details`, userId);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            setStudentData(userDocSnap.data() as StudentData);
          } else {
            console.warn("No student data found in Firestore for user:", userId);
            setStudentData(null); // Ensure data is null if not found
          }
        } catch (error) {
          console.error("Error fetching student data from Firestore:", error);
          setStudentData(null);
        } finally {
          setLoading(false); // Finished loading attempt
        }
      } else {
        // User is signed out
        setFirebaseUser(null);
        setStudentData(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []); // Empty dependency array means this effect runs once on mount

  // Helper function to extract the first name
  const getFirstName = (fullName: string | null | undefined): string => {
    if (!fullName) {
      return 'Guest'; // Fallback if full name is not available
    }
    const parts = fullName.trim().split(' ');
    return parts[0] || 'Student'; // Return first part, or 'Student' if empty
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 font-inter text-gray-800">
        <p className="text-xl">Loading student data...</p>
      </div>
    );
  }

  // Fallback if no student data could be loaded (e.g., not logged in, data missing)
  if (!firebaseUser || !studentData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 font-inter text-gray-800 p-4 text-center">
        <h2 className="text-3xl font-bold text-red-600 mb-4">Access Denied or Data Missing</h2>
        <p className="text-lg text-gray-700 mb-6">
          You are either not logged in or your student profile data could not be found.
          Please ensure you are logged in with a student account.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
        >
          Go to Login
        </button>
      </div>
    );
  }


  return (
    // Main container for the whole page
    <div className="min-h-screen bg-gray-100 font-inter text-gray-800">
      {/* Navigation bar */}
      <MyNavbar activeItem="Home" />

      {/* Main content area */}
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
          Welcome, {getFirstName(studentData.fullName)}! {/* Dynamically display first name */}
        </h2>
        <p className="text-lg text-gray-700 mb-10">
          Here’s a quick overview of your clearance status and profile.
        </p>

        {/* Container for the photo upload/profile and progress bar sections */}
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-10 lg:gap-16">
          {/* Upload Photo & View Profile Section */}
          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md flex flex-col items-center flex-shrink-0 w-full md:w-auto min-w-[280px]">
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">Your Photo</h3>

            {/* UploadPhoto component for circular image upload */}
            <UploadPhoto />

            {/* Button to open the profile modal */}
            <button
              onClick={() => setIsProfileOpen(true)}
              className="mt-6 px-7 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
            >
              View Profile
            </button>
          </div>

          {/* Progress Bar Section */}
          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md flex-1 w-full max-w-2xl">
            <h3 className="text-2xl font-semibold text-gray-800 mb-6">Progress Tracker</h3>
            <ProgressBar />   
          </div>
        </div>
      </div>

      {/* Student Profile Modal */}
      {/* Pass dynamically fetched studentData */}
      <StudentProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        student={studentData}
      />
    </div>
  );
};

export default UserHome;
