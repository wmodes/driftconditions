
import FeatherIcon from 'feather-icons-react';

// Function to render advanced pagination buttons with navigation controls
export const renderPagination = (totalRecords, recordsPerPage, currentPage, pageHandler) => {
  const pageCount = Math.ceil(totalRecords / recordsPerPage);
  
  return (
    <div className="pagination">
      <span className="mr-4">{totalRecords} items</span>
      {/* <span className="mr-1">Page:</span> */}
      <span className="pagination-controls">
        <button className="icon" onClick={() => pageHandler(1)} disabled={currentPage === 1}>
          <FeatherIcon icon="skip-back" />
        </button>
        <button className="icon" onClick={() => pageHandler(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
          <FeatherIcon icon="rewind" />
        </button>
        <span className="page-num">page {currentPage} of {pageCount}</span>
        <button className="icon" onClick={() => pageHandler(Math.min(pageCount, currentPage + 1))} disabled={currentPage === pageCount}>
          <FeatherIcon icon="fast-forward" />
        </button>
        <button className="icon" onClick={() => pageHandler(pageCount)} disabled={currentPage === pageCount}>
          <FeatherIcon icon="skip-forward" />
        </button>
      </span>
    </div>
  );
};
