import { useEffect } from 'react'
import { Route, Switch, Redirect } from 'wouter'
import { useAuth } from '@/hooks/useAuth'
import { initTheme } from '@/lib/theme'
import { socketService } from '@/lib/socket'
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import Dashboard from '@/pages/Dashboard'
import Chat from '@/pages/Chat'
import Documents from '@/pages/Documents'
import Profile from '@/pages/Profile'
import AdminPanel from '@/pages/AdminPanel'
import Watermark from '@/components/Watermark'

function App() {
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    initTheme()
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      socketService.connect()
    }
    return () => {
      if (isAuthenticated) {
        socketService.disconnect()
      }
    }
  }, [isAuthenticated])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg">
        <div className="text-text">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <>
        <Switch>
          <Route path="/signup" component={Signup} />
          <Route path="/login" component={Login} />
          <Route path="/">
            <Redirect to="/login" />
          </Route>
        </Switch>
        <Watermark />
      </>
    )
  }

  return (
    <>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/chat" component={Chat} />
        <Route path="/documents" component={Documents} />
        <Route path="/profile/:username" component={Profile} />
        <Route path="/admin" component={AdminPanel} />
        <Route>
          <Redirect to="/" />
        </Route>
      </Switch>
      <Watermark />
    </>
  )
}

export default App
