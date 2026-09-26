import React, { useState, useEffect } from 'react';
import { View, Image, ActivityIndicator, StyleSheet, StyleProp, ViewStyle, ImageStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BillImage } from '../../types';
import { getBillImageUrl } from '../../services/billImageUploadService';

interface Props {
  bill: BillImage;
  businessId: string;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  resizeMode?: 'cover' | 'contain';
}

export const BillImageViewer: React.FC<Props> = ({
  bill,
  businessId,
  style,
  containerStyle,
  resizeMode = 'cover',
}) => {
  const [resolvedUri, setResolvedUri] = useState<string>(bill.imageUri || '');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    // 1. If local URI exists (e.g. file:///...), use it directly
    if (bill.imageUri && (bill.imageUri.startsWith('file://') || bill.imageUri.startsWith('http'))) {
      setResolvedUri(bill.imageUri);
      return;
    }

    // 2. If primaryImageId exists, resolve private signed GET URL
    if (bill.primaryImageId && businessId) {
      setIsLoading(true);
      setHasError(false);

      getBillImageUrl(bill.primaryImageId, businessId)
        .then((url) => {
          if (isMounted) {
            setResolvedUri(url);
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
  }, [bill.imageUri, bill.primaryImageId, businessId]);

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
