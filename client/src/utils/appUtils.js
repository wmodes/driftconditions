

import React from 'react';
import { tailChase } from 'ldrs';

// Assuming tailChase.register() is necessary for <l-tail-chase> to work,
// and is idempotent (safe to call multiple times).
tailChase.register();

const Waiting = () => {
  return (
    <div className="flex justify-center items-center h-screen">
      {/* Ensure custom elements are recognized by React. */}
      <l-tail-chase size="75" speed="1.75" color="#336699" />
    </div>
  );
}

export default Waiting;
