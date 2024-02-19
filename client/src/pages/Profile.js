import { useSelector } from 'react-redux';

const Profile = () => {
  const user = useSelector((state) => state.auth.user);
  return (
      <div>
          <h1 className='pb-6 text=2xl text-center text-black'>Profile</h1>
          {user ? <h2 className='text-xl text-center text-black'>Welcome, {user}</h2> : null}
      </div>
  ) 
}

export default Profile;