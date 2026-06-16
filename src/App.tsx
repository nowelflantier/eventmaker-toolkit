import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AuthGate from './components/AuthGate'
import Layout from './components/Layout'
import ModuleCard from './components/ModuleCard'
import { modules } from './modules/modules.config'
import CampaignCreator from './modules/campaign-creator'
import MeetingsImport from './modules/meetings-import'
import {
  getSessionUser,
  SessionUser,
} from './lib/storage'

function HomePage({ lastModuleId }: { lastModuleId: string | null }) {
  const activeModules = modules.filter((module) => module.status === 'active')
  const legacyModules = modules.filter((module) => module.status === 'legacy')
  const activeGridClass = getModuleGridClass(activeModules.length)

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <section className={`grid grid-cols-1 gap-[14px] ${activeGridClass}`}>
        {activeModules.map((module) => (
          <ModuleCard
            key={module.id}
            module={module}
            isLast={module.id === lastModuleId}
            variant="active"
          />
        ))}
      </section>

      {legacyModules.length > 0 && (
        <section className="mt-12 opacity-55">
          <div className="mb-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#E8E4DE]" />
            <span className="font-mono text-[10px] uppercase tracking-normal text-[#B0ADA8]">
              legacy
            </span>
            <div className="h-px flex-1 bg-[#E8E4DE]" />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {legacyModules.map((module) => (
              <ModuleCard key={module.id} module={module} isLast={false} variant="legacy" />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

function getModuleGridClass(count: number): string {
  if (count <= 1) return ''
  if (count === 3) return 'md:grid-cols-3'
  return 'md:grid-cols-2'
}

export default function App() {
  const [user, setUser] = useState<SessionUser | null>(() => getSessionUser())
  const [lastModuleId, setLastModuleId] = useState<string | null>(null)

  if (!user) {
    return <AuthGate onAuthenticated={setUser} />
  }

  return (
    <>
      <Layout user={user}>
        <Routes>
          <Route path="/" element={<HomePage lastModuleId={lastModuleId} />} />
          <Route
            path="/meetings-import"
            element={<MeetingsImport onImportComplete={() => setLastModuleId('meetings-import')} />}
          />
          <Route
            path="/campaign-creator"
            element={<CampaignCreator onComplete={() => setLastModuleId('campaign-creator')} />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </>
  )
}
