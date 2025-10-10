import AgencyDashboard from './components/AgencyDashboard'
import AuthWrapper from './components/AuthWrapper'

export default function Home() {
  return (
    <AuthWrapper>
      <AgencyDashboard />
    </AuthWrapper>
  )
}
