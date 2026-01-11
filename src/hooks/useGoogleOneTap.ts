import { useEffect, useRef } from 'react';
import { signInWithGoogleOneTap } from '../services/authService';

interface UseGoogleOneTapOptions {
  disabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            prompt_parent_id?: string;
          }) => void;
          prompt: (callback?: (notification: { isDisplayed: () => boolean; isNotDisplayed: () => boolean; getNotDisplayedReason: () => string }) => void) => void;
          cancel: () => void;
        };
      };
    };
  }
}

export function useGoogleOneTap({ disabled = false, onSuccess, onError }: UseGoogleOneTapOptions = {}) {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (disabled || initializedRef.current) {
      return;
    }

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
      console.warn('Google Client ID not configured. Google One Tap will not be initialized.');
      return;
    }

    const initializeGoogleOneTap = () => {
      if (!window.google?.accounts?.id) {
        console.warn('Google One Tap library not loaded yet');
        return;
      }

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            try {
              const { user, error } = await signInWithGoogleOneTap(response.credential);

              if (error) {
                console.error('Google One Tap sign-in error:', error);
                onError?.(error);
              } else if (user) {
                console.log('Google One Tap sign-in successful, user ID:', user.id);

                await new Promise(resolve => setTimeout(resolve, 1000));

                console.log('Session established');
                onSuccess?.();
              }
            } catch (err) {
              const error = err instanceof Error ? err : new Error('Failed to sign in with Google One Tap');
              console.error('Google One Tap sign-in error:', error);
              onError?.(error);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed()) {
            console.log('Google One Tap not displayed:', notification.getNotDisplayedReason());
          } else if (notification.isDisplayed()) {
            console.log('Google One Tap displayed');
          }
        });

        initializedRef.current = true;
      } catch (error) {
        console.error('Failed to initialize Google One Tap:', error);
      }
    };

    if (window.google?.accounts?.id) {
      initializeGoogleOneTap();
    } else {
      const checkInterval = setInterval(() => {
        if (window.google?.accounts?.id) {
          initializeGoogleOneTap();
          clearInterval(checkInterval);
        }
      }, 100);

      const timeout = setTimeout(() => {
        clearInterval(checkInterval);
        console.warn('Google One Tap library failed to load within timeout');
      }, 5000);

      return () => {
        clearInterval(checkInterval);
        clearTimeout(timeout);
      };
    }

    return () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }
    };
  }, [disabled, onSuccess, onError]);
}
