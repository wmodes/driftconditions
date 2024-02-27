// client/src/pages/Homepage.js

import React from 'react';
// feather icons
import FeatherIcon from 'feather-icons-react';

const Homepage = () => {
  return (
    <div class="profile-edit-wrapper">
      <div class="homepage-box-wrapper">
        <div class="homepage-box">
          <div className="flex flex-wrap gap-4">
            <div className="w-4/12">
              <h2 class='title'>
                <FeatherIcon icon="radio" />&nbsp;tune in</h2>
              <div className='text-xl'>
                <p>Interference whispers its tales as <b>secrets shared under the cloak of night,</b> an intimate exchange between the listener and the vast, unseen world.</p> 
                <p>It's told not with the clarity of daylight but with the mystery of shadows, where sounds blend and tales intertwine like <b>conversations on a long, late-night journey</b> with a close companion.</p>
                <p>Stories come through in <b>fragmented pieces,</b> an overheard conversation, a distorted broadcast, a larger narrative.</p>
                <p>It invites you to lean closer, to become part of an unfolding mystery, <b>the warmth of voice and the chill of the unknown,</b> all wrapped in the serendipity of an endless night drive.</p>
              </div>
            </div>
            <div className="w-7/12">
              <div class='player'>
              <h2 class='title'>
                <FeatherIcon icon="airplay" />&nbsp;stream</h2>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Homepage;
