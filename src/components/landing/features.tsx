const features = [
  {
    title: 'Member Management',
    description:
      'Maintain a complete directory of members, volunteers, staff, and stakeholders in one centralized location.',
  },
  {
    title: 'Teams & Departments',
    description:
      'Organize individuals into departments, committees, projects, ministries, programs, or volunteer groups.',
  },
  {
    title: 'Attendance & Participation Tracking',
    description:
      'Monitor engagement across activities, events, meetings, and program involvement.',
  },
  {
    title: 'Analytics & Insight Dashboard',
    description:
      'Transform organizational data into actionable intelligence with leadership dashboards covering membership growth, participation trends, volunteer activity, attendance patterns, and team performance.',
  },
  {
    title: 'Communication Tools',
    description: 'Reach members quickly through centralized announcements and email.',
  },
  {
    title: 'Reports & Insights',
    description: 'Generate meaningful reports and CSV exports for better decision making.',
  },
]

export function LandingFeatures() {
  return (
    <section id="features" className="bg-sky-50 py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-center text-gray-900">Features</h2>

        <div className="grid md:grid-cols-3 gap-8 mt-12">
          {features.map((feature) => (
            <div key={feature.title} className="bg-blue-100 p-6 rounded-xl shadow-md">
              <h3 className="text-xl font-semibold mb-3 text-gray-900">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
