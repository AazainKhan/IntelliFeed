"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { X, ExternalLink } from "lucide-react"
import { ArticleAITools } from "./ArticleAITools"
import { ArticleChat } from "./ArticleChat"

export function ArticleDetail({ article, onClose }) {
    const [isContentVisible, setIsContentVisible] = useState(false)
    const [articleContent, setArticleContent] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)
    const [detectedLanguage, setDetectedLanguage] = useState("en")
    const [translatedContent, setTranslatedContent] = useState(null)
    const [isTranslating, setIsTranslating] = useState(false)
    const [currentLanguage, setCurrentLanguage] = useState("en")
    const [showAISummary, setShowAISummary] = useState(false)
    const [showAIChat, setShowAIChat] = useState(false)
    const [aiSummary, setAISummary] = useState("")
    const [isSummarizing, setIsSummarizing] = useState(false)

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
            setShowAISummary(false)
            setShowAIChat(false)
            setAISummary("")
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

    // Handle AI summary generation
    const handleGenerateSummary = async () => {
        if (!articleContent) return

        setIsSummarizing(true)
        setShowAISummary(true)
        // Close chat if it's open
        setShowAIChat(false)

        // Simulate AI summary generation (replace with actual API call)
        try {
            // This would be replaced with your actual API call
            // For now, we'll simulate a delay and return a placeholder summary
            setTimeout(() => {
                const placeholderSummary = `
                    <h3>Key Points</h3>
                    <ul>
                        <li>This article discusses ${article.title.split(" ").slice(0, 3).join(" ")}...</li>
                        <li>The main argument centers around the importance of this topic.</li>
                        <li>Several experts were cited providing different perspectives.</li>
                    </ul>
                    <h3>Summary</h3>
                    <p>This is an AI-generated summary of the article. In a real implementation, 
                    this would contain a concise overview of the key points and main arguments 
                    presented in the article.</p>
                `
                setAISummary(placeholderSummary)
                setIsSummarizing(false)
            }, 1500)

            // Actual implementation would look something like:
            /*
                  const response = await fetch("http://localhost:8000/summarize", {
                      method: "POST",
                      headers: {
                          "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                          text: getCurrentText(),
                          language: currentLanguage,
                      }),
                  });
                  
                  if (!response.ok) {
                      throw new Error("Failed to generate summary");
                  }
                  
                  const data = await response.json();
                  setAISummary(data.summary);
                  */
        } catch (error) {
            console.error("Error generating summary:", error)
            setAISummary("<p>Failed to generate summary. Please try again later.</p>")
        } finally {
            setIsSummarizing(false)
        }
    }

    // Handle opening AI chat
    const handleOpenAIChat = () => {
        setShowAIChat(true)
        // Close summary if it's open
        setShowAISummary(false)
    }

    // Close the AI summary panel
    const handleCloseSummary = () => {
        setShowAISummary(false)
    }

    // Close the AI chat panel
    const handleCloseChat = () => {
        setShowAIChat(false)
    }

    if (!article) return null

    // Determine if any AI panel is open
    const isAIPanelOpen = showAISummary || showAIChat

    return (
        <div className={`flex transition-all duration-300 ease-in-out ${isAIPanelOpen ? "space-x-4" : ""}`}>
            {/* Main article content - shrinks when AI panel is shown */}
            <Card className={`shadow-md overflow-auto transition-all duration-300 ${isAIPanelOpen ? "w-2/3" : "w-full"}`}>
                <CardHeader className="sticky top-0 bg-card z-10 border-b">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center pr-8">
                            <CardTitle className="text-2xl font-bold">{article.title}</CardTitle>
                            <a
                                href={article.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-2 text-muted-foreground hover:text-primary"
                                title="Open original article"
                            >
                                <ExternalLink className="h-6 w-6" />
                                <span className="sr-only">Open original article</span>
                            </a>
                        </div>
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
                                <a
                                    href={article.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                >
                                    Read on original website
                                </a>
                            </div>
                        </div>
                    ) : articleContent ? (
                        <div className="rich-text-content mx-auto max-w-2xl">
                            <div className="mb-6 flex flex-wrap items-center gap-2">
                                <Badge variant="secondary">{article.category}</Badge>
                                {/* AI Tools - using the existing component */}
                                <div className="ml-auto">
                                    <ArticleAITools
                                        detectedLanguage={detectedLanguage}
                                        articleText={getCurrentText()}
                                        onTranslate={handleTranslate}
                                        isTranslating={isTranslating}
                                        currentLanguage={currentLanguage}
                                        onSummarize={handleGenerateSummary}
                                        isSummarizing={isSummarizing}
                                        onAIChat={handleOpenAIChat}
                                        isAIChatActive={showAIChat}
                                    />
                                </div>
                            </div>
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
                            <div className="mt-6"></div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* AI Summary Card - appears when summary is requested */}
            {showAISummary && (
                <Card className="shadow-md overflow-auto w-1/3 max-h-[700px] transition-all duration-300 ease-in-out">
                    <CardHeader className="sticky top-0 bg-card z-10 border-b">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-xl font-bold">AI Summary</CardTitle>
                            <Button variant="ghost" size="icon" onClick={handleCloseSummary}>
                                <X className="h-4 w-4" />
                                <span className="sr-only">Close summary</span>
                            </Button>
                        </div>
                        <CardDescription>AI-generated summary of the article</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {isSummarizing ? (
                            <div className="space-y-4">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-2/3" />
                                <Skeleton className="h-4 w-full" />
                            </div>
                        ) : (
                            <div className="prose prose-sm dark:prose-invert" dangerouslySetInnerHTML={{ __html: aiSummary }} />
                        )}
                    </CardContent>
                </Card>
            )}

            {/* AI Chat Card - appears when chat is requested */}
            {showAIChat && (
                <div className="w-1/3 transition-all duration-300 ease-in-out">
                    <ArticleChat
                        article={article}
                        articleText={getCurrentText()}
                        onClose={handleCloseChat}
                        isVisible={showAIChat}
                    />
                </div>
            )}
        </div>
    )
}
