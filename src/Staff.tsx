import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User as LucideUser, 
  LogOut, X, FileText, Loader2,
  // CheckCircle2,
  // Clock,
  // AlertCircle,
} from 'lucide-react'; 
import LogoImage from './assets/images/caleblogo.png'; 
import UploadPhoto from './components/UploadPhoto'; 

// Firebase imports
import { auth, db } from './lib/firebase'; 
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, getDoc, updateDoc, collectionGroup, query, where, getDocs } from 'firebase/firestore';

// Declare __app_id globally 
declare const __app_id: string | undefined;


// Interface for the actual data fields stored within a Firestore document
interface FirestoreDocumentData {
  studentId: string;
  studentName: string; // Full name of the student who uploaded
  department: string; // The department the document belongs to (e.g., 'Academic Affairs', 'Library')
  fileUrl: string;
  status: DocumentStatus;
  uploadedAt: string; 
  cloudinaryPublicId: string; 
}

// Full Document interface, combining Firestore data with the document ID
type DocumentStatus = 'Approved' | 'Rejected' | 'Pending' | 'Not Submitted'; // Match student's clearance status types
interface Document extends FirestoreDocumentData {
  id: string; // This will hold the Firestore document ID (docSnap.id)
}


// Interface for staff user data stored in Firestore
interface StaffProfileData {
  fullName: string;
  email: string;
  department: string; // e.g., 'Academic Affairs' or 'library' 
  userType: 'student' | 'staff' | 'admin'; 
}

// Custom Message Modal Component 
interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  type: 'success' | 'error';
}

const MessageModal: React.FC<MessageModalProps> = ({ isOpen, onClose, message, type }) => {
  if (!isOpen) return null;

  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
  const borderColor = type === 'success' ? 'border-green-600' : 'border-red-600';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className={`bg-white p-6 rounded-lg shadow-xl max-w-sm w-full border-t-4 ${borderColor}`}>
        <div className={`flex items-center justify-between mb-4 text-white p-2 rounded-t-md ${bgColor}`}>
          <h3 className="font-bold text-lg">
            {type === 'success' ? 'Success!' : 'Error!'}
          </h3>
          <button onClick={onClose} className="text-white hover:text-gray-100 focus:outline-none">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-gray-700 text-center mb-6">{message}</p>
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className={`px-6 py-2 rounded-lg text-white font-semibold ${bgColor} hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-opacity-75`}
          >
            Okay
          </button>
        </div>
      </div>
    </div>
  );
};


const Staff = () => {
  const navigate = useNavigate();
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null); // Firebase authenticated user
  const [staffProfile, setStaffProfile] = useState<StaffProfileData | null>(null); // Staff's profile data from Firestore
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingInitialData, setLoadingInitialData] = useState(true);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [updatingDocumentStatus, setUpdatingDocumentStatus] = useState<{ [docId: string]: boolean }>({});

  // State for message modal and logout confirmation modal
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false); // New state for logout modal


  // Fetches documents relevant to the staff's department
  const fetchDocumentsForStaff = useCallback(async (staffDepartment: string) => {
    setLoadingDocuments(true);
    // appId is not needed here as clearance_documents is a root collection
    const fetchedDocs: Document[] = [];

    console.log(`[Fetch Docs] Querying collection group: 'clearance_documents' for department: '${staffDepartment}'`);

    try {
      const documentsRef = collectionGroup(db, 'clearance_documents');
      const q = query(documentsRef, where('department', '==', staffDepartment));
      const querySnapshot = await getDocs(q);

      console.log(`[Fetch Docs] Query returned ${querySnapshot.docs.length} documents.`);
      if (querySnapshot.empty) {
        console.log("[Fetch Docs] Query snapshot is empty. No documents found matching criteria.");
      }

      querySnapshot.forEach((docSnap) => {
        fetchedDocs.push({
          id: docSnap.id,
          ...(docSnap.data() as FirestoreDocumentData),
        });
        console.log(`[Fetch Docs] Found document ID: ${docSnap.id}, Department: ${docSnap.data().department}, Student: ${docSnap.data().studentName}`);
      });
      setDocuments(fetchedDocs);
    } catch (error) {
      console.error('[Fetch Docs] Error fetching documents for staff:', error);
      setMessageContent('Failed to load documents. Please try again.');
      setMessageType('error');
      setIsMessageModalOpen(true);
      setDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  }, []); 


  // Effect to listen for Firebase Auth state changes and fetch staff profile/documents
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoadingInitialData(true);
      if (user) {
        setFirebaseUser(user);
        // Declaring appId here where it is used
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const userDocRef = doc(db, `artifacts/${appId}/users/${user.uid}/user_details`, user.uid);

        console.log("Auth State Changed: User detected:", user.uid);
        console.log("Attempting to fetch staff profile from Firestore for UID:", user.uid);

        try {
          const userDocSnap = await getDoc(userDocRef);

          console.log("User document snapshot exists:", userDocSnap.exists());

          if (userDocSnap.exists()) {
            const profileData = userDocSnap.data() as StaffProfileData;

            console.log("Fetched profile data:", profileData);
            console.log("Profile userType:", profileData.userType);

            // Basic validation for staff role (now using userType)
            if (profileData.userType === 'staff' || profileData.userType === 'admin') {
              setStaffProfile(profileData);
              fetchDocumentsForStaff(profileData.department); // Fetch documents based on staff's department
            } else {
              // Not a staff or admin, log out or redirect
              setMessageContent('Access denied: You are not authorized to view this page.');
              setMessageType('error');
              setIsMessageModalOpen(true);
              await signOut(auth); // Log them out
              setFirebaseUser(null);
              setStaffProfile(null);
              navigate('/login');
            }
          } else {
            // User profile not found in Firestore
            setMessageContent('Your staff profile was not found. Please contact support.');
            setMessageType('error');
            setIsMessageModalOpen(true);
            await signOut(auth);
            setFirebaseUser(null);
            setStaffProfile(null);
            navigate('/login');
          }
        } catch (error) {
          // ERROR FETCHING PROFILE
          console.error('Error fetching staff profile:', error);
          setMessageContent('Failed to load your profile. Please try logging in again.');
          setMessageType('error');
          setIsMessageModalOpen(true);
          await signOut(auth); // Attempt to log out on error
          setFirebaseUser(null);
          setStaffProfile(null);
          navigate('/login');
        } finally {
          setLoadingInitialData(false);
        }
      } else {
        // No user logged in
        setFirebaseUser(null);
        setStaffProfile(null);
        setDocuments([]);
        setLoadingInitialData(false);
        navigate('/login'); // Redirect to login page if no user
      }
    });

    return () => unsubscribe();
  }, [fetchDocumentsForStaff, navigate]); // fetchDocumentsForStaff is a dependency

  // Handles updating document status (Accept/Reject)
  const handleDocumentStatusUpdate = async (docId: string, _studentId: string, _department: string, newStatus: 'Approved' | 'Rejected') => {
    setUpdatingDocumentStatus(prev => ({ ...prev, [docId]: true }));
    setIsMessageModalOpen(false); // Close any existing messages

    const documentRef = doc(db, 'clearance_documents', docId);

    try {
      await updateDoc(documentRef, {
        status: newStatus,
      });

      // Update local state to reflect the change immediately
      setDocuments((prevDocs) =>
        prevDocs.map((docItem) =>
          // Updated comparison to use docItem.id for consistency with updateDoc
          docItem.id === docId ? { ...docItem, status: newStatus } : docItem
        )
      );

      setMessageContent(`Document status updated to ${newStatus}.`);
      setMessageType('success');
      setIsMessageModalOpen(true);
    } catch (error) {
      console.error(`Error updating document ${docId} status to ${newStatus}:`, error);
      setMessageContent(`Failed to update document status. ${error instanceof Error ? error.message : 'Please try again.'}`);
      setMessageType('error');
      setIsMessageModalOpen(true);
    } finally {
      setUpdatingDocumentStatus(prev => ({ ...prev, [docId]: false }));
    }
  };

  // Function to open logout confirmation modal
  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  // Function to confirm and perform logout
  const handleLogoutConfirm = async () => {
    try {
      await signOut(auth);
      setMessageContent('You have been logged out successfully.');
      setMessageType('success');
      setIsMessageModalOpen(true);
      setIsLogoutModalOpen(false); // Close logout modal
      navigate('/login'); // Redirect after logout
    } catch (error) {
      console.error('Error during logout:', error);
      setMessageContent('Failed to log out. Please try again.');
      setMessageType('error');
      setIsMessageModalOpen(true);
      setIsLogoutModalOpen(false); // Close logout modal
    }
  };

  // Function to cancel logout
  const handleLogoutCancel = () => {
    setIsLogoutModalOpen(false); // Close logout modal
  };

  // Render nothing or a loading spinner if initial user data is not loaded yet
  if (loadingInitialData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 font-inter text-gray-800">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-xl">Loading staff dashboard...</p>
      </div>
    );
  }

  // Fallback if no staff user is logged in or profile not found/authorized
  if (!firebaseUser || !staffProfile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 font-inter text-gray-800 p-4 text-center">
        <h2 className="text-3xl font-bold text-red-600 mb-4">Access Denied</h2>
        <p className="text-lg text-gray-700 mb-6">
          You are not logged in or not authorized to access this page. Redirecting...
        </p>
      </div>
    );
  }

  const getStatusDisplay = (status: DocumentStatus) => {
    switch (status) {
      case 'Approved':
        return <span className="font-semibold text-green-600">APPROVED</span>;
      case 'Rejected':
        return <span className="font-semibold text-red-600">REJECTED</span>;
      case 'Pending':
        return <span className="font-semibold text-yellow-600">PENDING</span>;
      case 'Not Submitted':
      default:
        return <span className="font-semibold text-gray-600">NOT SUBMITTED</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-inter text-gray-800">
      {/* Header with Logo and Staff Profile/Logout */}
      <div className="flex items-center justify-between p-4 sm:p-6 bg-white shadow-sm">
        <button
          onClick={() => navigate('/staff')} // Navigate back to staff dashboard
          className="flex items-center gap-3 hover:opacity-80 transition-opacity focus:outline-none"
        >
          <img
            src={LogoImage}
            alt="DSCS Logo"
            className="h-8 sm:h-10 w-auto rounded-md"
          />
          <span className="text-xl sm:text-2xl font-bold text-gray-900">DSCS</span>
        </button>

        <div className="flex items-center gap-4">
          {/* User Profile Info and View Profile Button */}
          <button
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition-colors duration-300"
          >
            <LucideUser className="w-5 h-5" />
            <span className="hidden sm:inline">View Profile</span>
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout} // This now opens the confirmation modal
            className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 transition-colors duration-300"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Staff Dashboard</h1>
        <p className="text-lg text-gray-700 mb-8">
          Welcome! You are currently viewing documents for the{' '}
          <span className="font-semibold text-blue-600">
            {staffProfile.department.replace('_', ' ').toUpperCase()}
          </span>{' '}
          Department.
        </p>

        {/* Documents Section */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-6 text-gray-900">Submitted Documents</h2>
          {loadingDocuments ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-gray-500 mb-4" />
              <p className="text-gray-600">Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <p className="text-gray-600 text-center py-4">No documents submitted for your department yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map((docItem) => (
                <div key={docItem.id} className="border border-gray-200 rounded-lg p-5 shadow-sm bg-white">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Student: {docItem.studentName || 'N/A'} {/* Display student name */}
                  </h3>
                  <p className="text-gray-700 mb-3">
                    <strong>Department:</strong> {docItem.department.replace('_', ' ').toUpperCase()}
                  </p>
                  <p className="text-gray-700 mb-3">
                    <strong>Status:</strong>{' '}
                    {getStatusDisplay(docItem.status)}
                  </p>
                  <a
                    href={docItem.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-blue-600 hover:underline mb-4"
                  >
                    View Document <FileText className="inline-block w-4 h-4 ml-1" />
                  </a>

                  {/* Action buttons only for 'Pending' documents */}
                  {docItem.status === 'Pending' && (
                    <div className="flex gap-3 mt-3">
                      <button
                        onClick={() => handleDocumentStatusUpdate(docItem.id, docItem.studentId, docItem.department, 'Approved')}
                        className={`flex-1 px-4 py-2 bg-green-500 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75
                          ${updatingDocumentStatus[docItem.id] ? 'opacity-70 cursor-not-allowed' : 'hover:bg-green-600'}`}
                        disabled={updatingDocumentStatus[docItem.id]}
                      >
                        {updatingDocumentStatus[docItem.id] ? (
                          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                        ) : (
                          'Accept'
                        )}
                      </button>
                      <button
                        onClick={() => handleDocumentStatusUpdate(docItem.id, docItem.studentId, docItem.department, 'Rejected')}
                        className={`flex-1 px-4 py-2 bg-red-500 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75
                          ${updatingDocumentStatus[docItem.id] ? 'opacity-70 cursor-not-allowed' : 'hover:bg-red-600'}`}
                        disabled={updatingDocumentStatus[docItem.id]}
                      >
                        {updatingDocumentStatus[docItem.id] ? (
                          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                        ) : (
                          'Reject'
                        )}
                      </button>
                    </div>
                  )}
                  {docItem.status !== 'Pending' && (
                    <p className="text-sm text-gray-500 italic mt-3">Document has been {docItem.status.toLowerCase()}.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Profile Modal */}
      {showProfileModal && staffProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full relative">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Your Profile Details</h3>
            <button
              onClick={() => setShowProfileModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="flex flex-col items-center mb-6">
              {/* UploadPhoto component for staff profile image */}
              <UploadPhoto />
            </div>
            <div className="space-y-4 text-lg">
              <p><strong className="text-gray-700">Full Name:</strong> {staffProfile.fullName}</p>
              <p><strong className="text-gray-700">Email:</strong> {staffProfile.email}</p>
              <p><strong className="text-gray-700">Department:</strong> {staffProfile.department.replace('_', ' ').toUpperCase()}</p>
            </div>
            <div className="flex justify-center mt-8">
              <button
                onClick={handleLogout}
                className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      <MessageModal
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        message={messageContent}
        type={messageType}
      />

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg p-6 w-90 max-w-md mx-4 shadow-xl border-t-4 border-gray-400">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
              Are you sure you want to Log out?
            </h3>
            <div className="flex justify-center space-x-4 mt-6">
              <button
                onClick={handleLogoutCancel}
                className="px-6 py-2 bg-white text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75"
              >
                Back
              </button>
              <button
                onClick={handleLogoutConfirm}
                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Staff;
