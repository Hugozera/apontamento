import React, { createContext, useState, useEffect, useCallback } from 'react';
import { loginService, logoutService } from '../services/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loginLoading, setLoginLoading] = useState(false);
    const [error, setError] = useState(null);

    // Carregar usuário do localStorage de forma segura
    const loadUser = useCallback(() => {
        try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const parsedUser = JSON.parse(storedUser);
                if (parsedUser?.nome) {
                    setUser(parsedUser);
                    return true;
                }
                localStorage.removeItem('user');
            }
            return false;
        } catch (error) {
            console.error('Erro ao carregar usuário:', error);
            localStorage.removeItem('user');
            return false;
        }
    }, []);

    useEffect(() => {
        const userLoaded = loadUser();
        setLoading(false);

        return () => {
            // Cleanup se necessário
        };
    }, [loadUser]);

    const login = async (email, password) => {
        setLoginLoading(true);
        setError(null);
        try {
            const response = await loginService(email, password);
            if (response.success) {
                setUser(response.userData);
                localStorage.setItem('user', JSON.stringify(response.userData));
            } else {
                setError(response.message);
            }
            return response;
        } catch (error) {
            setError(error.message);
            return { success: false, message: error.message };
        } finally {
            setLoginLoading(false);
        }
    };

    const logout = async () => {
        try {
            await logoutService();
            setUser(null);
            localStorage.removeItem('user');
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            loginLoading,
            error,
            login,
            logout,
            isAuthenticated: !!user
        }}>
            {children}
        </AuthContext.Provider>
    );
};