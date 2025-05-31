import React, { createContext, useState, useEffect } from "react";
import { supabase } from "../configuration/supabase";
import { View, ActivityIndicator } from "react-native";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: teacherData, error } = await supabase
            .from('Teacher')
            .select('*')
            .eq('teacherId', session.user.id)
            .single();
            
          if (!error && teacherData) {
            setUser({
              ...teacherData,
              email: session.user.email
            });
          }
        }
      } catch (error) {
        console.error("Initialization error:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeUser();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#006633" />
      </View>
    );
  }
  
  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};