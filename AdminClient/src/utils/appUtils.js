

import React from 'react';
import { tailChase } from 'ldrs';

// Assuming tailChase.register() is necessary for <l-tail-chase> to work,
// and is idempotent (safe to call multiple times).
tailChase.register();

const Waiting = ({ message = "Loading..." }) => {
  return (
      <div className="flex justify-center items-center h-screen">
        <div>
          <l-tail-chase size="75" speed="1.75" color="#336699" />
        </div>
        <div className="mt-10">
          <p className="text-center" style={{ color: '#336699' }}>{message}</p>
        </div>
      </div>
  );
}

export default Waiting;
