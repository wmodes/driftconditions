import { useState } from 'react';
import axios from 'axios';
import { Navigate } from 'react-router-dom';

function Signin() {

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);

  const submitHandler = e => {
    e.preventDefault();
    axios.post('http://localhost:8080/signin', {
        username: username, 
        password: password
       })
      .then((res) => {
        console.log("data received:", res);
        setUsername('');
        setPassword('');
        setUser(res.data.username);
      } )
  } 

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
        {user ? <Navigate to='/profile' replace={true} state={user} /> : null}
      </form>
    </div>
  );
}

export default Signin;
