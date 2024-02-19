// RootLayout component serves as the primary layout wrapper for the application. It incorporates the Navigation component and uses Outlet from react-router-dom to render child routes dynamically.

// Imports the Navigation component to be included in the layout.
import Navigation from '../components.js/Navigation';
// Outlet component is used to render the matched child route elements.
import { Outlet } from 'react-router-dom';

// Defines the RootLayout functional component that structures the main layout of the application
export default function RootLayout() {  
  // Renders the Navigation bar at the top and an Outlet for nested routes
  // The Outlet component will render the component for the currently matched route as defined in the routing setup
  return (
    <div>
      <Navigation />
      <Outlet />
    </div>
  )
}