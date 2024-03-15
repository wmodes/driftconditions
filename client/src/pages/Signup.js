// Signup.js handles the user registration process, capturing user details and using Redux for state management.

// useState hook for form input management.
import { useState } from 'react';
// Hooks for Redux state management and action dispatching.
import { useDispatch, useSelector } from 'react-redux';
// Importing the signup action from authSlice.
import { signup } from '../store/authSlice';
import { useCheckAuth } from '../utils/authUtils';
// For redirecting the user after successful registration.
import { Navigate } from 'react-router-dom';

function Signup() {    
  useCheckAuth('signup');
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

  // Check if required fields are filled
  const isFormValid = username && password && firstname && lastname && email;
  const Required = () => <span className="required">*</span>;

  // Renders the signup form with input fields for user details and conditional rendering for feedback.
  return (
    <div className="signup-wrapper">
      <div className="display-box-wrapper">
        <div className="display-box">
          <form onSubmit={submitHandler}>
            <h2 className='title'>Sign Up</h2>
            <label className="form-label" htmlFor="username">Username: <Required /></label>
            <input className="form-field" type="text" id="username" value={username} onChange={e => setUsername(e.target.value)} />
            <label className="form-label"  htmlFor="password">Password: <Required /></label>
            <input className="form-field" type="password" id="password" value={password} onChange={e => setPassword(e.target.value)} />
            <label className="form-label"  htmlFor="firstname">First Name: <Required /></label>
            <input className="form-field" type="text" id="firstname" value={firstname} onChange={e => setFirstname(e.target.value)} />
            <label className="form-label"  htmlFor="lastname">Last Name: <Required /></label>
            <input className="form-field" type="text" id="email" value={lastname} onChange={e => setLastname(e.target.value)} />
            <label className="form-label"  htmlFor="email">Email <Required /></label>
            <input className="form-field" type="text" id="email" value={email} onChange={e => setEmail(e.target.value)} />
            <div className='button-box'>
              <button className='button cancel' type="button">Cancel</button>
              <button className='button submit' type="submit" disabled={!isFormValid}>Register</button>
            </div>
            <div className='message-box'>
              {error && <p className="error">{error}</p>}
            </div>
            {user ? <Navigate to='/signin' replace={true} /> : null}
          </form>
        </div>
      </div>
    </div>
  );
}

// Makes Signup component available for import.
export default Signup;
