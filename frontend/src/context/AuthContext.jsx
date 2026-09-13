import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  apiDoctorLogin,
  apiDoctorSignup,
  apiPatientLogin,
  apiPatientSignup,
  apiGetMe,
  apiUpdateWallet
} from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('pv_token') || null);
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('pv_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  // Sync token & user state to localStorage
  const saveSession = (authToken, userData) => {
    setToken(authToken);
    setUser(userData);
    if (authToken) {
      localStorage.setItem('pv_token', authToken);
    } else {
      localStorage.removeItem('pv_token');
    }
    if (userData) {
      localStorage.setItem('pv_user', JSON.stringify(userData));
    } else {
      localStorage.removeItem('pv_user');
    }
  };

  // Re-fetch current user profile to ensure verified status is up-to-date
  const refreshUser = async () => {
    const currentToken = localStorage.getItem('pv_token');
    if (!currentToken) {
      setIsLoading(false);
      return null;
    }
    try {
      const updatedUser = await apiGetMe();
      setUser(updatedUser);
      localStorage.setItem('pv_user', JSON.stringify(updatedUser));
      return updatedUser;
    } catch (err) {
      console.warn('Session check failed or expired:', err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const loginDoctor = async ({ email, password }) => {
    const data = await apiDoctorLogin({ email, password });
    saveSession(data.access_token, data.user);
    return data;
  };

  const signupDoctor = async ({ email, password, full_name, wallet_address, medical_license, hospital_affiliation }) => {
    const data = await apiDoctorSignup({
      email,
      password,
      full_name,
      wallet_address,
      medical_license,
      hospital_affiliation
    });
    saveSession(data.access_token, data.user);
    return data;
  };

  const loginPatient = async ({ email, password }) => {
    const data = await apiPatientLogin({ email, password });
    saveSession(data.access_token, data.user);
    return data;
  };

  const signupPatient = async ({ email, password, full_name, wallet_address, patient_id }) => {
    const data = await apiPatientSignup({
      email,
      password,
      full_name,
      wallet_address,
      patient_id
    });
    saveSession(data.access_token, data.user);
    return data;
  };

  const logout = () => {
    saveSession(null, null);
  };

  const updateWallet = async (walletAddress) => {
    const updated = await apiUpdateWallet(walletAddress);
    setUser(updated);
    localStorage.setItem('pv_user', JSON.stringify(updated));
    return updated;
  };

  const value = {
    token,
    user,
    role: user?.role || null,
    patient_id: user?.patient_id || null,
    wallet_address: user?.wallet_address || null,
    is_verified: !!user?.is_verified,
    isAuthenticated: !!token && !!user,
    isLoading,
    loginDoctor,
    signupDoctor,
    loginPatient,
    signupPatient,
    logout,
    refreshUser,
    updateWallet
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export default AuthContext;
