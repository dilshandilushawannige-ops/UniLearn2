import React from 'react';

const ProfileDropdown = ({ user, onLogout }) => {
  return (
    <div className="account-menu" style={{ minWidth: '270px' }}>
      <div className="profile-head">
        <p className="name">{user.username}</p>
        <p className="mail">{user.email}</p>
      </div>

      <div className="profile-meta">
        <p><strong>Current Year:</strong> {user.currentYear}</p>
        <p><strong>Current Semester:</strong> {user.currentSemester}</p>
      </div>

      <button onClick={onLogout} className="menu-logout">Logout</button>
    </div>
  );
};

export default ProfileDropdown;
