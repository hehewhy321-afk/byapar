import React, { useState, useEffect } from 'react';
import { View, Image, ActivityIndicator, StyleSheet, StyleProp, ViewStyle, ImageStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BillImage } from '../../types';
import { getBillImageUrl } from '../../services/billImageUploadService';

interface Props {
  bill?: BillImage | { imageUri?: string; primaryImageId?: string };
  primaryImageId?: string;
  imageUri?: string;
  businessId: string;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  resizeMode?: 'cover' | 'contain';
  onResolvedUri?: (uri: string) => void;
}

export const BillImageViewer: React.FC<Props> = ({
  bill,
  primaryImageId,
  imageUri,
  businessId,
  style,
  containerStyle,
  resizeMode = 'cover',
  onResolvedUri,
}) => {
  const targetImageUri = imageUri || bill?.imageUri || '';
  const targetImageId = primaryImageId || bill?.primaryImageId;

  const [resolvedUri, setResolvedUri] = useState<string>(targetImageUri);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    // 1. If local URI exists (e.g. file:///...), use it directly
    if (targetImageUri && (targetImageUri.startsWith('file://') || targetImageUri.startsWith('http'))) {
      setResolvedUri(targetImageUri);
      if (onResolvedUri) onResolvedUri(targetImageUri);
      return;
    }

    // 2. If primaryImageId exists, resolve private signed GET URL
    if (targetImageId && businessId) {
      setIsLoading(true);
      setHasError(false);

      getBillImageUrl(targetImageId, businessId)
        .then((url) => {
          if (isMounted) {
            setResolvedUri(url);
            if (onResolvedUri) onResolvedUri(url);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          console.warn('[BillImageViewer] Failed to resolve image URL:', err);
          if (isMounted) {
            setHasError(true);
            setIsLoading(false);
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, [targetImageUri, targetImageId, businessId]);

  if (isLoading) {
    return (
      <View style={[styles.placeholderBox, containerStyle]}>
        <ActivityIndicator size="small" color="#999" />
      </View>
    );
  }

  if (hasError || !resolvedUri) {
    return (
      <View style={[styles.placeholderBox, containerStyle]}>
        <Feather name="image" size={24} color="#BBB" />
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <Image
        source={{ uri: resolvedUri }}
        style={style}
        resizeMode={resizeMode}
        onError={() => setHasError(true)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  placeholderBox: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
