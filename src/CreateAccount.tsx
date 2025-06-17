import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { auth, db } from '././lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

import LoginImage from './assets/images/loginimage.png'; 
import LogoImage from './assets/images/caleblogo.png'; 

declare const __app_id: string | undefined;

interface UserData {
  fullName: string;
  email: string;
  userType: 'student' | 'staff' | 'admin';
  department: string;
  level?: string; // Optional for staff/admin
  matricNumber?: string; // Optional for staff/admin
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


export default function CreateAccount() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'student', // Default to student
    department: '',
    level: '',
    matricNumber: ''
  });

  const [errors, setErrors] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    matricNumber: ''
  });

  // State for message modal
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const studentDepartments = [
    'Computer Science', 'Cyber Security', 'Architecture', 'Nursing', 'Accounting', 'International Relations', 'Business Administration', 'Mass Communication', 'Microbiology', 'Biochemistry', 'Industrial Chemistry', 'Law',
  ];

  const staffDepartments = [
    'Academic Affairs',
    'Bursary',
    'Student Affairs',
    'College',
    'Library',
    'ICT Centre',
    'Healthcare and Counselling'
  ];

  const levels = ['100', '200', '300', '400'];

  const validateForm = () => {
    const newErrors = {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      matricNumber: ''
    };

    let isValid = true;

    // Full Name validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full Name is required!';
      isValid = false;
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required!';
      isValid = false;
    } else if (!formData.email.endsWith('@calebuniversity.edu.ng')) {
      newErrors.email = 'Invalid university email format!';
      isValid = false;
    }

    // Password validation
    if (!formData.password.trim()) {
      newErrors.password = 'Password is required!';
      isValid = false;
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters!';
      isValid = false;
    }

    // Confirm Password validation
    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Confirm password is required!';
      isValid = false;
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match!';
      isValid = false;
    }

    // Matric Number validation (only for students)
    if (formData.userType === 'student') {
      if (!formData.matricNumber.trim()) {
        newErrors.matricNumber = 'Matric Number is required!';
        isValid = false;
      } else if (!/^[0-9/]+$/.test(formData.matricNumber)) {
        newErrors.matricNumber = 'Invalid matric number format!';
        isValid = false;
      }
    }
    // Department validation (required for both student and staff)
    if (!formData.department.trim()) {
      // Assuming 'department' is a string in newErrors too, if not, adjust logic
      // This is a generic check, you might want a specific error for department
      isValid = false; // No specific error message for department in current errors state, but it makes the form invalid.
    }
    // Level validation (only for students)
    if (formData.userType === 'student' && !formData.level.trim()) {
        isValid = false; // No specific error message for level in current errors state
    }


    setErrors(newErrors);
    return isValid;
  };

  const handleInputChange = (field: string, value: string) => {
    // For matric number, only allow numbers and forward slash
    if (field === 'matricNumber') {
      value = value.replace(/[^0-9/]/g, '');
    }

    setFormData(prev => ({
      ...prev,
      [field]: value,
      // Reset department, level, and matric number when user type changes
      ...(field === 'userType' && { department: '', level: '', matricNumber: '' })
    }));

    // Clear error when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsMessageModalOpen(false); // Close any existing modal
    setMessageContent('');
    setMessageType('success'); // Reset message type

    if (validateForm()) {
      // Additional check for department and level/matric number based on userType
      let allFieldsFilled = true;
      if (!formData.department.trim()) allFieldsFilled = false;
      if (formData.userType === 'student' && (!formData.level.trim() || !formData.matricNumber.trim())) allFieldsFilled = false;

      if (!allFieldsFilled) {
        setMessageContent('Please ensure all required fields for your user type are filled.');
        setMessageType('error');
        setIsMessageModalOpen(true);
        return;
      }

      try {
        // 1. Create user with email and password using Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const user = userCredential.user;

        // 2. Prepare user data for Firestore
        const userDataToStore: UserData = {
          fullName: formData.fullName,
          email: formData.email,
          userType: formData.userType as 'student' | 'staff' | 'admin',
          department: formData.department,
        };

        if (formData.userType === 'student') {
          userDataToStore.level = formData.level;
          userDataToStore.matricNumber = formData.matricNumber;
        }

       // Use the global __app_id variable for Firestore path
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const userId = user.uid;

        // 3. Store additional user data in Firestore
        // Path: /artifacts/{appId}/users/{userId}/user_details/{userId}
        await setDoc(doc(db, `artifacts/${appId}/users/${userId}/user_details`, userId), userDataToStore);

        setMessageContent('Account created successfully! Redirecting to login...');
        setMessageType('success');
        setIsMessageModalOpen(true); 

        // Introduce a slight delay before redirecting to allow the user to see the message
        setTimeout(() => {
          console.log("Redirecting to /login...");
          navigate('/login');
        }, 2000); // Redirect after 2 seconds

      } catch (error: any) {
        console.error("Error creating account:", error);
        let errorMessage = 'Failed to create account. Please try again.';
        if (error.code === 'auth/email-already-in-use') {
          errorMessage = 'This email is already in use. Please use a different email or log in.';
        } else if (error.code === 'auth/weak-password') {
          errorMessage = 'Password is too weak. Please use a stronger password (min 8 characters).';
        } else if (error.code === 'auth/invalid-email') {
          errorMessage = 'The email address is not valid.';
        }
        setMessageContent(errorMessage);
        setMessageType('error');
        setIsMessageModalOpen(true);
      }
    } else {
      setMessageContent('Please correct the validation errors in the form.');
      setMessageType('error');
      setIsMessageModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      {/* Header with Logo and DSCS */}
      <div className="flex items-center gap-3 p-4 sm:p-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity focus:outline-none"
        >
          <img
            src={LogoImage}
            alt="DSCS Logo"
            className="h-8 sm:h-10 w-auto rounded-md"
          />
          <span className="text-xl sm:text-2xl font-bold text-gray-900">DSCS</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-80px)]">
        {/* Left Side - Create Account Form */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-md p-8 rounded-lg">
            <div className="mb-8 text-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Create Account
              </h1>
              <p className="text-gray-600">
                Enter your details below to create your account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Full Name Field */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors ${
                    errors.fullName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your full name"
                />
                {errors.fullName && (
                  <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
                )}
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="yourname@calebuniversity.edu.ng"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your password"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Confirm your password"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>

              {/* User Type Dropdown */}
              <div>
                <label htmlFor="userType" className="block text-sm font-medium text-gray-700 mb-2">
                  Create account as
                </label>
                <select
                  id="userType"
                  value={formData.userType}
                  onChange={(e) => handleInputChange('userType', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white"
                >
                  <option value="student">Student</option>
                  <option value="staff">Staff</option>
                </select>
              </div>

              {/* Department Dropdown */}
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <select
                  id="department"
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white"
                >
                  <option value="">Select Department</option>
                  {(formData.userType === 'student' ? studentDepartments : staffDepartments).map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>


              {/* Level Dropdown (Only for Students) */}
              {formData.userType === 'student' && (
                <div>
                  <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-2">
                    Level
                  </label>
                  <select
                    id="level"
                    value={formData.level}
                    onChange={(e) => handleInputChange('level', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white"
                  >
                    <option value="">Select Level</option>
                    {levels.map((level) => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Matric Number Field (Only for Students) */}
              {formData.userType === 'student' && (
                <div>
                  <label htmlFor="matricNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    Matric Number
                  </label>
                  <input
                    type="text"
                    id="matricNumber"
                    value={formData.matricNumber}
                    onChange={(e) => handleInputChange('matricNumber', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors ${
                      errors.matricNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., 21/9063"
                  />
                  {errors.matricNumber && (
                    <p className="mt-1 text-sm text-red-600">{errors.matricNumber}</p>
                  )}
                </div>
              )}

              {/* Create Account Button */}
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200"
              >
                Create Account
              </button>
            </form>

            {/* Login Link */}
            <div className="mt-6 text-center">
              <span className="text-gray-600">Already have an account? </span>
              <button
                onClick={() => navigate('/login')}
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors mb-10"
              >
                Log in
              </button>
            </div>
          </div>
        </div>

        {/* Right Side - Image (Hidden on small screens) */}
        <div className="hidden lg:flex flex-1 justify-center items-center h-screen sticky top-0 p-8 rounded-l-lg">
          <img
            src={LoginImage}
            alt="Create Account Illustration"
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
