// Signup.js handles the user registration process, capturing user details and using Redux for state management.

// useState hook for form input management.
import { useState } from 'react';
// Hooks for Redux state management and action dispatching.
import { useDispatch, useSelector } from 'react-redux';
// Importing the signup action from authSlice.
import { signup } from '../store/authSlice';
// For redirecting the user after successful registration.
import { Navigate } from 'react-router-dom';
function Signup() {    
  // State hooks to store input values from the form.
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  // Accessing Redux state for user and error handling.
  const user = useSelector((state) => state.auth.user);
  const error = useSelector((state) => state.auth.error);
  // useDispatch hook to dispatch the signup action.
  const dispatch = useDispatch();

  // Handles form submission, invoking the signup process.
  const submitHandler = e => {
    // Prevents the default form submission.
    e.preventDefault();
    // Dispatches the signup action with user details.
    dispatch(signup({username, password, firstname, lastname, email}))
    .then((res) => {
      console.log("data received:", res);
      // Resets form fields after submission.
      setUsername('');
      setPassword('');
      setFirstname('');
      setLastname('');
      setEmail('');
    } )
  } 

  // Renders the signup form with input fields for user details and conditional rendering for feedback.
  return (
    <div>
      <form className='bg-gray-200 mx-auto border-2 p-9 md:p-12 w-72 md:w-96 border-gray-400 mt-36 h-84 rounded' onSubmit={submitHandler}>
        <h2 className='pb-6 text-2xl text-center text-black'>Sign Up</h2>
        <label className='mb-1 text-xl text-black-400' htmlFor="username">Username:</label>
        <input className='w-full h-8 p-1 mb-3' type="text" id="username" value={username} onChange={e => setUsername(e.target.value)} />
        <label className='mb-1 text-xl text-black-400'  htmlFor="password">Password:</label>
        <input className='w-full h-8 p-1 mb-3' type="password" id="password" value={password} onChange={e => setPassword(e.target.value)} />
        <label className='mb-1 text-xl text-black-400'  htmlFor="firstname">First Name:</label>
        <input className='w-full h-8 p-1 mb-3' type="text" id="firstname" value={firstname} onChange={e => setFirstname(e.target.value)} />
        <label className='mb-1 text-xl text-black-400'  htmlFor="lastname">Last Name:</label>
        <input className='w-full h-8 p-1 mb-3' type="text" id="email" value={lastname} onChange={e => setLastname(e.target.value)} />
        <label className='mb-1 text-xl text-black-400'  htmlFor="email">Email:</label>
        <input className='w-full h-8 p-1 mb-3' type="text" id="email" value={email} onChange={e => setEmail(e.target.value)} />
        <div className='flex justify-between mt-4'>
          <button className='px-3 py-13 rounded-sm bg-white' type="button">Cancel</button>
          <button className='px-3 py-1 rounded-sm bg-white' type="submit">Register</button>
        </div>
        {error ? <p className='pt-10 text-center text-red-600'>{error}</p> : null}
        {user ? <Navigate to='/profile' replace={true} /> : null}
      </form>
    </div>
  );
}

// Makes Signup component available for import.
export default Signup;
