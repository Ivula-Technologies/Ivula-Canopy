const steps = [
  { number: '01', title: 'Create Your Organization', description: 'Set up your nonprofit, church, or community group in minutes.' },
  { number: '02', title: 'Add Members & Volunteers', description: 'Import or register members and volunteers into the platform.' },
  { number: '03', title: 'Organize Events', description: 'Plan activities, manage attendance, and coordinate schedules.' },
  { number: '04', title: 'Create Teams', description: 'Group members into committees, departments, or volunteer groups for better collaboration.' },
  { number: '05', title: 'Track Engagement', description: 'Measure participation and gain insights into community growth.' },
]

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="bg-slate-50 py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center text-gray-900">How It Works</h2>

        <div className="grid sm:grid-cols-2 md:grid-cols-5 gap-8 mt-12">
          {steps.map((step) => (
            <div key={step.number} className="text-center">
              <div className="w-16 h-16 bg-teal-900 text-white rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                {step.number}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">{step.title}</h3>
              <p className="mt-2 text-gray-600 text-sm">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
