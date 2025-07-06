import React from 'react';

const About: React.FC = () => {
  return (
    <div className="px-4 md:px-6 py-12">
      <h1 className="text-fluid-4xl font-bold text-center text-gray-900 dark:text-white mb-8">
        About Us
      </h1>
      <div className="max-w-3xl mx-auto bg-white dark:bg-dark-700 rounded-lg shadow-md p-8">
        <p className="text-fluid-lg text-gray-700 dark:text-gray-300">
          Thanjavur's finest ticket booking site. Trusted by tens (pls take me in)
        </p>
      </div>
    </div>
  );
};

export default About;
