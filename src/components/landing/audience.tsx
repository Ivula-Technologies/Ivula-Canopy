'use client'

import { motion } from 'framer-motion'

const audiences = [
  { title: 'Volunteer Groups & Nonprofits', description: 'Organize and track volunteer activities and events easily.', image: '/landing/Volunteers.png' },
  { title: 'Churches & Fellowships', description: 'Coordinate members, services, and church events from a single platform.', image: '/landing/churches.png' },
  { title: 'Youth & Membership Organizations', description: 'Engage and manage youth programs and activities at a glance with a clear dashboard.', image: '/landing/youthorg.png' },
  { title: 'Charities & Community Organizations', description: 'Track outreach programs and community support.', image: '/landing/charities.png' },
  { title: 'Educational Programs', description: 'Manage student groups, clubs, and events effectively.', image: '/landing/school.png' },
]

export function LandingAudience() {
  return (
    <section id="audience" className="py-20 bg-gradient-to-br from-sky-100 via-sky-200 to-sky-100">
      <div className="container max-w-7xl mx-auto px-10">
        <h2 className="text-4xl font-bold text-center text-gray-900">Who Is It For?</h2>
        <p className="text-center text-gray-600 mt-4 max-w-2xl mx-auto">
          Built specifically for organizations that bring people together and create impact.
        </p>

        <div className="mt-12">
          {audiences.map((item, index) => (
            <div
              key={item.title}
              className={`flex flex-col md:flex-row items-center gap-12 mb-24 ${
                index % 2 !== 0 ? 'md:flex-row-reverse' : ''
              }`}
            >
              {/* Image */}
              <motion.div
                className="w-full md:w-2/5"
                initial={{ opacity: 0, x: index % 2 === 0 ? -60 : 60 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-80 object-cover rounded-2xl shadow-lg transition-transform duration-300 hover:scale-105"
                />
              </motion.div>

              {/* Text */}
              <div className="w-full md:w-1/2">
                <h3 className="text-3xl md:text-4xl font-normal mb-4 text-gray-900">{item.title}</h3>
                <p className="text-gray-600 text-lg">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
