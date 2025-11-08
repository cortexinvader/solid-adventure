// src/utils/theme.ts

export const getTheme = (): 'light' | 'dark' => {
  const stored = localStorage.getItem('theme')
  return (stored === 'light' || stored === 'dark') ? stored : 'light'
}

export const setTheme = (theme: 'light' | 'dark') => {
  localStorage.setItem('theme', theme)
  document.documentElement.setAttribute('data-theme', theme)
}

export const toggleTheme = () => {
  const current = document.documentElement.getAttribute('data-theme')
  const newTheme = current === 'dark' ? 'light' : 'dark'
  setTheme(newTheme)
}

export const initTheme = () => {
  const savedTheme = localStorage.getItem('theme')
  const theme = savedTheme === 'dark' ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', theme)
  if (savedTheme) {
    localStorage.setItem('theme', theme) // ensure it's saved
  }
}
