import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Wallet,
  Users,
  Building2,
  BookOpen,
  Monitor,
  Heart,
  MessageCircle,
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  Check,
} from 'lucide-react';
import MyNavbar from '../components/MyNavbar';

// Firebase imports
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';

// Cloudinary imports
import { uploadToCloudinary } from '../lib/cloudinary';

// Constants for file size limit
const MAX_FILE_SIZE_MB = 2;

// Type definitions
type ClearanceStatus = 'Approved' | 'Rejected' | 'Pending' | 'Not Submitted';

interface ClearanceItemData {
  title: string;
  icon: React.ComponentType<any>;
  color: string;
}

// Interface for a document stored in Firestore
interface DocumentData {
  status: ClearanceStatus;
  fileUrl: string;
  uploadedAt: string;
  department: string;
  studentId: string;
  studentName: string;
}

interface SelectedFiles {
  [key: string]: File;
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

// Define the fixed list of departments
const departmentsData: ClearanceItemData[] = [
  { title: 'Academic Affairs', icon: GraduationCap, color: 'bg-blue-50 text-blue-600' },
  { title: 'Bursary', icon: Wallet, color: 'bg-green-50 text-green-600' },
  { title: 'Student Affairs', icon: Users, color: 'bg-purple-50 text-purple-600' },
  { title: 'College Office', icon: Building2, color: 'bg-gray-50 text-gray-600' },
  { title: 'Library', icon: BookOpen, color: 'bg-indigo-50 text-indigo-600' },
  { title: 'ICT Centre', icon: Monitor, color: 'bg-cyan-50 text-cyan-600' },
  { title: 'Health Centre', icon: Heart, color: 'bg-red-50 text-red-600' },
  { title: 'Counselling', icon: MessageCircle, color: 'bg-yellow-50 text-yellow-600' },
];

const MyClearance: React.FC = () => {
  const navigate = useNavigate();
  const [selectedFiles, setSelectedFiles] = useState<SelectedFiles>({});
  const [user, setUser] = useState<User | null>(null);
  const [studentFullName, setStudentFullName] = useState<string>('');
  const [loadingClearance, setLoadingClearance] = useState(true);
  const [uploadingStates, setUploadingStates] = useState<{ [key: string]: boolean }>({});
  const [clearanceStatuses, setClearanceStatuses] = useState<{ [key: string]: DocumentData | null }>({});

  // State for message modal
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  // Function to fetch current clearance statuses from Firestore
  const fetchClearanceStatuses = useCallback(async (currentUserId: string) => {
    setLoadingClearance(true);
    const newStatuses: { [key: string]: DocumentData | null } = {};

    for (const dept of departmentsData) {
      try {
        // Using simple path structure like in UploadPhoto.tsx
        const docRef = doc(db, 'clearance_documents', `${currentUserId}_${dept.title.replace(/\s+/g, '_')}`);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          newStatuses[dept.title] = docSnap.data() as DocumentData;
        } else {
          newStatuses[dept.title] = null;
        }
      } catch (error) {
        console.error(`Error fetching document for ${dept.title}:`, error);
        newStatuses[dept.title] = null;
      }
    }
    
    setClearanceStatuses(newStatuses);
    setLoadingClearance(false);
  }, []);

  // Function to get user details
  const getUserDetails = useCallback(async (currentUserId: string) => {
    try {
      const userDocRef = doc(db, 'users', currentUserId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setStudentFullName(userData.fullName || userData.displayName || 'Student');
      } else {
        setStudentFullName('Student');
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      setStudentFullName('Student');
    }
  }, []);

  // Effect to listen for auth state changes and fetch initial data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await getUserDetails(currentUser.uid);
        await fetchClearanceStatuses(currentUser.uid);
      } else {
        setUser(null);
        setClearanceStatuses({});
        setLoadingClearance(false);
        setStudentFullName('');
      }
    });
    
    return () => unsubscribe();
  }, [fetchClearanceStatuses, getUserDetails]);

  const getStatusIcon = (status: ClearanceStatus) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'Rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'Pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'Not Submitted':
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: ClearanceStatus) => {
    switch (status) {
      case 'Approved':
        return 'text-green-600 bg-green-50 border border-green-200';
      case 'Rejected':
        return 'text-red-600 bg-red-50 border border-red-200';
      case 'Pending':
        return 'text-yellow-600 bg-yellow-50 border border-yellow-200';
      case 'Not Submitted':
      default:
        return 'text-gray-500 bg-gray-50 border border-gray-200';
    }
  };

  const handleFileSelect = (department: string, file: File | null) => {
    if (file) {
      // Validate file size immediately on selection
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setMessageContent(`File "${file.name}" is too large. Max size is ${MAX_FILE_SIZE_MB}MB.`);
        setMessageType('error');
        setIsMessageModalOpen(true);
        setSelectedFiles(prev => {
          const newState = { ...prev };
          delete newState[department];
          return newState;
        });
        return;
      }
      setSelectedFiles(prev => ({
        ...prev,
        [department]: file
      }));
    } else {
      setSelectedFiles(prev => {
        const newState = { ...prev };
        delete newState[department];
        return newState;
      });
    }
  };

  // Save document to Firestore 
  const saveDocumentToFirestore = async (departmentTitle: string, fileUrl: string) => {
    if (!user?.uid) throw new Error('User not authenticated');

    // Create document ID 
    const docId = `${user.uid}_${departmentTitle.replace(/\s+/g, '_')}`;
    const docRef = doc(db, 'clearance_documents', docId);
    
    const documentData: DocumentData = {
      status: 'Pending',
      fileUrl,
      uploadedAt: new Date().toISOString(),
      department: departmentTitle,
      studentId: user.uid,
      studentName: studentFullName,
    };

    // Use setDoc with merge 
    await setDoc(docRef, documentData, { merge: true });
    
    return documentData;
  };

  const handleUpload = async (departmentTitle: string) => {
    const file = selectedFiles[departmentTitle];
    if (!file) {
      setMessageContent(`No file selected for ${departmentTitle}.`);
      setMessageType('error');
      setIsMessageModalOpen(true);
      return;
    }

    if (!user?.uid || !studentFullName) {
      setMessageContent('You must be logged in as a student to upload documents.');
      setMessageType('error');
      setIsMessageModalOpen(true);
      return;
    }

    setUploadingStates(prev => ({ ...prev, [departmentTitle]: true }));
    setIsMessageModalOpen(false);

    try {
      // Upload to Cloudinary - this returns a string URL like in UploadPhoto.tsx
      const fileUrl = await uploadToCloudinary(file);
      
      // Save to Firestore
      const documentData = await saveDocumentToFirestore(departmentTitle, fileUrl);

      // Update local state
      setClearanceStatuses(prev => ({
        ...prev,
        [departmentTitle]: documentData,
      }));
      
      setSelectedFiles(prev => {
        const newState = { ...prev };
        delete newState[departmentTitle];
        return newState;
      });

      setMessageContent(`Document for ${departmentTitle} uploaded successfully. Status is now Pending.`);
      setMessageType('success');
      setIsMessageModalOpen(true);

    } catch (error) {
      console.error(`Error uploading document for ${departmentTitle}:`, error);
      setMessageContent(`Failed to upload document for ${departmentTitle}. ${error instanceof Error ? error.message : 'Please try again.'}`);
      setMessageType('error');
      setIsMessageModalOpen(true);
    } finally {
      setUploadingStates(prev => ({ ...prev, [departmentTitle]: false }));
    }
  };

  if (loadingClearance) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 font-inter text-gray-800">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="ml-4 text-xl">Loading your clearance data...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 font-inter text-gray-800 p-4 text-center">
        <h2 className="text-3xl font-bold text-red-600 mb-4">Not Authenticated</h2>
        <p className="text-lg text-gray-700 mb-6">
          Please log in to view your clearance status.
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
    <div className="min-h-screen bg-gray-50 font-inter">
      <MyNavbar activeItem="My Clearance" />

      {/* Main Content Container */}
      <div className="w-4/5 max-w-7xl mx-auto px-4 py-8">
        {/* Title & Intro */}
        <div className="text-center mb-12 mt-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">My Clearance</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Track and manage your clearance progress across all departments
          </p>
        </div>

        {/* Clearance Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {departmentsData.map((item) => {
            const IconComponent = item.icon;
            const currentStatus = clearanceStatuses[item.title]?.status || 'Not Submitted';
            const documentUrl = clearanceStatuses[item.title]?.fileUrl || '#';

            return (
              <div key={item.title} className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300 p-6 border border-gray-100">
                <div className="text-center">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${item.color} mb-4`}>
                    <IconComponent className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">{item.title}</h3>
                  <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium ${getStatusColor(currentStatus)}`}>
                    {getStatusIcon(currentStatus)}
                    {currentStatus}
                  </div>
                  {currentStatus !== 'Not Submitted' && (
                    <a
                      href={documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mt-3 text-blue-600 hover:underline text-sm"
                    >
                      View Submitted Doc
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Upload Documents Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-12 border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Upload className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-800">Upload Documents</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {departmentsData.map((dept) => {
              const currentStatus = clearanceStatuses[dept.title]?.status || 'Not Submitted';
              const isApproved = currentStatus === 'Approved';
              const isUploading = uploadingStates[dept.title];

              return (
                <div key={dept.title} className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg ${dept.color}`}>
                      <dept.icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-medium text-gray-800">{dept.title}</h3>
                  </div>

                  <div className="space-y-3">
                    <div className="relative">
                      <input
                        type="file"
                        id={`file-${dept.title}`}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileSelect(dept.title, e.target.files?.[0] || null)}
                        disabled={isApproved || isUploading}
                      />
                      <div className={`flex items-center gap-3 p-3 border-2 border-dashed rounded-lg transition-colors
                                       ${isApproved ? 'border-green-400 bg-green-50 text-green-700' :
                                         selectedFiles[dept.title] ? 'border-blue-400 bg-blue-50 text-blue-700' :
                                         'border-gray-300 hover:border-blue-400'}`}>
                        {isApproved ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <FileText className="w-5 h-5 text-gray-400" />
                        )}
                        <span className="text-sm">
                          {selectedFiles[dept.title]
                            ? selectedFiles[dept.title].name
                            : isApproved ? 'Document Approved' : 'Choose file or drag and drop'}
                        </span>
                      </div>
                    </div>

                    {isApproved ? (
                      <div className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium">
                        <Check className="w-4 h-4" />
                        Approved
                      </div>
                    ) : (
                      <button
                        onClick={() => handleUpload(dept.title)}
                        disabled={!selectedFiles[dept.title] || isUploading}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors
                                   ${!selectedFiles[dept.title] || isUploading
                                      ? 'bg-gray-400 cursor-not-allowed'
                                      : 'bg-blue-600 hover:bg-blue-700'}`}
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            Upload Document
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Call-to-Action */}
        {/* <div className="text-center pb-12">
          <button className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300">
            <CheckCircle2 className="w-5 h-5" />
            Download Clearance
          </button>
          <p className="text-sm text-gray-500 mt-3">
            Ensure all sections are approved before downloading
          </p>
        </div> */}
      </div>

      {/* Message Modal */}
      <MessageModal
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        message={messageContent}
        type={messageType}
      />
    </div>
  );
};

export default MyClearance;