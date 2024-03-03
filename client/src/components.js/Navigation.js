// This component creates a navigation bar for the application, dynamically adjusting its content based on the user's authentication status. It leverages react-router-dom for navigation and react-redux for state management. 

// Import react and useState hook for component state management.
import React, { useState } from 'react'; 
// Enables declarative navigation within the app.
import { Link, useNavigate } from 'react-router-dom';
// Hooks for interacting with Redux store.
import { useDispatch, useSelector } from 'react-redux';
// Imports the logout action for user sign-out.
import { logout } from '../store/authSlice';
// Import logo
import { ReactComponent as Logo } from '../images/interference.svg';
// feather icons
import FeatherIcon from 'feather-icons-react';

// Defines a functional component for navigation that dynamically displays links based on user authentication status
export default function Navigation() {
  // Accesses Redux state to check if the user is authenticated
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  // console.log("isAuthenticated:", isAuthenticated);
  // Initializes dispatch function for logging out
  const dispatch = useDispatch();
  // Initializes the navigate hook for redirecting the user.
  const navigate = useNavigate();
  // State to control the dropdown menu visibility
  const [isMenuOpen, setIsMenuOpen] = useState(false); 

  // Handler for logout click event
  const handleLogout = async () => {
    // Dispatch the logout action
    await dispatch(logout());  
    // Navigate to the homepage after logout
    navigate('/');
  };

  // Toggles the menu visibility
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  // Function to close the menu
  const closeMenu = () => {
    setIsMenuOpen(false); // Assuming setIsMenuOpen is the setter for your menu state
  };
  
  
  // Menu items based on authentication
  const menuItems = [
    // Dynamically generate menu items based on authentication status
    isAuthenticated ? (
      <>
        <li onClick={closeMenu}>
          <Link to='/profile' className='block px-4 py-2 text-white hover:bg-blue-500'>Profile</Link>
        </li>
      <li onClick={closeMenu}>
        <Link to='/audio/upload' className='block px-4 py-2 text-white hover:bg-blue-500'>Upload Audio</Link>
      </li>
        <li onClick={closeMenu}>
          <Link to='/' onClick={(e) => {
              e.preventDefault();
              handleLogout();
              closeMenu();
            }} className='block px-4 py-2 text-white hover:bg-blue-500'>Logout</Link>
        </li>
      </>
    ) : (
      <>
        <li onClick={closeMenu}>
          <Link to='/signup' className='block px-4 py-2 text-white hover:bg-blue-500'>Signup</Link>
        </li>
        <li onClick={closeMenu}>
          <Link to='/signin' className='block px-4 py-2 text-white hover:bg-blue-500'>Signin</Link>
        </li>
      </>
    )
  ];

  // Renders the navigation bar with conditional links for authenticated and unauthenticated users
  return (
    <nav className='flex items-center justify-between w-full h-16 py-2 text-white border-b px-28 mb-1 bg-cornflower'>
      <Link to='/'>
        <Logo id="logo" />
      </Link>
      <div className="relative">
        {/* Navburger Icon */}
        <button onClick={toggleMenu} className="px-2 py-1 text-white">
          {/* Icon or text representing the navburger */}
          <FeatherIcon icon="menu" />&nbsp;
        </button>
        {/* Dropdown Menu */}
        <ul className={`mt-2 py-2 px-6 absolute right-0 w-48 bg-cornflower ${isMenuOpen ? 'block' : 'hidden'}`}>
          {menuItems}
        </ul>
      </div>
    </nav>
  );
}