import React from 'react';
import { Link } from 'react-router-dom';

const ActionButton: React.FC<{ to: string; children: React.ReactNode; primary?: boolean }> = ({ to, children, primary }) => (
  <Link
    to={to}
    className={`font-heading text-fluid-lg px-8 py-4 rounded-lg shadow-3d font-bold border-2 border-light-text transform transition-transform duration-300 hover:scale-105 active:translate-y-1 active:shadow-none animate-pulse-glow ${primary ? 'bg-gradient-to-br from-neon-green to-electric-blue text-dark-text' : 'bg-transparent text-light-text'}`}>
    {children}
  </Link>
);

const HowItWorksCard: React.FC<{ number: string; title: string; description: string }> = ({ number, title, description }) => (
  <div className="group relative p-8 bg-dark-bg/50 backdrop-blur-sm rounded-2xl border-2 border-electric-blue shadow-neon-outline-blue hover:shadow-neon-outline-green transition-shadow duration-300 transform hover:-translate-y-2">
    <div className="absolute -top-8 -left-4 font-heading text-fluid-7xl text-vibrant-purple opacity-20 group-hover:opacity-50 transition-opacity duration-300">{number}</div>
    <h3 className="font-heading text-fluid-2xl text-neon-green uppercase tracking-wider text-shadow-neon-green mb-4">{title}</h3>
    <p className="font-body text-fluid-base text-light-text/80">{description}</p>
    <div className="absolute inset-0 bg-gradient-to-br from-neon-pink to-vibrant-purple opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-2xl"></div>
  </div>
);

const Home: React.FC = () => {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="w-full flex flex-col items-center justify-center text-center min-h-[80vh] p-8 bg-dark-bg bg-cover bg-center" style={{backgroundImage: 'radial-gradient(circle, #300030, #1a001a)'}}>
        <h1 className="font-heading text-fluid-7xl text-light-text animate-glow leading-tight mb-6">
          Your Portal to <span className="text-laser-lemon">Unforgettable</span> Events
        </h1>
        <p className="font-body text-fluid-xl text-light-text/80 max-w-4xl mx-auto mb-10">
          Dive into a world of live music, thrilling movies, and seamless travel. Your next great experience is just a click away.
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
          <ActionButton to="/events" primary>Explore Events</ActionButton>
          <ActionButton to="/register">Join the Hype</ActionButton>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="w-full py-20 md:py-32 px-8 bg-dark-bg">
        <h2 className="font-heading text-fluid-5xl text-center text-light-text text-shadow-neon-pink mb-20">
          How It Works
        </h2>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <HowItWorksCard 
            number="01" 
            title="Discover" 
            description="Browse our vast selection of events. Use our hyper-intuitive filters to find exactly what you're looking for—or something unexpectedly amazing."
          />
          <HowItWorksCard 
            number="02" 
            title="Book" 
            description="Secure your spot with our seamless, hyper-secure checkout process. Your tickets are beamed directly to your account in seconds."
          />
          <HowItWorksCard 
            number="03" 
            title="Experience" 
            description="Flash your e-ticket at the gate and dive into the experience. All fun, no friction. Welcome to the future of ticketing."
          />
        </div>
      </section>
    </div>
  );
};

export default Home;
