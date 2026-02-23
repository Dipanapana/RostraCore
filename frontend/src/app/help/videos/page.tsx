'use client'

import { useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { Play, Clock, X } from 'lucide-react'

interface VideoItem {
  id: string
  title: string
  description: string
  duration: string
  thumbnail: string
}

const VIDEOS: VideoItem[] = [
  {
    id: 'GettingStarted',
    title: 'Getting Started',
    description: 'Set up your account, explore the dashboard, and learn to navigate the platform.',
    duration: '0:21',
    thumbnail: '/videos/GettingStarted.mp4',
  },
  {
    id: 'EmployeeManagement',
    title: 'Employee Management',
    description: 'Add security officers, manage PSIRA details, certifications, and employment records.',
    duration: '0:18',
    thumbnail: '/videos/EmployeeManagement.mp4',
  },
  {
    id: 'ShiftScheduling',
    title: 'Shift Scheduling & Roster',
    description: 'Auto-generate compliant rosters with BCEA and PSIRA constraint checking.',
    duration: '0:16',
    thumbnail: '/videos/ShiftScheduling.mp4',
  },
  {
    id: 'AttendanceCheckin',
    title: 'Attendance & Check-In',
    description: 'GPS-verified check-in from the mobile app with photo capture.',
    duration: '0:19',
    thumbnail: '/videos/AttendanceCheckin.mp4',
  },
  {
    id: 'PayrollProcessing',
    title: 'Payroll Processing',
    description: 'Generate payroll with automatic SA tax, UIF, and PSIRA levy calculations.',
    duration: '0:16',
    thumbnail: '/videos/PayrollProcessing.mp4',
  },
  {
    id: 'ClientSiteManagement',
    title: 'Client & Site Management',
    description: 'Manage clients, configure sites, set staffing requirements and geofences.',
    duration: '0:16',
    thumbnail: '/videos/ClientSiteManagement.mp4',
  },
  {
    id: 'IncidentReporting',
    title: 'Incident Reporting',
    description: 'Report, investigate, and analyse security incidents with full audit trails.',
    duration: '0:19',
    thumbnail: '/videos/IncidentReporting.mp4',
  },
]

export default function VideosPage() {
  const [playing, setPlaying] = useState<string | null>(null)

  const activeVideo = VIDEOS.find((v) => v.id === playing)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        backHref="/help"
        backLabel="Back to Help Center"
        title="Video Tutorials"
        subtitle="Watch step-by-step guides for key RostraCore features"
        icon={<Play className="text-blue-600" size={28} />}
      />

      {/* Video player modal */}
      {playing && activeVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-5xl mx-4">
            <button
              onClick={() => setPlaying(null)}
              className="absolute -top-12 right-0 flex items-center gap-1 text-white/80 hover:text-white text-sm"
            >
              <X size={16} /> Close
            </button>
            <div className="bg-black rounded-xl overflow-hidden shadow-2xl">
              <video
                src={activeVideo.thumbnail}
                controls
                autoPlay
                className="w-full aspect-video"
              />
              <div className="p-4 bg-gray-900">
                <div className="text-white font-semibold">{activeVideo.title}</div>
                <div className="text-gray-400 text-sm mt-1">{activeVideo.description}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {VIDEOS.map((video) => (
          <button
            key={video.id}
            onClick={() => setPlaying(video.id)}
            className="text-left bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group overflow-hidden"
          >
            {/* Thumbnail area */}
            <div className="relative aspect-video bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-blue-600/90 flex items-center justify-center group-hover:bg-blue-700 group-hover:scale-110 transition-all shadow-lg">
                <Play className="text-white ml-1" size={28} fill="white" />
              </div>
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
                <Clock size={10} /> {video.duration}
              </div>
            </div>

            {/* Info */}
            <div className="p-4">
              <div className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                {video.title}
              </div>
              <div className="text-sm text-gray-500 mt-1">{video.description}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Note */}
      <div className="text-center text-xs text-gray-400">
        Videos are generated programmatically using Remotion. Run <code className="bg-gray-100 px-1 rounded">npm run studio</code> in the <code className="bg-gray-100 px-1 rounded">videos/</code> directory to preview and render.
      </div>
    </div>
  )
}
