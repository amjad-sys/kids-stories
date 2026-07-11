/**
 * profile.js — student photo upload helper.
 * Exposes pickAndUploadPhoto(username): opens a file picker, center-crops and
 * resizes the image to a small square, and stores it as a compact data URL on
 * the student's Firestore doc (`photo`). Imported by leaderboard.js so the
 * student uploads by clicking their own avatar circle.
 */
const AVATAR_SIZE = 160;
const JPEG_QUALITY = 0.8;

function resizeToDataURL(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(img.width, img.height);
      const sx = (img.width - s) / 2;
      const sy = (img.height - s) / 2;
      const canvas = document.createElement('canvas');
      canvas.width = AVATAR_SIZE;
      canvas.height = AVATAR_SIZE;
      canvas.getContext('2d').drawImage(img, sx, sy, s, s, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad-image')); };
    img.src = url;
  });
}

async function savePhoto(username, photo) {
  // update() preserves scores / time / retake fields.
  await window.fs.collection('students').doc(username).update({ photo });
}

let busy = false;

export function pickAndUploadPhoto(username, onState) {
  if (busy) return;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    busy = true;
    if (onState) onState('uploading');
    try {
      const dataUrl = await resizeToDataURL(file);
      await savePhoto(username, dataUrl);
      if (onState) onState('done');
    } catch (e) {
      console.error('Photo upload failed:', e);
      if (onState) onState('error');
    } finally {
      busy = false;
    }
  });
  input.click();
}
