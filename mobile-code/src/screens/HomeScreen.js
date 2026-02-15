import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState, useRef, useEffect } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View, Dimensions, Image, TextInput } from 'react-native';
import axios from 'axios';
import * as ImageManipulator from 'expo-image-manipulator';
import BoundingBox from '../components/BoundingBox';
import { detectText } from '../vision/api';

export default function HomeScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [facing, setFacing] = useState('back');
    const [serverUrl, setServerUrl] = useState('http://192.168.1.100:8000'); // Default to example LAN IP
    // const [boxes, setBoxes] = useState([]); // Unused
    const cameraRef = useRef(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [boundingBoxes, setBoundingBoxes] = useState([]);

    if (!permission) {
        return <View />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={{ textAlign: 'center' }}>We need your permission to show the camera</Text>
                <Button onPress={requestPermission} title="grant permission" />
            </View>
        );
    }

    const takePictureAndDetect = async () => {
        if (cameraRef.current && !isProcessing) {
            setIsProcessing(true);
            try {
                const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });

                // const response = await axios.post... // Removed
                const detections = await detectText(photo.uri, serverUrl);

                if (detections && detections.length > 0) {
                    // Adjust bounding boxes to screen coordinates
                    // Scaling: Camera might capture higher res than screen.
                    // For MVP, we assume the camera view fills the screen and we scale based on photo dimensions vs screen dimensions.

                    const screenWidth = Dimensions.get('window').width;
                    const screenHeight = Dimensions.get('window').height;

                    const scaleX = screenWidth / photo.width;
                    const scaleY = screenHeight / photo.height;

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
                } else {
                    setBoundingBoxes([]);
                }
            } catch (error) {
                console.log("Error detecting:", error);
            } finally {
                setIsProcessing(false);
            }
        }
    };

    // Run detection loop efficiently
    useEffect(() => {
        const interval = setInterval(() => {
            takePictureAndDetect();
        }, 1000); // Every 1 second to start with
        return () => clearInterval(interval);
    }, [serverUrl]); // Restart on URL change

    function toggleCameraFacing() {
        setFacing(current => (current === 'back' ? 'front' : 'back'));
    }

    return (
        <View style={styles.container}>
            <CameraView style={styles.camera} facing={facing} ref={cameraRef}>

                {/* Draw Bounding Boxes using the component */}
                {boundingBoxes.map((det, index) => (
                    <BoundingBox
                        key={index}
                        box={det.box}
                        text={det.text || det.class}
                        confidence={det.confidence}
                    />
                ))}

                <View style={styles.uiContainer}>
                    <TextInput
                        style={styles.input}
                        value={serverUrl}
                        onChangeText={setServerUrl}
                        placeholder="Server URL (e.g. http://192.168.1.5:8000)"
                        placeholderTextColor="#ccc"
                    />
                    <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
                        <Text style={styles.text}>Flip</Text>
                    </TouchableOpacity>
                </View>
            </CameraView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
    },
    camera: {
        flex: 1,
    },
    uiContainer: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    input: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        color: 'white',
        padding: 10,
        borderRadius: 8,
        flex: 1,
        marginRight: 10,
    },
    button: {
        padding: 10,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 8,
    },
    text: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
    },
});
