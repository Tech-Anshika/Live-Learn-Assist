import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Image, Text } from 'react-native';
import { useState, useEffect } from 'react';
import HomeScreen from './src/screens/HomeScreen';

export default function App() {
    const [isShowSplash, setIsShowSplash] = useState(true);

    useEffect(() => {
        setTimeout(() => {
            setIsShowSplash(false);
        }, 3000); // Show splash for 3 seconds
    }, []);

    if (isShowSplash) {
        return (
            <View style={styles.splashContainer}>
                <Image
                    source={require('./assets/logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text style={styles.appName}>Live-Learn Assist</Text>
                <StatusBar style="light" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <HomeScreen />
            <StatusBar style="auto" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    splashContainer: {
        flex: 1,
        backgroundColor: '#4B0082', // Purple background
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: {
        width: 250,
        height: 250,
        marginBottom: 20,
    },
    appName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFD700', // Gold color
        marginTop: 10,
        letterSpacing: 2,
    },
});
