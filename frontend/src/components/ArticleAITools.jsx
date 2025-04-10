"use client"

import { useState, useEffect } from "react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Globe, MessageSquare, Volume2, Loader2, Pause, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// List of languages we support for translation
const SUPPORTED_LANGUAGES = [
    { code: "en", name: "English" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "it", name: "Italian" },
    { code: "pt", name: "Portuguese" },
    { code: "zh", name: "Chinese" },
    { code: "ja", name: "Japanese" },
    { code: "ko", name: "Korean" },
    { code: "ar", name: "Arabic" },
    { code: "ru", name: "Russian" },
    { code: "hi", name: "Hindi" },
]

// Map language codes to Polly voices
const LANGUAGE_TO_VOICE = {
    en: "Joanna",
    es: "Lupe",
    fr: "Léa",
    de: "Vicki",
    it: "Bianca",
    pt: "Camila",
    zh: "Zhiyu",
    ja: "Takumi",
    ko: "Seoyeon",
    ar: "Zeina",
    ru: "Tatyana",
    hi: "Aditi",
}

// Helper function to generate a storage key based on text and language
const generateAudioStorageKey = (text, language) => {
    // Create a simple hash of the text to avoid using very long keys
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return `tts_audio_${language}_${hash}`;
};

export function ArticleAITools({
    detectedLanguage = "en",
    articleText,
    onLanguageChange,
    onTranslate,
    isTranslating = false,
    currentLanguage,
    onSummarize,
    isSummarizing = false,
}) {
    const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage || detectedLanguage)
    const [isPlayingAudio, setIsPlayingAudio] = useState(false)
    const [isLoadingAudio, setIsLoadingAudio] = useState(false)
    const [audioElement, setAudioElement] = useState(null)
    
    // Reset audio element when language changes
    useEffect(() => {
        // Update selectedLanguage when currentLanguage prop changes
        if (currentLanguage && currentLanguage !== selectedLanguage) {
            setSelectedLanguage(currentLanguage)
        }
        
        // Clear audio if language changes
        if (audioElement) {
            audioElement.pause()
            audioElement.src = ''
            setAudioElement(null)
            setIsPlayingAudio(false)
            setIsLoadingAudio(false)
        }
    }, [currentLanguage])

    // Find the language name from the code
    const getLanguageName = (code) => {
        const language = SUPPORTED_LANGUAGES.find((lang) => lang.code === code)
        return language ? language.name : "Unknown"
    }

    const handleLanguageSelect = async (langCode) => {
        if (langCode === selectedLanguage) return

        // Reset audio state when changing languages
        if (audioElement) {
            audioElement.pause()
            audioElement.src = ''
            setAudioElement(null)
            setIsPlayingAudio(false)
            setIsLoadingAudio(false)
        }

        setSelectedLanguage(langCode)

        // Always call onTranslate regardless of whether it matches the detected language
        // This ensures we can switch back to the original language
        if (onTranslate) {
            onTranslate(langCode)
        }
    }

    const handleTextToSpeech = async () => {
        // If there's already an audio element, use togglePlayPause to resume playback
        if (audioElement) {
            togglePlayPause();
            return;
        }

        if (!articleText) return;

        // Generate a storage key for this text and language
        const storageKey = generateAudioStorageKey(articleText, selectedLanguage);
        
        // Check if we have this audio in session storage
        const cachedAudio = sessionStorage.getItem(storageKey);
        
        if (cachedAudio) {
            // Use cached audio from session storage
            console.log("Using cached audio from session storage");
            
            // Create an audio element with the cached data
            const audio = new Audio(cachedAudio);
            setAudioElement(audio);

            // Set up event handlers
            audio.onended = () => {
                setIsPlayingAudio(false);
            };

            audio.onerror = () => {
                console.error("Error playing cached audio");
                setIsPlayingAudio(false);
                setIsLoadingAudio(false);
                setAudioElement(null);
                // Remove invalid cache entry
                sessionStorage.removeItem(storageKey);
            };

            // Set playing to true once audio starts playing
            audio.onplaying = () => {
                setIsPlayingAudio(true);
                setIsLoadingAudio(false);
            };

            // Start loading the audio
            setIsLoadingAudio(true);
            audio.play().catch(error => {
                console.error("Error playing cached audio:", error);
                setIsPlayingAudio(false);
                setIsLoadingAudio(false);
                setAudioElement(null);
                // Remove invalid cache entry
                sessionStorage.removeItem(storageKey);
            });
            
            return;
        }

        setIsLoadingAudio(true);

        try {
            // Get the appropriate voice for the current language
            const voice = LANGUAGE_TO_VOICE[selectedLanguage] || "Joanna";

            // Call the backend to convert text to speech
            const response = await fetch("http://localhost:8000/text-to-speech", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    text: articleText,
                    voice_id: voice,
                    language_code: selectedLanguage
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to generate speech");
            }

            const data = await response.json();

            if (data.success && data.audio) {
                // Create the audio data URL
                const audioUrl = `data:${data.content_type};base64,${data.audio}`;
                
                // Store in session storage for future use
                try {
                    sessionStorage.setItem(storageKey, audioUrl);
                } catch (storageError) {
                    console.warn("Could not cache audio in session storage:", storageError);
                    // Continue without caching if storage fails (might be quota exceeded)
                }
                
                // Create an audio element and play the speech
                const audio = new Audio(audioUrl);
                setAudioElement(audio);

                audio.onended = () => {
                    setIsPlayingAudio(false);
                };

                audio.onerror = () => {
                    console.error("Error playing audio");
                    setIsPlayingAudio(false);
                    setIsLoadingAudio(false);
                    setAudioElement(null);
                };

                // Set playing to true and loading to false once audio starts playing
                audio.onplaying = () => {
                    setIsPlayingAudio(true);
                    setIsLoadingAudio(false);
                };

                // Start loading the audio
                audio.play().catch(error => {
                    console.error("Error playing audio:", error);
                    setIsPlayingAudio(false);
                    setIsLoadingAudio(false);
                    setAudioElement(null);
                });
            } else {
                throw new Error("Invalid audio data received");
            }
        } catch (error) {
            console.error("Error with text-to-speech:", error);
            setIsPlayingAudio(false);
            setIsLoadingAudio(false);
        }
    };

    // Function to toggle play/pause when audio is already loaded
    const togglePlayPause = () => {
        if (!audioElement) return;
        
        if (audioElement.paused) {
            // Resume playback from current position
            audioElement.play().then(() => {
                setIsPlayingAudio(true);
            }).catch(error => {
                console.error("Error resuming audio:", error);
                setIsPlayingAudio(false);
            });
        } else {
            // Pause playback (keep the current position)
            audioElement.pause();
            setIsPlayingAudio(false);
            // Don't reset currentTime or clear the audio element
        }
    };

    const handleAIChat = () => {
        console.log("AI chat requested")
        // This will be implemented later
    }

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {/* Language dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 gap-1 px-2" disabled={isTranslating}>
                        {isTranslating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
                        <span>{getLanguageName(selectedLanguage)}</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                    {SUPPORTED_LANGUAGES.map((language) => (
                        <DropdownMenuItem
                            key={language.code}
                            className={selectedLanguage === language.code ? "bg-accent font-medium" : ""}
                            onClick={() => handleLanguageSelect(language.code)}
                        >
                            {language.name}
                            {language.code === detectedLanguage && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                    Detected
                                </Badge>
                            )}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* AI Summary button */}
            <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2"
                title="Generate AI summary"
                onClick={onSummarize}
                disabled={!articleText || isSummarizing}
            >
                {isSummarizing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                    <FileText className="h-3.5 w-3.5" />
                )}
                <span>AI Summary</span>
            </Button>

            {/* Text-to-Speech button */}
            <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                title={
                    isLoadingAudio ? "Loading audio..." :
                    isPlayingAudio ? "Pause audio" : audioElement && audioElement.paused ? "Resume audio" : "Listen to article"
                }
                onClick={isLoadingAudio ? undefined : handleTextToSpeech}
                disabled={!articleText || isLoadingAudio}
            >
                {isLoadingAudio ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isPlayingAudio ? (
                    <Pause className="h-3.5 w-3.5" />
                ) : (
                    <Volume2 className="h-3.5 w-3.5" />
                )}
                <span className="sr-only">
                    {isLoadingAudio ? "Loading audio" : isPlayingAudio ? "Pause audio" : "Play audio"}
                </span>
            </Button>

            {/* AI Chat button */}
            <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2"
                title="Ask AI about this article"
                onClick={handleAIChat}
                disabled={!articleText}
            >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>AI Chat</span>
            </Button>
        </div>
    )
}
