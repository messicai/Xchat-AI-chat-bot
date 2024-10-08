import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState(null);
  const [orgId, setOrgId] = useState(null);
  const [orgName, setOrgName] = useState(""); // Add orgName status

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedIsAdmin = localStorage.getItem("isAdmin") === "true";
    const storedUserId = localStorage.getItem("userId");
    const storedOrgId = localStorage.getItem("orgId");
    const storedOrgName = localStorage.getItem("orgName"); // Add orgName to get
    if (storedToken) {
      setToken(storedToken);
      setIsAdmin(storedIsAdmin);
      setUserId(storedUserId);
      setOrgId(storedOrgId);
      setOrgName(storedOrgName || ""); // Set orgName status
    }
  }, []);

  const login = (token, isAdmin, userId, orgId, orgName) => {
    setToken(token);
    setIsAdmin(isAdmin);
    setUserId(userId);
    setOrgId(orgId);
    setOrgName(orgName); // set orgName
    localStorage.setItem("token", token);
    localStorage.setItem("isAdmin", isAdmin);
    localStorage.setItem("userId", userId);
    localStorage.setItem("orgId", orgId);
    localStorage.setItem("orgName", orgName); // save orgName
  };

  const logout = () => {
    setToken(null);
    setIsAdmin(false);
    setUserId(null);
    setOrgId(null);
    setOrgName(""); // clear orgName
    localStorage.removeItem("token");
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("userId");
    localStorage.removeItem("orgId");
    localStorage.removeItem("orgName"); // remove orgName
  };

  return (
    <AuthContext.Provider
      value={{ token, isAdmin, userId, orgId, orgName, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};