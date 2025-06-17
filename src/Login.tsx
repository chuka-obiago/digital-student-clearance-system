import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import LoginImage from './assets/images/loginimage.png';
import LogoImage from './assets/images/caleblogo.png'; 
import { auth, db } from '././lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';


// Declare __app_id globally
declare const __app_id: string | undefined;

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


export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<'student' | 'staff' | 'admin'>('student'); // Explicitly type userType

  // State for message modal
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsMessageModalOpen(false); // Close any existing modal
    setMessageContent('');
    setMessageType('success'); // Reset message type

    // 1. Admin Login Check
    if (userType === 'admin') {
      if (email === 'admin@calebuniversity.edu.ng' && password === '12345678') {
        setMessageContent('Login successful! Redirecting to Admin Dashboard...');
        setMessageType('success');
        setIsMessageModalOpen(true);
        setTimeout(() => {
          navigate('/admin'); // Redirect to Admin.tsx
        }, 0);
        return; // Exit function after admin login
      } else {
        setMessageContent('Invalid username or password.');
        setMessageType('error');
        setIsMessageModalOpen(true);
        return; // Exit function for failed admin login
      }
    }

    // 2. Firebase Login for Student/Staff
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Use the global __app_id variable for Firestore path
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const userId = user.uid;

      // Fetch user details from Firestore to get their specific userType
      const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/user_details`, userId);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const storedUserType = userData?.userType;

        // Ensure the selected userType matches the one stored in Firestore
        if (storedUserType === userType) {
          setMessageContent('Login successful! Redirecting...');
          setMessageType('success');
          setIsMessageModalOpen(true);
          setTimeout(() => {
            if (storedUserType === 'student') {
              navigate('/student-home'); // Redirect to student dashboard
            } else if (storedUserType === 'staff') {
              navigate('/staff'); // Redirect to staff dashboard
            }
          }, 0);
        } else {
          // If user logs in as student but their Firestore data says staff (or vice-versa)
          setMessageContent(`You are registered as a ${storedUserType}, please select the correct login type.`);
          setMessageType('error');
          setIsMessageModalOpen(true);
          // Sign out the user from Firebase Auth to prevent incorrect session
          auth.signOut();
        }
      } else {
        // User exists in Auth but no corresponding data in Firestore (shouldn't happen if create account worked)
        setMessageContent('User data not found. Please contact support or create an account.');
        setMessageType('error');
        setIsMessageModalOpen(true);
        auth.signOut(); // Sign out user to clear session
      }

    } catch (error: any) {
      let errorMessage = 'Invalid username or password.'; // Default error message

      // More specific error messages for user feedback
      if (error.code === 'auth/invalid-email' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Invalid username or password.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed login attempts. Please try again later.';
      }

      setMessageContent(errorMessage);
      setMessageType('error');
      setIsMessageModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      {/* Top-left with Logo and DSCS */}
      <div className="flex items-center gap-3 p-4 sm:p-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <img
            src={LogoImage}
            alt="DSCS Logo"
            className="h-8 sm:h-10 w-auto"
          />
          <span className="text-xl sm:text-2xl font-bold text-gray-900">DSCS</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-100px)]">
        {/* Left Side - Login Form */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-md p-8 rounded-lg"> 
            <div className="mb-8 text-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Welcome back!
              </h1>
              <p className="text-gray-600">
                Enter your email and password
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="Enter your email"
                  required
                />
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="Enter your password"
                  required
                />
              </div>

              {/* User Type Dropdown */}
              <div>
                <label htmlFor="userType" className="block text-sm font-medium text-gray-700 mb-2">
                  Login as
                </label>
                <select
                  id="userType"
                  value={userType}
                  onChange={(e) => setUserType(e.target.value as 'student' | 'staff' | 'admin')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white"
                >
                  <option value="student">Student</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Continue Button */}
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200"
              >
                Continue
              </button>
            </form>

            {/* Register Link */}
            <div className="mt-6 text-center">
              <span className="text-gray-600">Don't have an account? </span>
              <button
                onClick={() => navigate('/createaccount')}
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>

        {/* Right Side - Image (Hidden on small screens) */}
        <div className="hidden lg:flex flex-1 items-center justify-center p-8 rounded-l-lg">
          <img
            src={LoginImage}
            alt="Welcome"
            className="max-w-md xl:max-w-lg h-auto object-contain rounded-xl"
          />
        </div>
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
}
