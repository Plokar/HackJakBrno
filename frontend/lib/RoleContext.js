import { createContext, useContext, useState } from 'react';
import { api } from './api';

const RoleContext = createContext();

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within RoleProvider');
  }
  return context;
};

export const RoleProvider = ({ children }) => {
  const [currentRole, setCurrentRole] = useState('doctor'); // Default role

  const changeRole = (role) => {
    setCurrentRole(role);
    api.setUserRole(role); // Nastavit roli v API klientu
    console.log('Role changed to:', role);
  };

  const isDoctor = currentRole === 'doctor';
  const isAdmin = currentRole === 'admin';
  const isNurse = currentRole === 'nurse';

  const value = {
    currentRole,
    changeRole,
    isDoctor,
    isAdmin,
    isNurse,
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
};
