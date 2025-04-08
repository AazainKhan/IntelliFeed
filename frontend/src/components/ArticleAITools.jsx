"use client"

import { useState } from "react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Globe, MessageSquare, Volume2, Loader2 } from "lucide-react"
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

export function ArticleAITools({
    detectedLanguage = "en",
    articleText,
    onLanguageChange,
    onTranslate,
    isTranslating = false,
}) {
    const [selectedLanguage, setSelectedLanguage] = useState(detectedLanguage)
    const [isPlayingAudio, setIsPlayingAudio] = useState(false)
    const [audioElement, setAudioElement] = useState(null)

    // Find the language name from the code
    const getLanguageName = (code) => {
        const language = SUPPORTED_LANGUAGES.find((lang) => lang.code === code)
        return language ? language.name : "Unknown"
    }

    const handleLanguageSelect = async (langCode) => {
        if (langCode === selectedLanguage) return

        setSelectedLanguage(langCode)

        // Only translate if the language is different from the detected language
        if (langCode !== detectedLanguage && articleText) {
            if (onTranslate) {
                onTranslate(langCode)
            }
        }
    }

    const handleTextToSpeech = async () => {
        if (isPlayingAudio) {
            // Stop current audio if playing
            if (audioElement) {
                audioElement.pause()
                audioElement.currentTime = 0
                setIsPlayingAudio(false)
                setAudioElement(null)
            }
            return
        }

        if (!articleText) return

        setIsPlayingAudio(true)

        try {
            // Get the appropriate voice for the current language
            const voice = LANGUAGE_TO_VOICE[selectedLanguage] || "Joanna"

            // Call the backend to convert text to speech
            const response = await fetch("http://localhost:8000/text-to-speech", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    text: articleText,
                    voice_id: voice,
                }),
            })

            if (!response.ok) {
                throw new Error("Failed to generate speech")
            }

            const data = await response.json()

            if (data.success && data.audio) {
                // Create an audio element and play the speech
                const audio = new Audio(`data:${data.content_type};base64,${data.audio}`)
                setAudioElement(audio)

                audio.onended = () => {
                    setIsPlayingAudio(false)
                    setAudioElement(null)
                }

                audio.onerror = () => {
                    console.error("Error playing audio")
                    setIsPlayingAudio(false)
                    setAudioElement(null)
                }

                audio.play()
            } else {
                throw new Error("Invalid audio data received")
            }
        } catch (error) {
            console.error("Error with text-to-speech:", error)
            setIsPlayingAudio(false)
        }
    }

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

            {/* Text-to-Speech button */}
            <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                title={isPlayingAudio ? "Stop audio" : "Listen to article"}
                onClick={handleTextToSpeech}
                disabled={!articleText}
            >
                {isPlayingAudio ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Volume2 className="h-3.5 w-3.5" />}
                <span className="sr-only">Text to Speech</span>
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
