import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './lib/firebase'; // Ensure this path is correct
import LogoImage from './assets/images/caleblogo.png';

// Declare __app_id as a global variable to satisfy TypeScript
declare global {
  const __app_id: string | undefined;
}

// Define the User interface with userType
interface User {
  id: string; // This will be the userId (e.g., L2bjqgdrPDRdLOox7hGbBAnbH2)
  fullName: string;
  email: string;
  userType: 'student' | 'staff' | 'admin';
  department?: string;
  level?: string;
  matricNumber?: string;
}

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const allFetchedUsers: User[] = [];

        // --- Debugging: Confirm the appId being used ---
        console.log("Admin.tsx using appId:", appId);

        // --- Debugging Step 1: Check the parent 'users' collection ---
        const usersParentCollectionRef = collection(db, 'artifacts', appId, 'users');
        console.log("Attempting to fetch from usersParentCollectionRef:", usersParentCollectionRef.path);

        const usersParentSnapshot = await getDocs(usersParentCollectionRef);
        console.log("Number of parent userId documents found:", usersParentSnapshot.docs.length);

        if (usersParentSnapshot.empty) {
          console.log("No userId documents found in artifacts/{appId}/users. This is likely the cause. Ensure explicit documents exist at this path.");
          setUsers([]);
          setLoading(false);
          return;
        }

        // Iterate over each user ID document
        for (const userDoc of usersParentSnapshot.docs) {
          const userId = userDoc.id;
          console.log(`Processing userId: ${userId}`);

          // --- Debugging Step 2: Check the 'user_details' subcollection for each userId ---
          const userDetailsCollectionRef = collection(db, 'artifacts', appId, 'users', userId, 'user_details');
          console.log(`Attempting to fetch from userDetailsCollectionRef for ${userId}:`, userDetailsCollectionRef.path);

          const userDetailsSnapshot = await getDocs(userDetailsCollectionRef);
          console.log(`Number of detail documents found for ${userId}:`, userDetailsSnapshot.docs.length);

          if (userDetailsSnapshot.empty) {
            console.log(`No user_details documents found for userId: ${userId}.`);
            continue;
          }

          // Iterate over documents within 'user_details'
          userDetailsSnapshot.docs.forEach(detailDoc => {
            const data = detailDoc.data();
            console.log("Fetched raw user data for userId", userId, ":", data);

            // --- Debugging Step 3: Check data fields ---
            if (data.fullName && data.email && data.userType) {
              allFetchedUsers.push({
                id: userId,
                fullName: data.fullName,
                email: data.email,
                userType: data.userType,
                department: data.department,
                level: data.level,
                matricNumber: data.matricNumber,
              } as User);
            } else {
              console.warn(`Missing critical fields (fullName, email, userType) for user in ${userDetailsCollectionRef.path}. Data:`, data);
            }
          });
        }
        setUsers(allFetchedUsers);
        console.log("Total users processed and added to state:", allFetchedUsers.length);

      } catch (err: any) {
        console.error("Error fetching users: ", err);
        setError(`Failed to fetch user data. Error: ${err.message}. Check browser console for more details.`);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [appId]);

  const totalStaff = useMemo(() => users.filter(user => user.userType === 'staff').length, [users]);
  const totalStudents = useMemo(() => users.filter(user => user.userType === 'student').length, [users]);

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    console.log('Admin logged out');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-700 text-lg">Loading users...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-red-600 text-lg">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-inter text-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4 sm:p-6">
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
        <button
          onClick={() => setShowLogoutModal(true)}
          className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75"
        >
          Log Out
        </button>
      </div>

      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

        {/* Overview Section */}
        <div className="bg-white p-6 rounded-xl shadow-md mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-blue-700">{totalStudents}</span>
              <span className="text-lg text-blue-600">Total Students</span>
            </div>
            <div className="bg-green-50 p-4 rounded-lg flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-green-700">{totalStaff}</span>
              <span className="text-lg text-green-600">Total Staff</span>
            </div>
          </div>
        </div>

        {/* Student Accounts Section */}
        <div className="bg-white p-6 rounded-xl shadow-md mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Student Accounts</h2>
          {users.filter(user => user.userType === 'student').length === 0 ? (
            <p className="text-gray-600 text-center py-4">No student accounts found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider rounded-tl-lg">Full Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matric Number</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider rounded-tr-lg">Department</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.filter(user => user.userType === 'student').map((student) => (
                    <tr key={student.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.fullName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{student.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{student.level}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{student.matricNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{student.department || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Staff Accounts Section */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Staff Accounts</h2>
          {users.filter(user => user.userType === 'staff').length === 0 ? (
            <p className="text-gray-600 text-center py-4">No staff accounts found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider rounded-tl-lg">Full Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider rounded-tr-lg">Department</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.filter(user => user.userType === 'staff').map((staff) => (
                    <tr key={staff.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{staff.fullName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{staff.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{staff.department?.replace('_', ' ').toUpperCase() || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Log out Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 text-center">Are you sure you want to log out?</h2>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="text-gray-700 hover:underline focus:outline-none"
              >
                Back
              </button>
              <button
                onClick={() => {
                  setShowLogoutModal(false);
                  handleLogout();
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg shadow hover:bg-red-700 focus:outline-none"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
