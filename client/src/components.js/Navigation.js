// This component creates a navigation bar for the application, dynamically adjusting its content based on the user's authentication status. It leverages react-router-dom for navigation and react-redux for state management. 

// Enables declarative navigation within the app.
import { Link, useNavigate } from 'react-router-dom';
// Hooks for interacting with Redux store.
import { useDispatch, useSelector } from 'react-redux';
// Imports the logout action for user sign-out.
import { logout } from '../store/authSlice';

// Defines a functional component for navigation that dynamically displays links based on user authentication status
export default function Navigation() {
  // Accesses Redux state to check if the user is authenticated
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  console.log("isAuthenticated:", isAuthenticated);
  // Initializes dispatch function for logging out
  const dispatch = useDispatch();
  // Initializes the navigate hook for redirecting the user.
  const navigate = useNavigate();

  // Handler for logout click event
  const handleLogout = async () => {
    // Dispatch the logout action
    await dispatch(logout());  
    // Navigate to the homepage after logout
    navigate('/');
  };

  // Renders the navigation bar with conditional links for authenticated and unauthenticated users
  return (
    <nav className='flex items-center justify-between w-full h-16 py-2 text-white border-b px-28 mb-1 bg-cornflower'>
      <Link to='/' className='text-2xl font-medium text-white'>
        interference
      </Link>
      { isAuthenticated ?
        <ul className='flex items-center h-16 text-xl'>
          <li>
            <Link to='/profile' className='text-white'>Profile</Link>
          </li>
          <li className='pl-20'>
              <Link to='/' onClick={handleLogout} className='text-white'>Logout</Link>
          </li>
        </ul>
      :
        <ul className='flex items-center h-16 text-xl'>
          <li>
            <Link to='/signup' className='text-white'>Signup</Link>
          </li>
          <li className='pl-20'>
            <Link to='/signin' className='text-white'>Signin</Link>
          </li>
        </ul>
      }
    </nav>
  )
}