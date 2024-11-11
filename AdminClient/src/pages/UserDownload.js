import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { userList as userListAction } from '../store/userSlice';
import Papa from 'papaparse';
import FeatherIcon from 'feather-icons-react';

function UserDownload() {
  const dispatch = useDispatch();
  const [userList, setUserList] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    // Omitting 'page' and 'offset' so all records are retrieved
    dispatch(userListAction({ queryParams: { sort: 'date', order: 'DESC' } }))
      .unwrap()
      .then(response => {
        setUserList(response.userList || []);
      })
      .catch(error => {
        console.error("Error fetching user list:", error);
        setError('Failed to fetch user list.');
      });
  }, [dispatch]);

  const downloadCSV = () => {
    try {
      const csv = Papa.unparse(userList);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
  
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'user_list.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error generating CSV:", error);
      setError('Failed to generate CSV.');
    }
  };

  return (
    <div className="list-wrapper">
      <div className="display-box-wrapper">
        <div className="display-box">
          <h2 className="title">Download User List</h2>
          <div className="message-box">
            {error && <p className="text-red-500">{error}</p>}
          </div>
          <div className="flex justify-center mt-4">
            <button 
              onClick={downloadCSV} 
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
              disabled={userList.length === 0}
            >
              <FeatherIcon icon="download" className="mr-2" />
              <span>Download CSV</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserDownload;
