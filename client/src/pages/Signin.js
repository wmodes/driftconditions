// The Signin component facilitates user login, interacting with Redux for state management and react-router-dom for navigation post-login.

// React's useState hook for managing form inputs.
import { useState } from 'react';
// Hooks for dispatching actions and accessing Redux state.
import { useDispatch, useSelector } from 'react-redux';
// signin async thunk for authentication.
import { signin } from '../store/authSlice';
// Navigate component for redirecting the user upon successful login.
import { Navigate } from 'react-router-dom';

function Signin() {
  // Local state for managing form inputs.
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  // Accessing the global state to check for current user and any authentication errors.
  const user = useSelector((state) => state.auth.user);
  const error = useSelector((state) => state.auth.error);
  // Hook to dispatch authentication action.
  const dispatch = useDispatch(); 

  // Handles form submission, dispatching the signin action and resetting form fields.
  const submitHandler = e => {
    e.preventDefault(); // Prevents the default form submission behavior.
    dispatch(signin({username, password}))
    .unwrap() // Unwraps the result of the thunk execution to handle it directly.
    .then((response) => {
      // Store the token in sessionStorage to maintain the user's session
      sessionStorage.setItem('sessionToken', response.token);
      console.log("Token stored in sessionStorage");
      // Proceed with resetting form fields or redirecting the user
      setUsername('');
      setPassword('');
    })
    .catch((error) => {
        // Handle any error here
        console.error("Login error:", error);
    });
}

  // Renders the sign-in form. Uses conditional rendering for displaying errors and redirecting on successful login.
  return (
    <div>
      <form className='bg-gray-200 mx-auto border-2 p-9 md:p-12 w-72 md:w-96 border-gray-400 mt-36 h-84 rounded' onSubmit={submitHandler}>
        <h2 className='pb-6 text-2xl text-center text-black'>Sign In</h2>
        <label className='mb-1 text-xl text-black-400' htmlFor="username">Username:</label>
        <input className='w-full h-8 p-1 mb-3' type="text" id="username" value={username} onChange={e => setUsername(e.target.value)} />
        <label className='mb-1 text-xl text-black-400'  htmlFor="password">Password:</label>
        <input className='w-full h-8 p-1 mb-3' type="password" id="password" value={password} onChange={e => setPassword(e.target.value)} />
        <div className='flex justify-between mt-4'>
          <button className='px-3 py-13 rounded-sm bg-white' type="button">Cancel</button>
          <button className='px-3 py-1 rounded-sm bg-white' type="submit">SignIn</button>
        </div>
        {error ? <p className='pt-10 text-center text-red-600'>{error}</p> : null}
        {user ? <Navigate to='/profile' replace={true} /> : null}
      </form>
    </div>
  );
}

// Exports the Signin component for use elsewhere in the app.
export default Signin;
