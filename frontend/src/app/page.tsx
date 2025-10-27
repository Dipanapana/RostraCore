export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-4">RostraCore v1</h1>
        <p className="text-xl mb-8">Algorithmic Roster & Budget Engine</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          <div className="p-6 border rounded-lg hover:bg-gray-50">
            <h2 className="text-2xl font-semibold mb-2">Employees</h2>
            <p className="text-gray-600">Manage security guards and staff</p>
          </div>

          <div className="p-6 border rounded-lg hover:bg-gray-50">
            <h2 className="text-2xl font-semibold mb-2">Sites</h2>
            <p className="text-gray-600">Manage client locations</p>
          </div>

          <div className="p-6 border rounded-lg hover:bg-gray-50">
            <h2 className="text-2xl font-semibold mb-2">Roster</h2>
            <p className="text-gray-600">Generate optimized rosters</p>
          </div>

          <div className="p-6 border rounded-lg hover:bg-gray-50">
            <h2 className="text-2xl font-semibold mb-2">Reports</h2>
            <p className="text-gray-600">Budget and payroll summaries</p>
          </div>
        </div>
      </div>
    </main>
  )
}
