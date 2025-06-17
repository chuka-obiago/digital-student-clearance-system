import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import LogoImage from '../assets/images/caleblogo.png';
import { signOut } from 'firebase/auth';
import { auth } from '.././lib/firebase'; 


interface NavbarProps {
  activeItem?: 'Home' | 'My Clearance' | 'Log out';
}

const MyNavbar: React.FC<NavbarProps> = ({ activeItem = 'Home' }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate('/student-home');
  };

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleLogoutClick = () => {
    setIsLogoutModalOpen(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      await signOut(auth); // Firebase logout
      localStorage.clear(); // Clear any local session
      setIsLogoutModalOpen(false);
      navigate('/'); // Navigate to landing page
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };


  const handleLogoutCancel = () => {
    setIsLogoutModalOpen(false);
  };

  const getNavItemClass = (item: string) => {
    return `px-4 py-2 rounded-lg transition-colors duration-200 cursor-pointer ${
      activeItem === item
        ? 'bg-blue-500 text-white'
        : 'text-gray-700 hover:bg-gray-100'
    }`;
  };

  const getMobileNavItemClass = (item: string) => {
    return `w-full text-left px-4 py-3 transition-colors duration-200 cursor-pointer ${
      activeItem === item
        ? 'bg-blue-500 text-white'
        : 'text-gray-700 hover:bg-gray-100'
    }`;
  };

  return (
    <>
      <nav className={`w-full sticky top-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-md' : 'bg-transparent'}`}>
        <div className="w-[90%] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and DSCS Text */}
            <div 
              className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleLogoClick}
            >
              <img 
                src={LogoImage} 
                alt="Logo" 
                className="h-10 w-10 object-contain"
              />
              <span className="text-xl font-bold text-gray-800">DSCS</span>
            </div>

            {/* Desktop Navigation Items */}
            <div className="hidden md:flex items-center space-x-6">
              {/* Home */}
              <div className={getNavItemClass('Home')} onClick={() => navigate('/student-home')}>
                Home
              </div>

              {/* My Clearance */}
              <div className={getNavItemClass('My Clearance')}
                onClick={() => navigate('/myclearance')}
              >
                My Clearance
              </div>

              {/* Log out */}
              <div className={getNavItemClass('Log out')} onClick={handleLogoutClick}>
                Log out
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={handleMobileMenuToggle}
                className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-col space-y-2">
                {/* Home */}
                <div className={getMobileNavItemClass('Home')} onClick={() => navigate('/student-home')}>
                  Home
                </div>

                {/* My Clearance */}
                <div className={getMobileNavItemClass('My Clearance')} onClick={() => navigate('/myclearance')}>
                  My Clearance
                </div>

                {/* Log out */}
                <div className={getMobileNavItemClass('Log out')} onClick={handleLogoutClick}>
                  Log out
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-90 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Are you sure you want to Log out?
            </h3>
            <div className="flex justify-center space-x-9">
              <button
                onClick={handleLogoutCancel}
                className="px-4 py-2 bg-white text-black border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleLogoutConfirm}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MyNavbar;