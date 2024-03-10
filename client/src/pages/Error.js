// Error.js defines a simple functional component for displaying a "Page Not Found" message.
// It serves as a generic error page, typically used for handling 404 errors within the application's routing.

import FeatherIcon from 'feather-icons-react';

export default function Error() {
  // The component renders a message indicating that the requested page could not be found.
  // It utilizes Tailwind CSS for styling to maintain consistency with the application's design system.
  return (
    <div className="profile-edit-wrapper">
      <div className="display-box-wrapper">
        <div className="display-box">
          <div className='flex items-center mb-4'>
            <div className='flex-shrink-0'>
              <div className='avatar error'>
                <FeatherIcon icon="alert-triangle" />
              </div>
            </div>
            <div className='flex-grow ml-4 text-center'>
              <h2 className='title'>Four, Oh Four</h2>
            </div>
          </div>
          <p>Sadly, this page was not found.</p>
          <p>This is the end of the interweb. The vast tubes and pipes that make up this world wide web-that big, mostly empty series of tubes-is indeed an eco-system on its last legs.</p>
          <p>You've heard about climate change and how it's affecting everyone from polar bears to your Aunt Tilly who lives in that hurricane-prone spot on the Gulf Coast. But have you thought about what will happen to these poor barcode-striped tubes when all those coast-dwelling folks have flooded out of their homes in search of higher, drier ground? How will we get our daily fix of rage-fueled political memes or pictures with clever kittens playing pianos under antique overlays with faux-hipstamatic filters? This cannot go on forever!</p>
        </div>
      </div>
    </div>
  )
}
