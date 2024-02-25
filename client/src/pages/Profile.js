// Profile.js defines the Profile component, which displays user-specific information
// retrieved from the global Redux store. It illustrates the integration of Redux state management
// within functional components using hooks.

// Importing useSelector hook for accessing Redux store state.
import { useSelector } from 'react-redux'; 

const Profile = () => {
  // Accessing the 'user' state from the 'auth' slice of the Redux store.
  // This state contains the current user's information.
  const userID = useSelector((state) => state.auth.userID);
  const role = useSelector((state) => state.auth.role);
  const user = useSelector((state) => state.auth.user);

  // The component conditionally renders user information based on the presence of the 'user' state.
  // Tailwind CSS classes are used for consistent styling.
  return (
      <div>
          <h1 className='pb-6 text=2xl text-center text-black'>Profile</h1>
          {user ? <h2 className='text-xl text-center text-black'>Welcome, {user}</h2> : null}
      </div>
  ) 
}
// Exports the Profile component for use in the application's routing setup.
export default Profile; 

//TODO: Handling Protected Client-Side Routes  
//TODO: Ensure we have token and userID available for this page in order to query the database for more information about the user.