import React from 'react';
import './Logo.css';

function Logo() {
  return (
    <div className="logo">
      <img 
        id="logo-main"
        src="/images/seoul_logo4 (하트없는버젼).png"
        alt="Seoul Logo"
      />
      <img 
        src="/images/heart.png" 
        alt="heart" 
        id="heart"
      />
      <div id="black-overlay"></div>
    </div>
  );
}

export default Logo;