import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const AccessibilityToggle = ({ isEnabled, onToggle }) => {
    return (
        <TouchableOpacity
            style={[styles.container, isEnabled ? styles.active : styles.inactive]}
            onPress={onToggle}
            activeOpacity={0.8}
        >
            <View style={styles.iconContainer}>
                <Ionicons
                    name={isEnabled ? "eye" : "eye-off-outline"}
                    size={20}
                    color={isEnabled ? "#FFFFFF" : "#A0A0A0"}
                />
            </View>
            <Text style={[styles.text, isEnabled ? styles.textActive : styles.textInactive]}>
                {isEnabled ? "Dyslexia Mode: ON" : "Dyslexia Mode: OFF"}
            </Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        marginHorizontal: 10,
    },
    active: {
        backgroundColor: '#4B0082', // Indigo/Purple
        borderColor: '#9370DB',
    },
    inactive: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderColor: '#555',
    },
    iconContainer: {
        marginRight: 8,
    },
    text: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    textActive: {
        color: '#FFD700', // Gold for high contrast
    },
    textInactive: {
        color: '#A0A0A0',
    }
});

export default AccessibilityToggle;
