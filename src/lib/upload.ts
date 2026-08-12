export async function uploadImageFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const getCookie = (name: string): string | undefined => {
    if (typeof document === 'undefined') return undefined;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return undefined;
  };

  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: {
      'X-CSRF-Token': getCookie('csrf_token') || '',
    },
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to upload image.');
  }

  const data = await res.json();
  return data.url;
}
