// Profile.js defines the Profile component, which displays user-specific information
// retrieved from the global Redux store. It illustrates the integration of Redux state management
// within functional components using hooks.

import { useSelector } from 'react-redux'; // Importing useSelector hook for accessing Redux store state.

const Profile = () => {
  // Accessing the 'user' state from the 'auth' slice of the Redux store.
  // This state contains the current user's information.
  const user = useSelector((state) => state.auth.user);

  // The component conditionally renders user information based on the presence of the 'user' state.
  // Tailwind CSS classes are used for consistent styling.
  return (
      <div>
          <h1 className='pb-6 text=2xl text-center text-black'>Profile</h1>
          {/* Conditionally displays a welcome message if the 'user' state is not null */}
          {user ? <h2 className='text-xl text-center text-black'>Welcome, {user}</h2> : null}
      </div>
  ) 
}

export default Profile; // Exports the Profile component for use in the application's routing setup.
