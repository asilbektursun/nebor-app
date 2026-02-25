import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { useThemeColors } from '@/hooks/use-theme-colors'
import { useTranslations } from '@/hooks/use-translation'
import { useAuthStore } from '@/modules/Auth/auth-store'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

const AuthPage = () => {
  const router = useRouter()
  const colors = useThemeColors()
  const { t } = useTranslations()

  const { register, login } = useAuthStore()

  const [phoneNumber, setPhoneNumber] = useState('+998')
  const [isLoading, setIsLoading] = useState(false)
  const phoneInputRef = useRef<TextInput>(null)

  // Focus phone input on mount
  useEffect(() => {
    setTimeout(() => phoneInputRef.current?.focus(), 100)
  }, [])

  const formatPhone = (raw: string): string => {
    let digits = raw.replace(/\D/g, '')
    if (!digits.startsWith('998')) {
      digits = '998' + digits
    }
    const local = digits.slice(3)
    if (local.length === 0) return '+998'
    if (local.length <= 2) return `+998 ${local}`
    if (local.length <= 5) return `+998 ${local.slice(0, 2)} ${local.slice(2)}`
    if (local.length <= 7)
      return `+998 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`
    return `+998 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5, 7)} ${local.slice(7, 9)}`
  }

  const handlePhoneChange = (text: string) => {
    let digits = text.replace(/\D/g, '')
    if (!digits.startsWith('998')) {
      digits = '998'
    }
    if (digits.length <= 12) {
      setPhoneNumber('+' + digits)
    }
  }

  const handleDone = useCallback(async () => {
    const isComplete = phoneNumber.replace(/\D/g, '').length === 12
    if (!isComplete || isLoading) return

    setIsLoading(true)
    try {
      const fullPhone = `+${phoneNumber.replace(/\D/g, '')}`
      await register(fullPhone)
      router.replace('/(tabs)/home')
    } catch (error: any) {
      const message = error?.response?.data?.errors?.[0] ||
        error?.message ||
        t('auth.verification.error_generic')

      if (
        message.toLowerCase().includes('already') ||
        message.toLowerCase().includes('exists')
      ) {
        try {
          const fullPhoneLogin = `+${phoneNumber.replace(/\D/g, '')}`
          await login(fullPhoneLogin)
          router.replace('/(tabs)/home')
          return
        } catch (loginError) {
          console.error('Auto-login failed:', loginError)
        }
      }

      Alert.alert(t('auth.verification.error_title'), message)
    } finally {
      setIsLoading(false)
    }
  }, [phoneNumber, isLoading, register, router, t])

  const isDoneEnabled = phoneNumber.replace(/\D/g, '').length === 12 && !isLoading

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Top Section */}
        <View style={styles.topSection}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <ThemedText type="title" style={styles.title}>
            {t('auth.verification.title')}
          </ThemedText>

          {/* Phone Input */}
          <View style={[styles.inputContainer, { borderColor: colors.borderColor }]}>
            <TextInput
              ref={phoneInputRef}
              style={[styles.phoneNumber, { color: colors.text }]}
              value={formatPhone(phoneNumber)}
              onChangeText={handlePhoneChange}
              placeholder={t('auth.verification.phone_placeholder')}
              placeholderTextColor={colors.subText}
              keyboardType="phone-pad"
              maxLength={17}
            />
          </View>

          {/* OTP Section Disabled Temporarily */}
          {/* 
          <View style={[styles.inputContainer, { borderColor: colors.borderColor }]}>
            <TextInput
              // ... code input logic ...
            />
             ... timer ... 
          </View>
           ... resend button ... 
          */}
        </View>

        {/* Done Button */}
        <View style={styles.doneButtonWrapper}>
          <TouchableOpacity
            style={[
              styles.doneButton,
              {
                backgroundColor: isDoneEnabled
                  ? colors.primaryColor
                  : colors.borderColor,
              },
            ]}
            onPress={handleDone}
            disabled={!isDoneEnabled}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                style={[
                  styles.doneButtonText,
                  { color: isDoneEnabled ? '#fff' : colors.subText },
                ]}
              >
                {t('auth.verification.done')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ThemedView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topSection: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 36,
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
  },
  phonePrefix: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
  },
  phoneNumber: {
    fontSize: 16,
    flex: 1,
    padding: 0, // Reset default padding
  },
  // OTP Styles (unused temporarily)
  codeText: {
    fontSize: 16,
    flex: 1,
    padding: 0, 
  },
  timerText: {
    fontSize: 16,
    fontWeight: '500',
  },
  resendButton: {
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginTop: 8,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '500',
  },
  doneButtonWrapper: {
    paddingHorizontal: 24,
    marginBottom: 40, // Increased to keep it above keyboard if possible or just at bottom
  },
  doneButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
})

export default AuthPage