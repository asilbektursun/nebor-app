import { queryClient } from '@/api/queryClient'
import { useAuthStore } from '@/modules/Auth/auth-store'
import { Colors } from '@/theme/colors'
import { ThemeProvider } from '@/theme/theme-provider'
import { QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import React from 'react'
import { ActivityIndicator, View } from 'react-native'
import 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function RootLayout() {

	const isHydrated = useAuthStore((s) => s.isHydrated)
	const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

	// Wait for Zustand to rehydrate from AsyncStorage
	if (!isHydrated) {
		return (
			<ThemeProvider>
				<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
					<ActivityIndicator size="large" />
				</View>
			</ThemeProvider>
		)
	}

	return (
		<QueryClientProvider client={queryClient}>
			<View style={{ flex: 1, backgroundColor: Colors.light.background }}>
				<SafeAreaView style={{ flex: 1 }}>
					<ThemeProvider>
						<Stack screenOptions={{ headerShown: false }}>
							{isAuthenticated ? (
								<>
									<Stack.Screen name='(tabs)' />
									<Stack.Screen name='(post)' />
									<Stack.Screen name='(settings)' />
									<Stack.Screen name='search' />
									<Stack.Screen name='categories' />
									<Stack.Screen name='product/[id]' />
									<Stack.Screen name='chat/[id]' />
									<Stack.Screen name='(auth)' />
								</>
							) : (
								<>
									<Stack.Screen name='(auth)' />
								</>
							)}
							<Stack.Screen name='index' />
						</Stack>
						<StatusBar style={'light'} />
						{/* <View
						style={{
							position: 'absolute',
							padding: 5,
							bottom: '50%',
							right: 0,
							transform: [{ translateX: 0 }, { translateY: '-50%' }],
						}}
					>
						<Sun onPress={toggleMode} size={24} color={colorScheme === 'dark' ? 'white' : 'black'} />
					</View> */}
					</ThemeProvider>
				</SafeAreaView>
			</View>
		</QueryClientProvider>
	)
}
