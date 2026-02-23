import CreateHeader from '@/components/headers/CreateHeader';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';

const PostLayout = () => {
  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack>
        <Stack.Screen name="create" options={{ headerShown: true, header: () => <CreateHeader /> }} />
      </Stack>
      <StatusBar style={'light'} />
    </ThemeProvider>
  )
}

export default PostLayout