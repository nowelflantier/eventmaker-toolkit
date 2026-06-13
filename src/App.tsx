import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AuthGate from './components/AuthGate'
import Layout from './components/Layout'
import ModuleCard from './components/ModuleCard'
import { modules } from './modules/modules.config'
import MeetingsImport from './modules/meetings-import'
import {
  getSessionUser,
  getLastModule,
  SessionUser,
  setLastModule,
} from './lib/storage'

function HomePage() {
  const lastModuleId = getLastModule()
  const activeModules = modules.filter((module) => module.status === 'active')
  const legacyModules = modules.filter((module) => module.status === 'legacy')

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <section className="grid grid-cols-1 gap-[14px] md:grid-cols-2 lg:grid-cols-3">
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

function ModuleVisitTracker() {
  const location = useLocation()

  useEffect(() => {
    const module = modules.find((item) => item.route === location.pathname)
    if (module) {
      setLastModule(module.id)
    }
  }, [location.pathname])

  return null
}

export default function App() {
  const [user, setUser] = useState<SessionUser | null>(() => getSessionUser())

  if (!user) {
    return <AuthGate onAuthenticated={setUser} />
  }

  return (
    <>
      <ModuleVisitTracker />
      <Layout user={user}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/meetings-import" element={<MeetingsImport />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </>
  )
}
