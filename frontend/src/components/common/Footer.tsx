import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin } from 'react-icons/fa';

const FooterLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => (
  <Link to={to} className="font-body text-fluid-base text-laser-lemon hover:text-light-text hover:scale-110 transform transition-transform duration-300 block w-fit">
    {children}
  </Link>
);

const SocialIcon: React.FC<{ href: string; icon: React.ElementType; label: string }> = ({ href, icon: Icon, label }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="text-light-text hover:text-neon-green transform transition-transform duration-300 hover:scale-125 hover:animate-pulse-glow">
    <Icon className="h-8 w-8" />
  </a>
);

const Footer: React.FC = () => {
  const socialLinks = [
    { icon: FaFacebook, href: 'https://facebook.com', label: 'Facebook' },
    { icon: FaTwitter, href: 'https://twitter.com', label: 'Twitter' },
    { icon: FaInstagram, href: 'https://instagram.com', label: 'Instagram' },
    { icon: FaLinkedin, href: 'https://linkedin.com', label: 'LinkedIn' },
  ];

  const footerSections = [
    {
      title: 'About Us',
      links: [
        { text: 'Our Story', href: '/about' },
        { text: 'Careers', href: '/careers' },
        { text: 'Press', href: '/press' },
      ],
    },
    {
      title: 'Quick Links',
      links: [
        { text: 'Home', href: '/' },
        { text: 'Events', href: '/events' },
        { text: 'My Tickets', href: '/tickets' },
        { text: 'FAQs', href: '/faq' },
      ],
    },
    {
      title: 'Support',
      links: [
        { text: 'Contact Us', href: '/contact' },
        { text: 'Help Center', href: '/help' },
        { text: 'Terms of Service', href: '/terms' },
        { text: 'Privacy Policy', href: '/privacy' },
      ],
    },
  ];

  return (
    <footer className="mt-auto p-8 bg-gradient-to-r from-neon-pink via-vibrant-purple to-electric-blue animate-gradient-shift shadow-neon-outline-blue border-t-4 border-laser-lemon">
      <div className="w-full grid grid-cols-1 md:grid-cols-4 gap-8">
        {footerSections.map((section) => (
          <div key={section.title}>
            <h3 className="font-heading text-fluid-xl text-light-text uppercase tracking-widest text-shadow-neon-pink">{section.title}</h3>
            <ul className="mt-6 space-y-4">
              {section.links.map((link) => (
                <li key={link.text}>
                  <FooterLink to={link.href}>{link.text}</FooterLink>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <h3 className="font-heading text-fluid-xl text-light-text uppercase tracking-widest text-shadow-neon-pink">Connect</h3>
          <div className="mt-6 flex space-x-6">
            {socialLinks.map((social) => (
              <SocialIcon key={social.label} {...social} />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-12 border-t-2 border-laser-lemon pt-8 text-center">
        <p className="font-body text-fluid-sm text-light-text text-shadow-neon-pink">&copy; {new Date().getFullYear()} TicketBooking. All rights reserved. Stay weird.</p>
      </div>
    </footer>
  );
};

export default Footer;
