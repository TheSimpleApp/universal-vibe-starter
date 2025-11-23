import { View, Text } from 'react-native';
import { Link } from 'expo-router';

export default function Index() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Universal Vibe Starter
      </Text>
      <Text style={{ color: '#666', marginBottom: 40 }}>
        React Native / Expo
      </Text>
      <Link href="/auth/login" style={{ color: '#007AFF' }}>
        Go to Login
      </Link>
    </View>
  );
}
