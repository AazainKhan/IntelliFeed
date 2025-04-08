"use client"

import { useState } from "react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Globe, MessageSquare, Volume2 } from "lucide-react"
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

export function ArticleAITools({ detectedLanguage = "en", onLanguageChange, onTextToSpeech, onAIChat }) {
    const [selectedLanguage, setSelectedLanguage] = useState(detectedLanguage)

    // Find the language name from the code
    const getLanguageName = (code) => {
        const language = SUPPORTED_LANGUAGES.find((lang) => lang.code === code)
        return language ? language.name : "Unknown"
    }

    const handleLanguageSelect = (langCode) => {
        setSelectedLanguage(langCode)
        if (onLanguageChange) {
            onLanguageChange(langCode)
        }
    }

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {/* Language dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 gap-1 px-2">
                        <Globe className="h-3.5 w-3.5" />
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
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" title="Listen to article" onClick={onTextToSpeech}>
                <Volume2 className="h-3.5 w-3.5" />
                <span className="sr-only">Text to Speech</span>
            </Button>

            {/* AI Chat button */}
            <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2"
                title="Ask AI about this article"
                onClick={onAIChat}
            >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>AI Chat</span>
            </Button>
        </div>
    )
}
