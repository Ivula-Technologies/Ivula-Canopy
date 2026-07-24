const questions = [
  {
    question: 'Who is Ivula Canopy for?',
    answer:
      'Ivula Canopy is built for growing nonprofits, churches, youth programs, volunteer groups, and community organizations that need one reliable place to manage people and programs.',
  },
  {
    question: 'What can we manage with Ivula Canopy?',
    answer:
      'Your team can organize people and volunteers, create teams and events, record attendance, share announcements, and produce reports and CSV exports for leadership and planning.',
  },
  {
    question: 'Do we need technical staff to get started?',
    answer:
      'No. Canopy is designed for lean teams, part-time administrators, and volunteer coordinators. You can begin with your organization and people, then add programs as you go.',
  },
  {
    question: 'Can we try Canopy before committing?',
    answer: 'Yes. Start with a 14-day free trial. No credit card is required.',
  },
]

export function LandingFaq() {
  return (
    <section id="faq" className="bg-white px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">Questions, answered</p>
          <h2 className="mt-3 text-4xl font-bold text-gray-900">Software should make your work feel lighter</h2>
          <p className="mt-4 text-lg text-gray-600">Here is what to expect when you bring your everyday operations into Canopy.</p>
        </div>
        <div className="mt-10 divide-y divide-sky-100 rounded-2xl border border-sky-100 bg-sky-50/50 px-6">
          {questions.map((item) => (
            <details key={item.question} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-semibold text-gray-900">
                {item.question}
                <span className="text-2xl font-normal text-sky-700 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="max-w-3xl pt-3 leading-7 text-gray-600">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
