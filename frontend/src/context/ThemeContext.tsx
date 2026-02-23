'use client'

import React, { createContext, useContext } from 'react'

type Theme = 'light'

interface ThemeContextType {
    theme: Theme
    toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
    theme: 'light',
    toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    return (
        <ThemeContext.Provider value={{ theme: 'light', toggleTheme: () => {} }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    return useContext(ThemeContext)
}
