// static-reload.js

window.onload = function() {
  const reloadInterval = 5 * 60 * 1000; // 5 minutes in milliseconds
  const retryTimeElement = document.getElementById('retry-time');

  let remainingTime = reloadInterval;

  function updateRetryTime() {
    const minutes = Math.floor(remainingTime / 1000 / 60);
    const seconds = Math.floor((remainingTime / 1000) % 60);

    // Format seconds to always be two digits
    const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;

    // Update the text content of the retryTimeElement
    if (retryTimeElement) {
      retryTimeElement.textContent = `${minutes}:${formattedSeconds}`;
    }

    // Decrease remaining time
    remainingTime -= 1000;

    // If remaining time is zero or less, reload the page
    if (remainingTime <= 0) {
      location.reload();
    }
  }

  // Start the countdown and update every second
  updateRetryTime();
  setInterval(updateRetryTime, 1000);
};
