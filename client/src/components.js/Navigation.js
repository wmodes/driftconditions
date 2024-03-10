// This component creates a navigation bar for the application, dynamically adjusting its content based on the user's authentication status. It leverages react-router-dom for navigation and react-redux for state management. 

// Import react and useState hook for component state management.
import React, { useState } from 'react'; 
// Enables declarative navigation within the app.
import { Link, useNavigate } from 'react-router-dom';
// Hooks for interacting with Redux store.
import { useDispatch, useSelector } from 'react-redux';
// Imports the logout action for user sign-out.
import { logout } from '../store/authSlice';
// feather icons
import FeatherIcon from 'feather-icons-react';

// Defines a functional component for navigation that dynamically displays links based on user authentication status
export default function Navigation() {
  // Accessing Redux state for user (to check if logged in)
  const { isAuthenticated, userID, username } = useSelector(state => state.auth);
  // Access projectName from the global state
  const projectName = useSelector(state => state.app.projectName);
  // console.log('Nav userID', userID);
  // console.log('Nav username', username);
  
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
  const menuItems = isAuthenticated ? [
    <li key="audio">
      <div className="nav-level1"><FeatherIcon icon="volume-1" />Audio</div>
        <ul className="nav-level2">
          <li onClick={closeMenu}>
            <Link to='/audio/list' className='nav-item'>All Audio</Link>
          </li>
          <li onClick={closeMenu}>
            <Link to='/audio/upload' className='nav-item'>Add New Audio</Link>
          </li>
        </ul>
    </li>,
    <li key="users">
      <div className="nav-level1"><FeatherIcon icon="user" />User</div>
      <ul className="nav-level2">
        <li onClick={closeMenu}>
          <Link to='/profile' className='nav-item'>{ username }</Link>
        </li>
        <li onClick={closeMenu}>
          <Link to='/profile/edit' className='nav-item'>Edit Profile</Link>
        </li>
        <li onClick={closeMenu}>
          <Link to='/' onClick={(e) => {
              e.preventDefault();
              handleLogout();
              closeMenu();
            }} className='nav-item'>Logout</Link>
        </li>
      </ul>
    </li>
  ] : [
    <li key="signin" onClick={closeMenu}>
      <Link to='/signin' className='nav-item'>Log In</Link>
    </li>,
    <li key="signup" onClick={closeMenu}>
      <Link to='/signup' className='nav-item'>Signup</Link>
    </li>
  ];

  // Renders the navigation bar with conditional links for authenticated and unauthenticated users
  return (
    <nav className='navbar'>
      <div className="logo-wrapper">
        <Link className="logo" to='/'>
          {projectName}
        </Link>
      </div>
      <div className="navburger">
        {/* Navburger Icon */}
        <button key="navburger" onClick={toggleMenu}>
          {/* Icon or text representing the navburger */}
          <FeatherIcon icon="menu" />&nbsp;
        </button>
        {/* Dropdown Menu */}
        <ul className={`nav-dropdown ${isMenuOpen ? 'block' : 'hidden'}`}>
          {menuItems}
        </ul>
      </div>
    </nav>
  );
}