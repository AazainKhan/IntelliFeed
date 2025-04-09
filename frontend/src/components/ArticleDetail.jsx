"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { X } from "lucide-react"
import { ArticleAITools } from "./ArticleAITools"

export function ArticleDetail({ article, onClose }) {
    const [isContentVisible, setIsContentVisible] = useState(false)
    const [articleContent, setArticleContent] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)
    const [detectedLanguage, setDetectedLanguage] = useState("en")
    const [translatedContent, setTranslatedContent] = useState(null)
    const [isTranslating, setIsTranslating] = useState(false)
    const [currentLanguage, setCurrentLanguage] = useState("en")

    // Store the original text for TTS and translation
    const originalTextRef = useRef("")
    const translatedTextRef = useRef("")

    useEffect(() => {
        // Trigger content fade-in animation after component mounts
        const timer = setTimeout(() => {
            setIsContentVisible(true)
        }, 100)

        return () => clearTimeout(timer)
    }, [])

    useEffect(() => {
        // Reset state when a new article is loaded
        if (article) {
            setTranslatedContent(null)
            setCurrentLanguage("en")
            setDetectedLanguage("en")
            originalTextRef.current = ""
            translatedTextRef.current = ""
        }

        // Fetch the full article content when an article is selected
        if (article && article.link) {
            setIsLoading(true)
            setError(null)

            fetch("http://localhost:8000/article", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ url: article.link }),
            })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error("Failed to fetch article content")
                    }
                    return response.json()
                })
                .then((data) => {
                    // Process the content to remove the top image if it's already in the content
                    if (data.top_image && data.content.includes(data.top_image)) {
                        // If the top image is already in the content, set it to null to avoid duplication
                        data.top_image = null
                    }
                    setArticleContent(data)
                    setIsLoading(false)

                    // Store the detected language
                    if (data.detected_language) {
                        setDetectedLanguage(data.detected_language)
                        setCurrentLanguage(data.detected_language)
                    }

                    // Extract plain text from HTML content for TTS and translation
                    const tempDiv = document.createElement("div")
                    tempDiv.innerHTML = data.content
                    originalTextRef.current = tempDiv.textContent || tempDiv.innerText || ""
                })
                .catch((err) => {
                    console.error("Error fetching article content:", err)
                    setError("Could not load the full article. Please try again later.")
                    setIsLoading(false)
                })
        }
    }, [article])

    const handleTranslate = async (targetLanguage) => {
        // If target language is the same as detected language, reset to original content
        if (!articleContent || targetLanguage === detectedLanguage) {
            setTranslatedContent(null)
            setCurrentLanguage(detectedLanguage)
            return
        }

        setIsTranslating(true)

        try {
            // Call the backend to translate the text
            const response = await fetch("http://localhost:8000/translate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    text: originalTextRef.current,
                    source_language: detectedLanguage,
                    target_language: targetLanguage,
                }),
            })

            if (!response.ok) {
                throw new Error("Failed to translate text")
            }

            const data = await response.json()

            if (data.success && data.translated_text) {
                // Store the translated text for TTS
                translatedTextRef.current = data.translated_text

                // Create HTML content from the translated text
                const translatedHtml = `
          <div class="article-content">
            <div class="article-text">
              ${data.translated_text.replace(/\n/g, "<br />")}
            </div>
          </div>
        `

                setTranslatedContent(translatedHtml)
                setCurrentLanguage(targetLanguage)
            } else {
                throw new Error("Invalid translation data received")
            }
        } catch (error) {
            console.error("Error translating text:", error)
            // If translation fails, reset to original content
            setTranslatedContent(null)
            setCurrentLanguage(detectedLanguage)
        } finally {
            setIsTranslating(false)
        }
    }

    // Get the current text for TTS based on whether we're showing translated content
    const getCurrentText = () => {
        if (currentLanguage !== detectedLanguage && translatedTextRef.current) {
            return translatedTextRef.current
        }
        return originalTextRef.current
    }

    if (!article) return null

    return (
        <Card className="shadow-md h-full overflow-auto">
            <CardHeader className="sticky top-0 bg-card z-10 border-b">
                <div className="flex justify-between items-start">
                    <CardTitle className="pr-8 text-2xl font-bold">{article.title}</CardTitle>
                    <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={onClose}>
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </Button>
                </div>
                <CardDescription className="mt-2">
                    <div className="flex flex-col space-y-1">
                        <div>
                            {new Date(article.published).toLocaleDateString()} • {article.source_name}
                        </div>
                        {articleContent?.authors && articleContent.authors.length > 0 && (
                            <div className="text-sm font-medium">By {articleContent.authors.join(", ")}</div>
                        )}
                    </div>
                </CardDescription>
            </CardHeader>
            <CardContent
                className={`pt-6 transition-all duration-300 ease-in-out ${isContentVisible ? "opacity-100" : "opacity-0"}`}
            >
                <div className="mb-6 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{article.category}</Badge>

                    {/* AI Tools */}
                    <div className="ml-auto">
                        <ArticleAITools
                            detectedLanguage={detectedLanguage}
                            articleText={getCurrentText()}
                            onTranslate={handleTranslate}
                            isTranslating={isTranslating}
                            currentLanguage={currentLanguage} // Add current language prop
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-40 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>
                ) : error ? (
                    <div className="text-destructive">
                        <p>{error}</p>
                        <div className="mt-6">
                            <a href={article.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                Read on original website
                            </a>
                        </div>
                    </div>
                ) : articleContent ? (
                    <div className="rich-text-content">
                        {articleContent.top_image && (
                            <img
                                src={articleContent.top_image || "/placeholder.svg"}
                                alt="Article featured image"
                                className="w-full rounded-lg mb-6 object-cover max-h-80"
                                onError={(e) => {
                                    e.currentTarget.style.display = "none"
                                }}
                            />
                        )}

                        {/* Show translated content if available, otherwise show original content */}
                        {isTranslating ? (
                            <div className="space-y-4">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                            </div>
                        ) : (
                            <div dangerouslySetInnerHTML={{ __html: translatedContent || articleContent.content }} />
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p>{article.summary}</p>
                        <div className="mt-6">
                            <a href={article.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                Read on original website
                            </a>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
