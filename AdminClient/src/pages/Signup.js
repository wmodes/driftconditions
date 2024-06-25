// Signup.js handles the user registration process, capturing user details and using Redux for state management.

// useState hook for form input management.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// Hooks for Redux state management and action dispatching.
import { useDispatch } from 'react-redux';
// Importing the signup action from authSlice.
import { signup } from '../store/authSlice';

function Signup() {
  const navigate = useNavigate();
  // State hooks to store input values from the form.
  const [record, setRecord] = useState({
    username: '',
    password: '',
    firstname: '',
    lastname: '',
    location: '',
    email: '',
  });

  const [isFormValid, setIsFormValid] = useState(false);

  // Accessing Redux state for error handling.
  const [error, setError] = useState('');
  // useDispatch hook to dispatch the signup action.
  const dispatch = useDispatch();

  // Handle form input changes and update the record state
  const handleChange = (e) => {
    const { name, value: initialValue } = e.target;
    // console.log(`Signup: handleChange: name: ${name}, value: ${initialValue}`)
    let value = initialValue;
    if (name === 'username') {
      // Convert username to lowercase and remove spaces and all non-alphanumeric characters
      value = value.toLowerCase().replace(/[^a-z0-9]/g, '');
    }
    setRecord(prevState => ({ ...prevState, [name]: value }));
  };

  // Handles form submission, invoking the signup process.
  const handleSubmit = e => {
    // Prevents the default form submission.
    e.preventDefault();
    // Dispatches the signup action with user details.
    dispatch(signup({record}))
    .then((res) => {
      // console.log("data received:", res);
      navigate('/signin');
    })
    .catch((error) => {
        // Handle any error here
        console.error("Signup error:", error);
        setError('Error signing up. Please try again.');
    });
  } 

  // Check if all required fields are filled
  useEffect(() => {
    const isValid = record.username && record.password && record.firstname && record.lastname && record.email;
    setIsFormValid(isValid);
    // setError(isValid ? '' : 'Please fill in all fields');
  }, [record]);

  const Required = () => <span className="required">*</span>;

  // Renders the signup form with input fields for user details and conditional rendering for feedback.
  return (
    <div className="signin-wrapper">
      <div className="display-box-wrapper">
        <div className="display-box">
          <form onSubmit={handleSubmit}>
            <h2 className='title'>Sign up</h2>
            <label className="form-label" htmlFor="username">Username: <Required /></label>
            <input className="form-field" type="text" name="username" value={record.username} onChange={handleChange} />
            <label className="form-label"  htmlFor="password">Password: <Required /></label>
            <input className="form-field" type="password" name="password" value={record.password} onChange={handleChange} />
            <label className="form-label"  htmlFor="firstname">First Name: <Required /></label>
            <input className="form-field" type="text" name="firstname" value={record.firstname} onChange={handleChange} />
            <label className="form-label"  htmlFor="lastname">Last Name: <Required /></label>
            <input className="form-field" type="text" name="lastname" value={record.lastname} onChange={handleChange} />
            <label className="form-label" htmlFor="location">Location:</label>
            <input className="form-field" type="text" name="location" value={record.location} onChange={handleChange} />
            <label className="form-label"  htmlFor="email">Email <Required /></label>
            <input className="form-field" type="text" name="email" value={record.email} onChange={handleChange} />
            <div className='button-box'>
              <button className='button cancel' type="button">Cancel</button>
              <button className='button submit' type="submit" disabled={!isFormValid}>Register</button>
            </div>
            <div className='message-box'>
              {error && <p className="error">{error}</p>}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Makes Signup component available for import.
export default Signup;
