import React, { useEffect, useState } from 'react';

function App() {
  const [serverStatus, setServerStatus] = useState('');

  useEffect(() => {
    fetch('/api/status')
      .then(response => response.json())
      .then(data => setServerStatus(data.status))
      .catch(error => console.error('There was an error!', error));
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <p>
          Server Status: {serverStatus}
        </p>
      </header>
    </div>
  );
}

export default App;