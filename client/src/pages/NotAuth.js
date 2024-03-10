// NotAuth - A page component that renders a message indicating that the requested page could not be found. It utilizes Tailwind CSS for styling to maintain consistency with the application's design system.

import FeatherIcon from 'feather-icons-react';

export default function NotAuth() {
  // The component renders a message indicating that the requested page could not be found.
  // It utilizes Tailwind CSS for styling to maintain consistency with the application's design system.
  return (
    <div className="profile-edit-wrapper">
      <div className="display-box-wrapper">
        <div className="display-box">
          <div className='flex items-center mb-4'>
            <div className='flex-shrink-0'>
              <div className='avatar error'>
                <FeatherIcon icon="alert-octagon" />
              </div>
            </div>
            <div className='flex-grow ml-4 text-center'>
              <h2 className='title'>Unauthorized!</h2>
            </div>
          </div>
          <p>ALERT: Unauthorized Access Detected.</p>
          <p>Your attempt to access restricted systems has been detected and blocked by our security protocols. Your unauthorized activity has triggered multiple alerts, and our cybersecurity team has been notified of the attempted breach.</p>
          <p>Please be advised that further attempts to circumvent our security measures may result in legal action being taken against you. We take the protection of our systems and data seriously, and any unauthorized access will be treated as a serious violation.</p>
          <p>Or maybe we just fucked up and redirected you to the wrong page.</p>
        </div>
      </div>
    </div>
  )
}
