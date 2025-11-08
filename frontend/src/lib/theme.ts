export const getTheme = (): 'light' | 'dark' => {
  const stored = localStorage.getItem('theme')
  return (stored as 'light' | 'dark') || 'light'
}

export const setTheme = (theme: 'light' | 'dark') => {
  localStorage.setItem('theme', theme)
  document.documentElement.setAttribute('data-theme', theme)
}

export const toggleTheme = () => {
  const current = getTheme()
  const next = current === 'light' ? 'dark' : 'light'
  setTheme(next)
  return next
}

export const initTheme = () => {
  const theme = getTheme()
  setTheme(theme)
}
export const initTheme = () => {
  const savedTheme = localStorage.getItem('theme') || 'light'
  document.documentElement.setAttribute('data-theme', savedTheme)
}

export const toggleTheme = () => {
  const current = document.documentElement.getAttribute('data-theme')
  const newTheme = current === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', newTheme)
  localStorage.setItem('theme', newTheme)
}
export const initTheme = () => {
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme)
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const theme = prefersDark ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }
}

export const toggleTheme = () => {
  const current = document.documentElement.getAttribute('data-theme')
  const newTheme = current === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', newTheme)
  localStorage.setItem('theme', newTheme)
}
