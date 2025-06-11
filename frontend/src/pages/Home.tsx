import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button';

const Home: React.FC = () => {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-dark-800 dark:to-dark-700">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white mb-6">
            Book Tickets for Your Favorite Events
          </h1>
          <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            One platform for all your ticket needs - movies, concerts, and train journeys.
            Find the best events, book with ease, and enjoy hassle-free experiences.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/events">
              <Button variant="primary" size="lg">
                Browse Events
              </Button>
            </Link>
            <Link to="/register">
              <Button variant="outline" size="lg">
                Sign Up Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Events Section */}
      <section className="w-full py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Featured Events
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Placeholder for featured events */}
            {[1, 2, 3].map((item) => (
              <div 
                key={item} 
                className="bg-white dark:bg-dark-700 rounded-lg shadow-md p-4 h-64 flex items-center justify-center"
              >
                <p className="text-gray-500 dark:text-gray-400">Featured Event {item}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link to="/events">
              <Button variant="secondary">
                View All Events
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="w-full py-12 md:py-16 bg-light-100 dark:bg-dark-800">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-primary-600 dark:text-primary-400 text-2xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Browse Events</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Explore our wide range of events and filter by type, date, or venue.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-primary-600 dark:text-primary-400 text-2xl font-bold">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Book Tickets</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Select your preferred seats and securely complete your booking.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-primary-600 dark:text-primary-400 text-2xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Enjoy the Event</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Receive your e-tickets instantly and get ready for an amazing experience.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
