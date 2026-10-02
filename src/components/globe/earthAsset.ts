import { Asset } from 'expo-asset';
import { Platform } from 'react-native';

const earth = require('../../../assets/globe/earth.jpg');

// No nativo o R3F resolve o módulo `require` via expo-asset; na web precisa de uma URL.
export const earthTextureSource: any = Platform.OS === 'web' ? Asset.fromModule(earth).uri : earth;
