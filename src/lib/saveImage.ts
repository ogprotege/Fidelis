/**
 * Save a rendered PNG (the §8.3 share card) to the device photo library.
 *
 * Web `<a download>` is a no-op inside the iOS WKWebView — the share card's "Save
 * image" claimed success but nothing reached Photos. This bridges to a tiny in-app
 * native plugin (ios/App/App/SaveImagePlugin.swift) that writes the image with
 * UIImageWriteToSavedPhotosAlbum, which needs only the *add-only*
 * NSPhotoLibraryAddUsageDescription permission — the app can save out, never read
 * the library back, in keeping with the "Scripture goes out; nothing comes back"
 * ethos. Where no native implementation exists (desktop web, Android today), the
 * caller falls back to a plain download.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";

interface SaveImagePlugin {
  /** Persist a PNG (a `data:image/png;base64,…` URL, or a bare base64 string) to
   *  the photo library. Rejects on permission denial or a decode failure. */
  savePhoto(options: { data: string }): Promise<void>;
}

const SaveImage = registerPlugin<SaveImagePlugin>("SaveImage");

/** A Blob read as a base64 data URL — the form the native side decodes. */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the image."));
    reader.readAsDataURL(blob);
  });
}

/** True only where the native SaveImage plugin exists (iOS today). Elsewhere the
 *  caller should download (web) or share (other native) instead. */
export function canSaveToPhotos(): boolean {
  return Capacitor.getPlatform() === "ios";
}

/** Running inside a Capacitor native shell (iOS or Android), where a web
 *  `<a download>` is a silent no-op and the share sheet is the way out. */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/** Save a PNG blob to the device photo library. Throws on permission denial or a
 *  decode failure so the caller can report it. Only call when `canSaveToPhotos()`. */
export async function saveImageToPhotos(blob: Blob): Promise<void> {
  const dataUrl = await blobToDataUrl(blob);
  await SaveImage.savePhoto({ data: dataUrl });
}
