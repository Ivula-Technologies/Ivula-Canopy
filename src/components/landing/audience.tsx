'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

const audiences = [
  { title: 'Volunteer Groups & Nonprofits', description: 'Coordinate volunteers, attendance, outreach, and leadership reports without juggling disconnected spreadsheets.', image: '/landing/Volunteers.png', width: 552, height: 369 },
  { title: 'Churches & Ministries', description: 'Manage members, ministries, services, events, and care teams from one operational dashboard.', image: '/landing/churches.png', width: 315, height: 314 },
  { title: 'Youth & Membership Organizations', description: 'Keep youth programs, clubs, chapters, and member activities organized as participation grows.', image: '/landing/youthorg.webp', width: 960, height: 640 },
  { title: 'Charities & Community Organizations', description: 'Track programs, outreach, donors, volunteers, and community support in one place.', image: '/landing/charities.webp', width: 960, height: 698 },
  { title: 'Educational Programs', description: 'Support clubs, cohorts, student groups, and extracurricular events with clear records and reporting.', image: '/landing/school.png', width: 606, height: 607 },
]

export function LandingAudience() {
  return (
    <section id="audience" className="bg-gradient-to-br from-sky-100 via-sky-50 to-white py-20">
      <div className="container mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">Who it serves</p>
          <h2 className="mt-3 text-4xl font-bold text-gray-900">Made for organizations that bring people together</h2>
          <p className="mt-4 text-lg text-gray-600">
            If your team is responsible for people, programs, service, and impact, Ivula Canopy helps you keep the work visible and manageable.
          </p>
        </div>

        <div className="mt-12">
          {audiences.map((item, index) => (
            <div
              key={item.title}
              className={`mb-16 flex flex-col items-center gap-8 rounded-3xl bg-white/70 p-5 shadow-sm ring-1 ring-white/80 md:flex-row md:p-8 lg:mb-20 lg:gap-12 ${
                index % 2 !== 0 ? 'md:flex-row-reverse' : ''
              }`}
            >
              {/* Image */}
              <motion.div
                className="w-full md:w-2/5"
                initial={{ opacity: 0, x: index % 2 === 0 ? -40 : 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <Image
                  src={item.image}
                  alt={item.title}
                  width={item.width}
                  height={item.height}
                  sizes="(min-width: 768px) 40vw, 100vw"
                  className="h-72 w-full rounded-2xl object-cover shadow-lg transition-transform duration-300 hover:scale-[1.02] md:h-80"
                />
              </motion.div>

              {/* Text */}
              <div className="w-full md:w-1/2">
                <h3 className="text-3xl font-semibold text-gray-900 md:text-4xl">{item.title}</h3>
                <p className="mt-4 text-lg leading-8 text-gray-600">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
