// Navigation - dynamically displays links based on user authentication status

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../store/authSlice';
import FeatherIcon from 'feather-icons-react';

export default function Navigation() {
  const { user } = useSelector((state) => state.auth);
  // console.log("nav: user", user)
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const projectName = useSelector(state => state.app.projectName);

  const handleLogout = async () => {
    await dispatch(logout());
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

  const getMenuStructure = () => [
    {
      category: "Audio",
      icon: <FeatherIcon icon="volume-1" />,
      items: [
        { text: "All Audio", link: "/audio/list", permission: "audioList" },
        { text: "Add New Audio", link: "/audio/upload", permission: "audioUpload" },
      ],
    },
    {
      category: "Recipes",
      icon: <FeatherIcon icon="list" />,
      items: [
        { text: "All Recipes", link: "/recipe/list", permission: "recipeList" },
        { text: "Add New Recipe", link: "/recipe/create", permission: "recipeCreate" },
      ],
    },
    {
      category: "User",
      icon: <FeatherIcon icon="user" />,
      items: [
        { text: "Log In", link: "/signin", auth: "signin", 
          condition: !Boolean(user?.userID)
        },
        { text: "Signup", link: "/signup", auth: "signup", 
          condition: !Boolean(user?.userID)
        },
        { text: user?.username ?? 'Guest', link: "/profile", permission: "profile" },
        { text: "Edit Profile", link: "/profile/edit", permission: "profileEdit" },
        { text: "Logout", link: "/", action: handleLogout, permission: "", 
          condition: Boolean(user?.userID) 
        },
      ],
    },
    {
      category: "Admin",
      icon: <FeatherIcon icon="clipboard" />,
      items: [
        { text: "All Users", link: "/user/list", permission: "userList" },
        { text: "Roles", link: "/role/list", permission: "roleList" },
      ],
    },
  ];

  const generateMenuItems = () => {
    const menuStructure = getMenuStructure();
    // set perms to user.permissions or default allowed permissions array
    const permissions = user?.permissions ?? ["homepage", "signup", "signin"];
    return menuStructure
      .filter((category) => category.items.some((item) => permissions?.includes(item.permission) || item.condition))
      .map((category, index) => (
        <li key={index}>
          <div className="nav-level1">
            {category.icon}
            {category.category}
          </div>
          <ul className="nav-level2">
            {category.items
              .filter((item) => (
                item.condition === undefined && 
                permissions?.includes(item.permission)
              ) || item.condition === true)
              .map((item, itemIndex) => {
                // Define the click handler separately for clarity
                const handleClick = item.action ? () => item.action() : closeMenu;
                return (
                  <li key={itemIndex} onClick={handleClick}>
                    <Link to={item.link} className="nav-item">{item.text}</Link>
                  </li>
                );
              })}
          </ul>
        </li>
      ));
  };

  const menuItems = generateMenuItems();

  // Renders the navigation bar with conditional links for authenticated and unauthenticated users
  return (
    <nav className='navbar'>
      <div className="logo-wrapper">
        <Link className="logo" to='/'>
          {projectName}
        </Link>
      </div>
      <div className="navburger">
        <button className="icon" onClick={toggleMenu}>
          <FeatherIcon icon="menu" />&nbsp;
        </button>
        <ul className={`nav-dropdown ${isMenuOpen ? 'block' : 'hidden'}`}>
          {menuItems}
        </ul>
      </div>
    </nav>
  );
}