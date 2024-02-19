// Error.js defines a simple functional component for displaying a "Page Not Found" message.
// It serves as a generic error page, typically used for handling 404 errors within the application's routing.

export default function Error() {
  // The component renders a message indicating that the requested page could not be found.
  // It utilizes Tailwind CSS for styling to maintain consistency with the application's design system.
  return (
    <div>
      <h1 className='text-2xl text-center text-black'>Page Not Found</h1>
    </div>
  )
}
