import React from 'react';

import AppNavigator from './src/Navigation/AppNavigator';
import { UserProvider } from "./src/context/UserContext";

export default function App() {
  return (
    <UserProvider>
      <AppNavigator/>
      </UserProvider>
  );
}

