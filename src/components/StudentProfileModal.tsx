// components/StudentProfileModal.tsx
import React from 'react';

interface Student {
  fullName: string;
  department: string;
  level: string;
  matricNumber: string;
  email: string;
}

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
}

const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  isOpen,
  onClose,
  student,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="relative w-[90%] max-w-md bg-white rounded-2xl shadow-2xl p-6 md:p-8 transition-all">

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
          aria-label="Close"
        >
          ×
        </button>

        <div className="text-center mb-6">
          <h3 className="text-2xl font-semibold text-gray-800">Student Profile</h3>
          <p className="text-sm text-gray-500">View your registration details</p>
        </div>

        <div className="space-y-4 text-sm text-gray-700">
          <div className="flex justify-between border-b pb-2">
            <span className="font-medium">Full Name:</span>
            <span>{student.fullName}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="font-medium">Department:</span>
            <span>{student.department}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="font-medium">Level:</span>
            <span>{student.level}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="font-medium">Matric Number:</span>
            <span>{student.matricNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Email:</span>
            <span>{student.email}</span>
          </div>
        </div>
      </div>
    </div>
  );
};


export default StudentProfileModal;
