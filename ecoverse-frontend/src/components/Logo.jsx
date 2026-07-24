import React from 'react';

function Logo({ className = "h-10 w-auto" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" fill="none" className={className}>
      <path d="M12 30C12 18.9543 20.9543 10 32 10V30H12Z" fill="#15803D"/>
      <path d="M52 30C52 41.0457 43.0457 50 32 50V30H52Z" fill="#16A34A"/>
      <text x="65" y="40" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="24" fill="#15803D">EcoVerse</text>
    </svg>
  );
}

export default Logo;
