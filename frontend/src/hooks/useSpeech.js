import { useState, useEffect, useCallback } from 'react';

export const useSpeech = (setQuestion) => {
  // --- State Management ---
  
  // A switch that turns on when the microphone is listening to you
  const [isListening, setIsListening] = useState(false);
  
  // This holds the "Speech Recognition" engine (the part that hears your voice)
  const [recognition, setRecognition] = useState(null);
  
  // Keeps track of which message is currently being read aloud by the AI
  const [speakingIdx, setSpeakingIdx] = useState(null);


  /**
   * Setup: This runs once when the app starts. 
   * It prepares the browser's speech recognition tool.
   */
  useEffect(() => {
    // Check if the browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recog = new SpeechRecognition();
      recog.continuous = true; // Keep listening even if you pause
      recog.interimResults = true; // Show results as you type
      recog.lang = 'en-US';

      // This part runs every time the computer "hears" a word
      recog.onresult = (event) => {
        // Collect all the heard words and join them into a sentence
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        
        // Update the chat input box with what was heard
        setQuestion(transcript);
      };

      // If the microphone stops, update our 'isListening' switch
      recog.onend = () => setIsListening(false);
      
      // If something goes wrong (like no mic), show an error
      recog.onerror = (err) => {
        console.error("Speech Recognition Error:", err);
        setIsListening(false);
      };

      setRecognition(recog); // Save the engine so we can use it later
    }
  }, [setQuestion]);


  /**
   * Turns the microphone on or off.
   */
  const toggleListening = useCallback(() => {
    if (!recognition) return; // Do nothing if the browser doesn't support speech
    
    if (isListening) {
      recognition.stop(); // Stop listening
    } else {
      recognition.start(); // Start listening
      setIsListening(true);
    }
  }, [recognition, isListening]);


  /**
   * Makes the computer read a message out loud.
   */
  const speakText = useCallback((text, idx) => {
    // If the computer is already reading THIS message, stop it.
    if (speakingIdx === idx) {
      window.speechSynthesis.cancel();
      setSpeakingIdx(null);
      return;
    }

    // Stop anything else it might be reading
    window.speechSynthesis.cancel();

    // Prepare the text to be read
    const utterance = new SpeechSynthesisUtterance(text);
    
    // When it finishes reading, reset our 'speakingIdx'
    utterance.onend = () => setSpeakingIdx(null);
    
    setSpeakingIdx(idx); // Highlight which message is being read
    
    // Start reading!
    window.speechSynthesis.speak(utterance);
  }, [speakingIdx]);


  return { isListening, toggleListening, speakText, speakingIdx };
};
