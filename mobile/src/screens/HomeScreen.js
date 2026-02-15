import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState, useRef, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Dimensions,
    Modal,
    TextInput,
    SafeAreaView,
    StatusBar,
    ScrollView,
    ActivityIndicator,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import BoundingBox from '../components/BoundingBox';
// No longer needed as we moved toggles to bottom panel, but kept for reference if needed
// import AccessibilityToggle from '../components/AccessibilityToggle'; 

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function HomeScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [facing, setFacing] = useState('back');
    // Using the latest active tunnel URL
    const [serverUrl, setServerUrl] = useState('https://three-lands-guess.loca.lt');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [boundingBoxes, setBoundingBoxes] = useState([]);
    const [detectedTexts, setDetectedTexts] = useState([]);
    const [selectedImage, setSelectedImage] = useState(null);

    // Accessibility States
    const [dyslexiaMode, setDyslexiaMode] = useState(false);
    const [isSimplified, setIsSimplified] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

    const cameraRef = useRef(null);

    // --- Media Handling ---

    const pickImage = async () => {
        // Request Permission
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to make this work!');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, // Allow cropping
            quality: 1,
            base64: true, // Need base64 for API
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            setSelectedImage(asset.uri);
            // Process the picked image immediately
            await processImage(asset.base64, asset.width, asset.height);
        }
    };

    const takePictureAndDetect = async () => {
        if (cameraRef.current && !isProcessing) {
            setIsProcessing(true);
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.5,
                    base64: true,
                    skipProcessing: true,
                });
                await processImage(photo.base64, photo.width, photo.height);
            } catch (error) {
                console.error("Camera Error:", error);
                Alert.alert("Camera Error", error.message);
                setIsProcessing(false);
            }
        }
    };

    const processImage = async (base64, width, height) => {
        setIsProcessing(true);
        try {
            console.log(`Sending image to ${serverUrl}/detect...`);
            const response = await fetch(`${serverUrl}/detect`, {
                method: 'POST',
                headers: { 'Content-Type': 'multipart/form-data' }, // Actually handled by FormData usually but here we send raw or form
                // Wait, the previous code used FormData with 'file'. Let's stick to that pattern.
            });

            // Re-implementing FormData logic correctly
            const formData = new FormData();
            formData.append('file', {
                uri: `data:image/jpeg;base64,${base64}`, // Or just use the uri directly if available, but base64 is safer for consistency?
                // Actually the API expects a file. 
                // Best practice in React Native:
                name: 'photo.jpg',
                type: 'image/jpeg',
                // For base64, we might need to convert or just send as string if API supports it, 
                // but standard 'fetch' with FormData expects a URI.
                // Let's use the URI if we have it, specifically for Camera/Picker.
            });

            // Wait, for camera capture we have base64. For picker we have URI and base64.
            // Let's construct the body properly.
            const bodyFormData = new FormData();
            bodyFormData.append('file', {
                uri: `data:image/jpeg;base64,${base64}`,
                name: 'photo.jpg',
                type: 'image/jpeg'
            });

            const res = await fetch(`${serverUrl}/detect`, {
                method: 'POST',
                body: bodyFormData,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (!res.ok) throw new Error(`Request failed with status code ${res.status}`);

            const data = await res.json();
            const detections = data.detections || [];

            // Scaling logic
            const scaleX = SCREEN_WIDTH / width;
            const scaleY = (SCREEN_HEIGHT * 0.50) / height;

            const scaledBoxes = detections.map(det => ({
                ...det,
                box: [
                    det.box[0] * scaleX,
                    det.box[1] * scaleY,
                    det.box[2] * scaleX,
                    det.box[3] * scaleY
                ]
            }));

            setBoundingBoxes(scaledBoxes);

            // extract text
            const newTexts = detections
                .map(d => d.text)
                .filter(t => t && t.trim().length > 0);

            setDetectedTexts(newTexts); // Replace old text or append? Replace is better for "Shot" mode.

        } catch (error) {
            console.error("Detection API Error:", error);
            Alert.alert("Network Error", "Could not reach server. Check URL.");
        } finally {
            setIsProcessing(false);
        }
    };

    // --- Text Utilities ---

    const handleSpeak = (text) => {
        if (isSpeaking) {
            Speech.stop();
            setIsSpeaking(false);
        } else {
            Speech.speak(text, {
                onDone: () => setIsSpeaking(false),
                onStopped: () => setIsSpeaking(false),
                rate: dyslexiaMode ? 0.8 : 1.0, // Slower for dyslexia mode
            });
            setIsSpeaking(true);
        }
    };

    const renderSimplifiedText = (text) => {
        // Simple logic: split sentences by period and list them.
        const sentences = text.split(/(?<=[.?!])\s+/);
        return sentences.map((sent, idx) => (
            <Text key={idx} style={[
                styles.simplifiedLine,
                dyslexiaMode && styles.dyslexiaText
            ]}>
                • {sent}
            </Text>
        ));
    };

    const renderHighlightedText = (text) => {
        const words = text.split(/\s+/);
        return (
            <Text style={[styles.textResult, dyslexiaMode && styles.dyslexiaText]}>
                {words.map((word, index) => {
                    const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '');
                    const isComplex = cleanWord.length > 10;

                    if (isComplex) {
                        return (
                            <Text
                                key={index}
                                style={styles.highlightedWord}
                                onPress={() => Alert.alert("Word Help", `"${cleanWord}" is a long word. Try breaking it down!`)}
                            >
                                {word}{' '}
                            </Text>
                        );
                    }
                    return <Text key={index}>{word} </Text>;
                })}
            </Text>
        );
    };

    // --- Render ---

    if (!permission) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#4B0082" /></View>;
    if (!permission.granted) {
        return (
            <View style={styles.permissionContainer}>
                <Text style={styles.permissionText}>We need your permission to show the camera</Text>
                <TouchableOpacity onPress={requestPermission} style={styles.permissionButton}>
                    <Text style={styles.permissionButtonText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#4B0082" />

            {/* Top Bar */}
            <SafeAreaView style={styles.header}>
                <Text style={styles.headerTitle}>Live-Learn Assist</Text>
                <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.settingsButton}>
                    <Ionicons name="settings-outline" size={24} color="white" />
                </TouchableOpacity>
            </SafeAreaView>

            {/* Camera Section */}
            <View style={styles.cameraContainer}>
                <CameraView style={styles.camera} facing={facing} ref={cameraRef} />

                {/* Overlays */}
                <View style={styles.cameraOverlay} pointerEvents="box-none">
                    {/* Live Badge */}
                    <View style={styles.liveBadge}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>LIVE ACCESSIBILITY MODE</Text>
                    </View>

                    {/* Bounding Boxes */}
                    {boundingBoxes.map((det, index) => (
                        <BoundingBox key={index} box={det.box} text={det.text} confidence={det.confidence} />
                    ))}
                </View>
            </View>

            {/* Controls & Output Section */}
            <View style={[styles.outputContainer, dyslexiaMode && styles.dyslexiaContainer]}>

                {/* Control Panel */}
                <View style={styles.controlPanel}>
                    {/* Gallery */}
                    <TouchableOpacity style={styles.controlBtn} onPress={pickImage} disabled={isProcessing}>
                        <Ionicons name="images-outline" size={24} color="black" />
                        <Text style={styles.btnLabel}>Gallery</Text>
                    </TouchableOpacity>

                    {/* Capture (Main) */}
                    <TouchableOpacity style={[styles.captureBtn, isProcessing && styles.btnDisabled]} onPress={takePictureAndDetect} disabled={isProcessing}>
                        {isProcessing ? <ActivityIndicator color="white" /> : <Ionicons name="camera" size={32} color="white" />}
                    </TouchableOpacity>

                    {/* Simplify */}
                    <TouchableOpacity
                        style={[styles.controlBtn, isSimplified && styles.activeBtn]}
                        onPress={() => setIsSimplified(!isSimplified)}
                    >
                        <Ionicons name="sparkles-outline" size={24} color={isSimplified ? "#4B0082" : "black"} />
                        <Text style={[styles.btnLabel, isSimplified && styles.activeLabel]}>Simplify</Text>
                    </TouchableOpacity>

                    {/* Dyslexia Toggle */}
                    <TouchableOpacity
                        style={[styles.controlBtn, dyslexiaMode && styles.activeBtn]}
                        onPress={() => setDyslexiaMode(!dyslexiaMode)}
                    >
                        <Ionicons name="eye-outline" size={24} color={dyslexiaMode ? "#4B0082" : "black"} />
                        <Text style={[styles.btnLabel, dyslexiaMode && styles.activeLabel]}>Dyslexia</Text>
                    </TouchableOpacity>

                    {/* Clear */}
                    <TouchableOpacity style={styles.controlBtn} onPress={() => { setDetectedTexts([]); setBoundingBoxes([]); }}>
                        <Ionicons name="trash-outline" size={24} color="red" />
                        <Text style={styles.btnLabel}>Clear</Text>
                    </TouchableOpacity>
                </View>

                {/* Text Output Area */}
                <Text style={[styles.outputTitle, dyslexiaMode && styles.dyslexiaTitle]}>
                    Captured Text
                </Text>

                <ScrollView style={styles.outputScroll} contentContainerStyle={{ paddingBottom: 20 }}>
                    {detectedTexts.length === 0 ? (
                        <Text style={[styles.placeholder, dyslexiaMode && styles.dyslexiaText]}>
                            {isProcessing ? "Analyzing image..." : "Press Camera to scan or pick an image."}
                        </Text>
                    ) : (
                        detectedTexts.map((txt, idx) => (
                            <View key={idx} style={styles.textBlock}>
                                {/* Read Aloud Button per block */}
                                <TouchableOpacity style={styles.speakBtn} onPress={() => handleSpeak(txt)}>
                                    <Ionicons name={isSpeaking ? "stop-circle" : "volume-high"} size={24} color="#4B0082" />
                                </TouchableOpacity>

                                {isSimplified ? (
                                    <View style={styles.simplifiedBox}>
                                        <Text style={styles.simplifiedLabel}>✨ Simplified View:</Text>
                                        {renderSimplifiedText(txt)}
                                    </View>
                                ) : (
                                    renderHighlightedText(txt)
                                )}
                            </View>
                        ))
                    )}
                </ScrollView>
            </View>

            {/* Settings Modal (Simplified for URL editing) */}
            <Modal visible={showSettings} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Network Settings</Text>
                        <TextInput
                            style={styles.input}
                            value={serverUrl}
                            onChangeText={setServerUrl}
                            placeholder="Server URL"
                        />
                        <TouchableOpacity style={styles.closeButton} onPress={() => setShowSettings(false)}>
                            <Text style={styles.closeButtonText}>Save & Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { height: 60, backgroundColor: '#4B0082', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15 },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },

    cameraContainer: { height: '50%', width: '100%', overflow: 'hidden' },
    camera: { flex: 1 },
    cameraOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', padding: 10 },

    liveBadge: {
        position: 'absolute', top: 10, left: 10,
        backgroundColor: 'rgba(75, 0, 130, 0.8)', paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 20, flexDirection: 'row', alignItems: 'center'
    },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'red', marginRight: 5 },
    liveText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

    outputContainer: {
        flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, marginTop: -20, paddingTop: 15, paddingHorizontal: 20
    },
    dyslexiaContainer: { backgroundColor: '#FFFDD0' }, // Cream background

    controlPanel: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 15 },
    controlBtn: { alignItems: 'center' },
    btnLabel: { fontSize: 10, marginTop: 2, color: '#333' },
    activeLabel: { color: '#4B0082', fontWeight: 'bold' },
    activeBtn: { backgroundColor: '#E6E6FA', borderRadius: 10, padding: 5 }, // Light purple bg for active

    captureBtn: {
        width: 60, height: 60, borderRadius: 30, backgroundColor: '#4B0082',
        justifyContent: 'center', alignItems: 'center', elevation: 5
    },
    btnDisabled: { opacity: 0.5 },

    outputTitle: { fontSize: 18, fontWeight: 'bold', color: '#4B0082', marginBottom: 10 },
    dyslexiaTitle: { fontSize: 22, letterSpacing: 1 }, // Larger title

    outputScroll: { flex: 1 },
    placeholder: { textAlign: 'center', color: '#888', marginTop: 20 },

    textBlock: { marginBottom: 20, padding: 10, backgroundColor: '#f8f8f8', borderRadius: 10 },
    speakBtn: { alignSelf: 'flex-end', marginBottom: 5 },

    textResult: { fontSize: 16, lineHeight: 24, color: '#333' },
    dyslexiaText: { fontSize: 18, lineHeight: 32, letterSpacing: 0.5, color: '#000' }, // Dyslexia Font styles

    highlightedWord: { backgroundColor: '#FFD700', fontWeight: 'bold' }, // Yellow highlight

    simplifiedBox: { backgroundColor: '#E0F7FA', padding: 10, borderRadius: 8 },
    simplifiedLabel: { fontWeight: 'bold', color: '#006064', marginBottom: 5 },
    simplifiedLine: { fontSize: 16, marginBottom: 5 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '80%', backgroundColor: 'white', padding: 20, borderRadius: 10, alignItems: 'center' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    input: { width: '100%', height: 40, borderColor: '#ccc', borderWidth: 1, borderRadius: 5, paddingHorizontal: 10, marginBottom: 15 },
    closeButton: { backgroundColor: '#4B0082', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 5 },
    closeButtonText: { color: 'white', fontWeight: 'bold' },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    permissionText: {
        textAlign: 'center',
        color: 'white',
        fontSize: 18,
        marginBottom: 20,
    },
    permissionButton: {
        backgroundColor: '#4B0082',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
    },
    permissionButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
