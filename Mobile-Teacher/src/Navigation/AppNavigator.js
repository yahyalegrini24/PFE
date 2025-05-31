import React, { useContext, useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { ActivityIndicator, View } from "react-native";
import { supabase } from "../configuration/supabase";
import AuthScreen from "../screens/auth/Auth";
import HomeNavigator from "./HomeNavigation/HomeNavigator";
import Profile from "../screens/Profile/Profile";
import ScheduleNavigator from "./ScheduleNavigation/ScheduleNavigator";
import { UserContext } from "../context/UserContext";

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { user, setUser } = useContext(UserContext);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const checkSessionAndFetchUser = async () => {
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
        setInitializing(false);
      }
    };

    checkSessionAndFetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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
      } else {
        setUser(null);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#006633" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Home" component={HomeNavigator} />
            <Stack.Screen name="Profile" component={Profile} />
            <Stack.Screen name="Upload" component={ScheduleNavigator} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;