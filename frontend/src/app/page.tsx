import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="z-10 max-w-5xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 text-gray-900">RostraCore v1</h1>
          <p className="text-2xl text-gray-700 mb-2">Algorithmic Roster & Budget Engine</p>
          <p className="text-gray-600">Intelligent security guard scheduling powered by deterministic algorithms</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          <Link href="/employees">
            <div className="p-8 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer">
              <h2 className="text-2xl font-semibold mb-3 text-gray-900">👥 Employees</h2>
              <p className="text-gray-600">Manage security guards, track skills, certifications, and availability</p>
              <div className="mt-4 text-blue-600 font-medium">Manage →</div>
            </div>
          </Link>

          <Link href="/sites">
            <div className="p-8 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer">
              <h2 className="text-2xl font-semibold mb-3 text-gray-900">📍 Sites</h2>
              <p className="text-gray-600">Manage client locations, requirements, and shift patterns</p>
              <div className="mt-4 text-blue-600 font-medium">Manage →</div>
            </div>
          </Link>

          <Link href="/shifts">
            <div className="p-8 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer">
              <h2 className="text-2xl font-semibold mb-3 text-gray-900">📅 Shifts</h2>
              <p className="text-gray-600">Create and manage work shifts with filtering and assignments</p>
              <div className="mt-4 text-blue-600 font-medium">Manage →</div>
            </div>
          </Link>

          <Link href="/roster">
            <div className="p-8 bg-white border-2 border-blue-500 rounded-xl hover:shadow-xl transition-all cursor-pointer bg-gradient-to-br from-blue-50 to-white">
              <h2 className="text-2xl font-semibold mb-3 text-gray-900">🤖 Auto Roster</h2>
              <p className="text-gray-600">Generate optimized rosters using constraint-based algorithms</p>
              <div className="mt-4 text-blue-600 font-bold">Generate Now →</div>
            </div>
          </Link>
        </div>

        <div className="mt-12 text-center">
          <div className="inline-block bg-white rounded-lg p-6 shadow-md">
            <h3 className="font-semibold mb-2 text-gray-900">Key Features</h3>
            <div className="flex flex-wrap gap-2 justify-center">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">Skill Matching</span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">Cost Optimization</span>
              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">Compliance Tracking</span>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">Budget Control</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
