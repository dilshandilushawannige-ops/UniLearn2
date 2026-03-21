import React from 'react';
import { Link } from 'react-router-dom';

const GuestDropdown = ({ onNavigate }) => {
  return (
    <div className="account-menu">
      <Link
        to="/login"
        onClick={onNavigate}
        className="menu-item"
      >
        Login
      </Link>
      <Link
        to="/signup"
        onClick={onNavigate}
        className="menu-item menu-primary"
      >
        Signup
      </Link>
    </div>
  );
};

export default GuestDropdown;
