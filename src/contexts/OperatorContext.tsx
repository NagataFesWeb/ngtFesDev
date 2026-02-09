'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type OperatorContextType = {
    operatorToken: string | null
    login: (token: string, className: string, projectId: string) => void
    logout: () => void
    className: string | null
    projectId: string | null
    loading: boolean
}

const OperatorContext = createContext<OperatorContextType>({
    operatorToken: null,
    login: () => { },
    logout: () => { },
    className: null,
    projectId: null,
    loading: true,
})

export const useOperator = () => useContext(OperatorContext)

export const OperatorProvider = ({ children }: { children: React.ReactNode }) => {
    const [operatorToken, setOperatorTokenState] = useState<string | null>(null)
    const [className, setClassNameState] = useState<string | null>(null)
    const [projectId, setProjectIdState] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const storedToken = sessionStorage.getItem('operator_token')
        const storedClass = sessionStorage.getItem('operator_class_name')
        const storedProjectId = sessionStorage.getItem('operator_project_id')

        if (storedToken) {
            setOperatorTokenState(storedToken)
        }
        if (storedClass) {
            setClassNameState(storedClass)
        }
        if (storedProjectId) {
            setProjectIdState(storedProjectId)
        }
        setLoading(false)
    }, [])

    const login = (token: string, name: string, pid: string) => {
        sessionStorage.setItem('operator_token', token)
        sessionStorage.setItem('operator_class_name', name)
        sessionStorage.setItem('operator_project_id', pid)
        setOperatorTokenState(token)
        setClassNameState(name)
        setProjectIdState(pid)
    }

    const logout = () => {
        sessionStorage.removeItem('operator_token')
        sessionStorage.removeItem('operator_class_name')
        sessionStorage.removeItem('operator_project_id')
        setOperatorTokenState(null)
        setClassNameState(null)
        setProjectIdState(null)
    }

    return (
        <OperatorContext.Provider value={{ operatorToken, login, logout, className, projectId, loading }}>
            {children}
        </OperatorContext.Provider>
    )
}
