import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase'; 
import { Loader2 } from 'lucide-react'; 

// Declare __app_id globally 
declare const __app_id: string | undefined;

// Interface for Firestore document data for type safety
interface ClearanceDocument {
  id: string; // The document ID from Firestore
  studentId: string;
  department: string;
  status: 'Approved' | 'Rejected' | 'Pending' | 'Not Submitted';
}

// Your provided ProgressBar component
interface ProgressBarProps {
  value: number;
  label?: string;
  color?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  label = '',
  color = 'bg-blue-600',
}) => {
  return (
    <div className="w-full">
      {label && (
        <div className="mb-1 text-sm font-medium text-gray-700">{label}</div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500 ease-in-out`}
          style={{ width: `${value}%` }}
        />
      </div>
      <div className="text-right text-xs text-gray-600 mt-1">{value}%</div>
    </div>
  );
};


const StudentClearanceProgress: React.FC = () => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Constants for progress calculation
  const INITIAL_PROGRESS = 20;
  const TOTAL_DEPARTMENTS = 8;
  const PROGRESS_PER_APPROVED_DEPARTMENT = (100 - INITIAL_PROGRESS) / TOTAL_DEPARTMENTS; // 10% per approved document

  // Function to fetch and calculate progress
  const calculateProgress = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      // Query the 'clearance_documents' root collection
      const q = query(
        collection(db, 'clearance_documents'),
        where('studentId', '==', uid),
        where('status', '==', 'Approved') // Only count approved documents
      );

      const querySnapshot = await getDocs(q);
      const approvedCount = querySnapshot.docs.length;

      let calculatedProgress = INITIAL_PROGRESS + (approvedCount * PROGRESS_PER_APPROVED_DEPARTMENT);

      // Ensure progress does not exceed 100%
      if (calculatedProgress > 100) {
        calculatedProgress = 100;
      }

      setProgress(calculatedProgress);
      console.log(`[Progress Bar] Approved documents: ${approvedCount}, Calculated Progress: ${calculatedProgress}%`);

    } catch (err) {
      console.error("Error fetching clearance documents for progress:", err);
      setError("Failed to load progress. Please try again.");
      setProgress(INITIAL_PROGRESS); // Fallback to initial progress on error
    } finally {
      setLoading(false);
    }
  }, []);

  // Effect to listen for Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setFirebaseUser(user);
        calculateProgress(user.uid); // Calculate progress for the logged-in user
      } else {
        setFirebaseUser(null);
        setProgress(0); // Reset progress if no user is logged in
        setLoading(false);
      }
    });

    return () => unsubscribe(); // Cleanup subscription
  }, [calculateProgress]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4 text-gray-700">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading progress...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4 text-red-600 text-center">
        Error: {error}
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <div className="py-4 text-gray-600 text-center">
        Please log in to view your clearance progress.
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg mt-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-800"> </h2>
      <ProgressBar value={progress} label="Overall Clearance Progress" color="bg-blue-600" />
      <p className="text-sm text-gray-600 mt-2">
        Your clearance is currently {progress}% complete.
      </p>
    </div>
  );
};

export default StudentClearanceProgress;
