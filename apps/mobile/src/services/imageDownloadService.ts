import { Platform, Alert, Share } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { getBillImageUrl } from './billImageUploadService';

export interface DownloadBillImageParams {
  imageUri?: string;
  primaryImageId?: string;
  businessId: string;
  title?: string;
}

/**
 * Downloads or saves a bill image to the user's device storage/gallery.
 * Uses Android Storage Access Framework (SAF) when available,
 * and falls back seamlessly to native Share for full compatibility.
 */
export async function downloadBillImage(params: DownloadBillImageParams): Promise<{ success: boolean; message?: string }> {
  const { imageUri, primaryImageId, businessId, title = 'bill_receipt' } = params;

  try {
    let sourceUri = imageUri || '';

    // 1. Resolve remote signed GET URL if primaryImageId is provided
    if ((!sourceUri || (!sourceUri.startsWith('file://') && !sourceUri.startsWith('http'))) && primaryImageId && businessId) {
      sourceUri = await getBillImageUrl(primaryImageId, businessId);
    }

    if (!sourceUri) {
      Alert.alert('Error', 'No image available to download.');
      return { success: false, message: 'No image URI' };
    }

    // 2. Ensure we have a local cached file
    let localFileUri = sourceUri;
    const cleanPrefix = title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30) || 'bill';
    const extension = sourceUri.toLowerCase().includes('.png') ? 'png' : 'jpg';
    const fileName = `${cleanPrefix}_${Date.now()}.${extension}`;
    const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';

    if (sourceUri.startsWith('http://') || sourceUri.startsWith('https://')) {
      const destinationUri = `${FileSystem.cacheDirectory || ''}${fileName}`;
      const downloadResult = await FileSystem.downloadAsync(sourceUri, destinationUri);
      localFileUri = downloadResult.uri;
    }

    // 3. Android Storage Access Framework (SAF) - allows user to pick folder (Downloads/Pictures)
    if (Platform.OS === 'android') {
      try {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const base64Data = await FileSystem.readAsStringAsync(localFileUri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          const createdFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            fileName.replace(`.${extension}`, ''),
            mimeType
          );

          await FileSystem.writeAsStringAsync(createdFileUri, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });

          Alert.alert('Download Successful', 'Bill image has been saved to your selected folder.');
          return { success: true };
        }
      } catch (safError: any) {
        console.warn('[downloadBillImage] SAF error or cancelled, falling back to Share:', safError);
      }
    }

    // 4. Fallback to native sharing / saving
    try {
      const contentUri = await FileSystem.getContentUriAsync(localFileUri);
      await Share.share({
        url: contentUri,
        title: title || 'Bill Image',
      });
      return { success: true };
    } catch (shareErr: any) {
      console.warn('[downloadBillImage] Share fallback error:', shareErr);
      Alert.alert('Download Error', shareErr?.message || 'Could not save bill image.');
      return { success: false, message: shareErr?.message };
    }
  } catch (error: any) {
    console.error('[downloadBillImage] Unexpected error:', error);
    Alert.alert('Error', error?.message || 'Failed to download bill image.');
    return { success: false, message: error?.message };
  }
}
