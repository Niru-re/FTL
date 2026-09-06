import { useState, useEffect, useRef, useCallback } from 'react';

// Sound frequencies for different notification types (in Hz)
const SOUND_FREQUENCIES = {
  NORMAL: 800,    // Soft notification tone
  WARNING: 1000,  // Warning/attention tone
  CRITICAL: 1200, // Strong critical alert tone
  EMERGENCY: 600  // Distinct emergency tone (lower frequency for urgency)
};

// Sound durations in milliseconds
const SOUND_DURATIONS = {
  NORMAL: 150,
  WARNING: 200,
  CRITICAL: 250,
  EMERGENCY: 300
};

// Volume levels (0.0 to 1.0)
const SOUND_VOLUMES = {
  NORMAL: 0.3,
  WARNING: 0.5,
  CRITICAL: 0.7,
  EMERGENCY: 0.8
};

interface UseNotificationSoundReturn {
  playSound: (type: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'EMERGENCY') => void;
  isAudioReady: boolean;
  initAudio: () => void;
}

export const useNotificationSound = (): UseNotificationSoundReturn => {
  const [isAudioReady, setIsAudioReady] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const userInteractedRef = useRef(false);

  // Initialize audio context - safe to call multiple times
  const initAudio = useCallback(() => {
    // If we already have an audio context, just return
    if (audioContextRef.current) {
      // If context is suspended, try to resume it
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().then(() => {
          setIsAudioReady(true);
        }).catch(e => {
          console.warn('Failed to resume audio context:', e);
          setIsAudioReady(false);
        });
      }
      return;
    }

    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext();
      setIsAudioReady(true);
    } catch (e) {
      console.warn('Failed to initialize audio context:', e);
      setIsAudioReady(false);
    }
  }, []);

  // Play sound using Web Audio API
  const playSound = useCallback((type: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'EMERGENCY') => {
    // Check if muted via localStorage
    const isMuted = localStorage.getItem('carebridge-sound-muted') === 'true';
    if (isMuted) return;

    // Ensure we have an audio context
    if (!audioContextRef.current) {
      // Try to initialize audio context (will be resumed if needed)
      initAudio();
      // If still no context after init, return
      if (!audioContextRef.current) return;
    }

    // If context is suspended, try to resume it
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().then(() => {
        // Actually play the sound after resume
        playSoundInternal(type);
      }).catch(e => {
        console.warn('Failed to resume audio context:', e);
      });
      return;
    }

    // Play the sound immediately
    playSoundInternal(type);
  }, [initAudio]);

  // Internal function to actually play sound (assumes audio context is ready)
  const playSoundInternal = useCallback((type: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'EMERGENCY') => {
    try {
      const audioContext = audioContextRef.current;
      if (!audioContext) return;

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      // Configure oscillator
      oscillator.type = 'sine';
      oscillator.frequency.value = SOUND_FREQUENCIES[type];

      // Configure gain (volume)
      gainNode.gain.value = SOUND_VOLUMES[type];

      // Connect nodes
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Start sound
      oscillator.start();

      // Stop sound after duration
      setTimeout(() => {
        oscillator.stop();
      }, SOUND_DURATIONS[type]);

      // Clean up
      oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
      };
    } catch (e) {
      console.warn('Error playing notification sound:', e);
    }
  }, []);

  // Handle user interaction to unlock audio (for autoplay policies)
  useEffect(() => {
    const handleUserInteraction = () => {
      if (!userInteractedRef.current) {
        userInteractedRef.current = true;
        initAudio();
      }
    };

    // Listen for common user interactions
    const events = ['click', 'keydown', 'mousedown', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, handleUserInteraction, { once: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleUserInteraction);
      });
    };
  }, [initAudio]);

  return {
    playSound,
    isAudioReady,
    initAudio
  };
};