/**
 * @file A set of utilities for displaying a loading animation and generating unique identifiers.
 */

import { useState } from 'react';
import { tailChase } from 'ldrs';
import { v4 as uuidv4 } from 'uuid';

// Assuming tailChase.register() is necessary for <l-tail-chase> to work,
// and is idempotent (safe to call multiple times).
tailChase.register();

/**
 * Waiting component that displays a loading animation and an optional message.
 * @param {Object} props - The props object.
 * @param {string} [props.message="Loading..."] - The message to display.
 * @returns {JSX.Element} The Waiting component.
 */
export const Waiting = ({ message = "Loading..." }) => {
  return (
    <div className="flex flex-col justify-center items-center h-screen">
      <div>
        <l-tail-chase size="75" speed="1.75" color="#336699" />
      </div>
      <div className="mt-10">
        <p className="text-center" style={{ color: '#336699' }}>{message}</p>
      </div>
    </div>
  );
}

/**
 * Custom hook to generate a unique identifier.
 * @returns {string} Unique identifier.
 */
export const useUniqueId = () => {
  const [uniqueId] = useState(uuidv4());
  return uniqueId;
};
