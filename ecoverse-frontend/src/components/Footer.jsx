import React from 'react';
import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="bg-primary text-on-primary py-12 mt-20">
      <div className="flex flex-col md:flex-row justify-between items-center px-margin-desktop max-w-max-width mx-auto">
        <div className="mb-8 md:mb-0 space-y-4 text-center md:text-left">
          <div className="text-card-h3 font-card-h3 text-on-primary font-bold">EcoVerse</div>
          <p className="font-body-main text-body-main text-on-primary/80 max-w-xs mx-auto md:mx-0">
            © 2024 EcoVerse. Precision Environmental Stewardship.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-x-12 gap-y-4">
          <Link className="text-on-primary/80 font-label-caps text-label-caps hover:text-on-primary transition-colors duration-200" to="/">Home</Link>
          <Link className="text-on-primary/80 font-label-caps text-label-caps hover:text-on-primary transition-colors duration-200" to="/contact">Contact</Link>
          <a className="text-on-primary/80 font-label-caps text-label-caps hover:text-on-primary transition-colors duration-200" href="#">Privacy Policy</a>
          <a className="text-on-primary/80 font-label-caps text-label-caps hover:text-on-primary transition-colors duration-200" href="#">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
