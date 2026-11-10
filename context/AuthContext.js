'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/auth/me')
      setUser(data.user ?? null)
    } catch (error) {
      console.error('Unable to load Ward 3D session', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshUser()
  }, [])

  const signIn = async (payload) => {
    const { data } = await axios.post('/api/auth/login', payload)
    if (data.user) setUser(data.user)
    return data
  }

  const signOut = async () => {
    await axios.post('/api/auth/logout')
    setUser(null)
  }

  const getToken = async () => {
    // Browser cookies are sent automatically for same-origin API calls.
    // This stub is kept for backward compatibility with existing code paths.
    return null
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, refreshUser, getToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
