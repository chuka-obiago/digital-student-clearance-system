import { useNavigate } from 'react-router-dom';
import welcomeImage from './assets/images/welcomeimage.png';

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl w-full flex flex-col lg:flex-row items-center justify-center gap-8 md:gap-12 lg:gap-20">

        {/* Image Part */}
        <div className="flex-1 max-w-lg flex justify-center order-1 lg:order-2">
          <img
            src={welcomeImage}
            alt="Digital Student Clearance System Image"
            className="w-full h-auto max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg object-contain"
          />
        </div>

        {/* Content Part */}
        <div className="flex-1 max-w-lg text-center lg:text-left order-2 lg:order-1">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-4 md:mb-6 text-gray-900 leading-tight">
            Digital Student Clearance System
          </h1>
          <p className="text-gray-600 text-base sm:text-lg md:text-xl mb-8 md:mb-10 leading-relaxed">
            Simplifying student clearance for a seamless experience
          </p>
          <div className="flex gap-3 sm:gap-4 flex-col sm:flex-row justify-center">
            <button
              onClick={() => navigate('/login')}
              className="px-6 sm:px-8 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium text-base sm:text-lg"
            >
              Login
            </button>
            <button
              onClick={() => navigate('/createaccount')}
              className="px-6 sm:px-8 py-2.5 sm:py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200 font-medium text-base sm:text-lg"
            >
              Create Account
            </button>
          </div>
        </div>
      </div>

      {/* Direct to pages */}
            {/* <div className="mt-6 text-center">
              <span className="text-gray-600"> - </span>
              <button
                onClick={() => navigate('/student-home')}
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Student
              </button>
            </div>

            <div className="mt-6 text-center">
              <span className="text-gray-600"> - </span>
              <button
                onClick={() => navigate('/staff')}
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Staff
              </button>
            </div>

            <div className="mt-6 text-center">
              <span className="text-gray-600"> - </span>
              <button
                onClick={() => navigate('/admin')}
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Admin
              </button>
            </div> */}
          
    </div>
    
  );
}