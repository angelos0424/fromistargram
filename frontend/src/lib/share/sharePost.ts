export interface SharePayload {
  url: string;
  title?: string;
  text?: string;
}

export type ShareResult = 'shared' | 'copied' | 'unsupported';

export const copyToClipboard = async (text: string) => {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
};

export const sharePost = async ({
  url,
  title,
  text
}: SharePayload): Promise<ShareResult> => {
  if (navigator.share) {
    try {
      await navigator.share({ url, title, text });
      return 'shared';
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') {
        return 'unsupported';
      }
    }
  }

  try {
    await copyToClipboard(url);
    return 'copied';
  } catch (error) {
    console.error('Failed to copy share URL', error);
  }

  return 'unsupported';
};
