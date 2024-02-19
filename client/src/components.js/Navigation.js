import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';

export default function Navigation() {
  const loggedIn = useSelector((state) => state.auth.isAuthenticated);
  const dispatch = useDispatch();
  return (
    <nav className='flex items-center justify-between w-full h-16 py-2 text-white border-b px-28 mb-36 bg-cornflower'>
      <Link to='/' className='text-2xl font-medium text-white'>
        interference
      </Link>
      { loggedIn ?
        <ul className='flex items-center h-16 text-xl'>
          <li>
            <Link to='/profile' className='text-white'>Profile</Link>
          </li>
          <li className='pl-20'>
              <Link to='/' onClick={() => dispatch(logout())} className='text-white'>Logout</Link>
          </li>
        </ul>
      :
        <ul className='flex items-center h-16 text-xl'>
          <li>
            <Link to='/signup' className='text-white'>Signup</Link>
          </li>
          <li className='pl-20'>
            <Link to='/signin' className='text-white'>Signin</Link>
          </li>
        </ul>
      }
    </nav>
  )
}