"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { X, ExternalLink, ThumbsUp, ThumbsDown, Minus } from "lucide-react"
import { ArticleAITools } from "./ArticleAITools"
import { ArticleChat } from "./ArticleChat"

// Helper function to generate a unique storage key for each article
const getArticleStorageKey = (url) => {
    return `intellifeed_article_${url.replace(/[^a-z0-9]/gi, '_')}`;
};

// Add this helper function to generate a storage key for sentiment data
const getSentimentStorageKey = (articleUrl) => {
    // Create a unique key based on the article URL
    return `intellifeed_sentiment_${articleUrl.replace(/[^a-z0-9]/gi, '_')}`;
};

export function ArticleDetail({ article, onClose }) {
    const [isContentVisible, setIsContentVisible] = useState(false)
    const [articleContent, setArticleContent] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)
    const [detectedLanguage, setDetectedLanguage] = useState("en")
    const [translatedContent, setTranslatedContent] = useState(null)
    const [isTranslating, setIsTranslating] = useState(false)
    const [currentLanguage, setCurrentLanguage] = useState("en")
    const [showAISentiment, setShowAISentiment] = useState(false)
    const [showAIChat, setShowAIChat] = useState(false)
    const [sentimentData, setSentimentData] = useState(null)
    const [isAnalyzingSentiment, setIsAnalyzingSentiment] = useState(false)
    const stopAudioRef = useRef(null);

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
            setShowAISentiment(false)
            setShowAIChat(false)
            setSentimentData(null)
        }

        // Fetch the full article content when an article is selected
        if (article && article.link) {
            setIsLoading(true)
            setError(null)
            
            // Check if we already have this article data in session storage
            const storageKey = getArticleStorageKey(article.link);
            const cachedData = sessionStorage.getItem(storageKey);
            
            if (cachedData) {
                try {
                    // Use cached data if available
                    const data = JSON.parse(cachedData);
                    console.log("Using cached article data");
                    
                    // Process the cached content
                    if (data.top_image && data.content.includes(data.top_image)) {
                        data.top_image = null;
                    }
                    
                    setArticleContent(data);
                    setIsLoading(false);
                    
                    // Store the detected language from cache
                    if (data.detected_language) {
                        setDetectedLanguage(data.detected_language);
                        setCurrentLanguage(data.detected_language);
                    }
                    
                    // Extract plain text from HTML content for TTS and translation
                    const tempDiv = document.createElement("div");
                    tempDiv.innerHTML = data.content;
                    originalTextRef.current = tempDiv.textContent || tempDiv.innerText || "";
                    return;
                } catch (error) {
                    console.error("Error parsing cached article data:", error);
                    // Continue with fetch if parsing fails
                }
            }

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
                    
                    // Save the fetched data to session storage
                    try {
                        sessionStorage.setItem(storageKey, JSON.stringify(data));
                    } catch (err) {
                        console.error("Error saving article to session storage:", err);
                    }
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

    // Handle sentiment analysis
    const handleAnalyzeSentiment = async () => {
        if (!articleContent || !article) return

        setShowAISentiment(true)
        // Close chat if it's open
        setShowAIChat(false)

        // Check if we already have sentiment data for this article in session storage
        const storageKey = getSentimentStorageKey(article.link);
        const cachedData = sessionStorage.getItem(storageKey);

        if (cachedData) {
            try {
                // Use cached data if available
                const parsedData = JSON.parse(cachedData);
                console.log("Using cached sentiment data");
                setSentimentData(parsedData);
                return;
            } catch (error) {
                console.error("Error parsing cached sentiment data:", error);
                // Continue with API call if parsing fails
            }
        }

        // No valid cached data found, proceed with API call
        setIsAnalyzingSentiment(true)

        try {
            // Call the backend to analyze sentiment
            const response = await fetch("http://localhost:8000/sentiment-analysis", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    text: getCurrentText(),
                    language: currentLanguage,
                }),
            })

            if (!response.ok) {
                throw new Error("Failed to analyze sentiment")
            }

            const data = await response.json()
            console.log("Sentiment data received:", data)
            setSentimentData(data)
            
            // Save to session storage for future use
            sessionStorage.setItem(storageKey, JSON.stringify(data));
        } catch (error) {
            console.error("Error analyzing sentiment:", error)
            setSentimentData({
                error: "Failed to analyze sentiment. Please try again later.",
            })
        } finally {
            setIsAnalyzingSentiment(false)
        }
    }

    // Handle opening AI chat
    const handleOpenAIChat = () => {
        setShowAIChat(true)
        // Close sentiment if it's open
        setShowAISentiment(false)
    }

    // Close the AI sentiment panel
    const handleCloseSentiment = () => {
        setShowAISentiment(false)
    }

    // Close the AI chat panel
    const handleCloseChat = () => {
        setShowAIChat(false)
    }

    // Ensure audio stops when article is closed
    const handleArticleClose = () => {
        // Stop any playing audio
        if (stopAudioRef.current) {
            stopAudioRef.current();
        }
        
        // Call the original onClose handler
        onClose();
    };

    if (!article) return null

    // Determine if any AI panel is open
    const isAIPanelOpen = showAISentiment || showAIChat

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
                        <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={handleArticleClose}>
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
                                        onSummarize={handleAnalyzeSentiment}
                                        isSummarizing={isAnalyzingSentiment}
                                        onAIChat={handleOpenAIChat}
                                        isAIChatActive={showAIChat}
                                        setStopAudioFunction={(fn) => stopAudioRef.current = fn}
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

            {/* AI Sentiment Analysis Card - appears when sentiment analysis is requested */}
            {showAISentiment && (
                <Card className="shadow-md w-1/3 transition-all duration-300 ease-in-out">
                    <CardHeader className="sticky top-0 bg-card z-10 border-b">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-xl font-bold">Sentiment Analysis</CardTitle>
                            <Button variant="ghost" size="icon" onClick={handleCloseSentiment}>
                                <X className="h-4 w-4" />
                                <span className="sr-only">Close sentiment analysis</span>
                            </Button>
                        </div>
                        <CardDescription>AI analysis of the article's sentiment</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {isAnalyzingSentiment ? (
                            <div className="space-y-6">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-24 w-full rounded-md" />
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-16 w-full" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-16 w-full" />
                            </div>
                        ) : sentimentData?.error ? (
                            <div className="text-destructive">
                                <p>{sentimentData.error}</p>
                            </div>
                        ) : sentimentData ? (
                            <div className="space-y-6">
                                {/* Overall Sentiment Card */}
                                <SentimentOverallCard sentimentData={sentimentData} />

                                {/* Sentiment Breakdown */}
                                <SentimentBreakdown sentimentData={sentimentData} />

                                {/* Key Phrases */}
                                <KeyPhrases sentimentData={sentimentData} />
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground">No sentiment data available</div>
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

// Component for displaying overall sentiment
function SentimentOverallCard({ sentimentData }) {
    if (!sentimentData) return null

    // Determine sentiment icon and color
    const getSentimentIcon = () => {
        const score = sentimentData.sentiment_score
        if (score > 0.1) return <ThumbsUp className="h-6 w-6 text-green-500" />
        if (score < -0.1) return <ThumbsDown className="h-6 w-6 text-red-500" />
        return <Minus className="h-6 w-6 text-gray-500" />
    }

    // Get color based on sentiment score
    const getSentimentColor = (score) => {
        if (score >= 0.5) return "bg-green-500"
        if (score >= 0.1) return "bg-green-400"
        if (score > -0.1) return "bg-gray-400"
        if (score > -0.5) return "bg-red-400"
        return "bg-red-500"
    }

    // Get text color based on sentiment score
    const getTextColor = (score) => {
        if (score >= 0.1) return "text-green-700"
        if (score <= -0.1) return "text-red-700"
        return "text-gray-700"
    }

    // Format the sentiment score as a percentage
    const getFormattedScore = (score) => {
        const absScore = Math.abs(score * 100)
        return `${absScore.toFixed(0)}%`
    }

    // Get sentiment label
    const getSentimentLabel = (score) => {
        if (score >= 0.5) return "Very Positive"
        if (score >= 0.1) return "Positive"
        if (score > -0.1) return "Neutral"
        if (score > -0.5) return "Negative"
        return "Very Negative"
    }

    // Determine the actual dominant sentiment category
    const getDominantSentimentCategory = () => {
        const { scores } = sentimentData;
        if (!scores) return "neutral";
        
        // Find the sentiment with the highest percentage
        const scoreEntries = Object.entries(scores);
        const highestEntry = scoreEntries.reduce((highest, current) => 
            current[1] > highest[1] ? current : highest, ["neutral", 0]);
            
        return highestEntry[0];
    }

    // Get appropriate description based on dominant sentiment and scores
    const getSentimentDescription = () => {
        const dominantCategory = getDominantSentimentCategory();
        const threshold = 0.6; // Threshold for considering a sentiment "predominant"
        
        if (dominantCategory === "neutral" && sentimentData.scores?.neutral > threshold) {
            return "This article has a mostly neutral tone.";
        } else if (dominantCategory === "positive" && sentimentData.scores?.positive > threshold) {
            return "This article has a predominantly positive tone.";
        } else if (dominantCategory === "negative" && sentimentData.scores?.negative > threshold) {
            return "This article has a predominantly negative tone.";
        } else if (dominantCategory === "mixed" && sentimentData.scores?.mixed > threshold) {
            return "This article has a highly mixed tone.";
        } else {
            // For cases without a clear predominant sentiment
            return "This article has a balanced tone with mixed sentiments.";
        }
    }

    return (
        <div className="bg-muted p-4 rounded-lg">
            <div className="text-lg font-semibold mb-3">Overall Sentiment</div>
            <div className="flex items-center gap-3 mb-3">
                {getSentimentIcon()}
                <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                        <span className={`font-medium ${getTextColor(sentimentData.sentiment_score)}`}>
                            {getSentimentLabel(sentimentData.sentiment_score)}
                        </span>
                        <span className="text-muted-foreground font-medium">
                            {getFormattedScore(sentimentData.sentiment_score)}
                        </span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className={`h-full ${getSentimentColor(sentimentData.sentiment_score)}`}
                            style={{
                                width: `${Math.min(Math.abs(sentimentData.sentiment_score * 100), 100)}%`,
                                transition: "width 1s ease-in-out",
                            }}
                        />
                    </div>
                </div>
            </div>
            <p className="text-sm text-muted-foreground">
                {getSentimentDescription()}
            </p>
        </div>
    )
}

// Component for displaying sentiment breakdown
function SentimentBreakdown({ sentimentData }) {
    if (!sentimentData || !sentimentData.scores) return null

    const { scores } = sentimentData

    // Custom progress bar with animation
    const AnimatedProgressBar = ({ value, className }) => (
        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
                className={`h-full ${className}`}
                style={{
                    width: `${Math.min(value, 100)}%`,
                    transition: "width 1s ease-in-out",
                }}
            />
        </div>
    )

    return (
        <div className="bg-muted p-4 rounded-lg">
            <div className="text-lg font-semibold mb-3">Sentiment Breakdown</div>
            <div className="space-y-4">
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-green-700">Positive</span>
                        <span className="text-muted-foreground">{(scores.positive * 100).toFixed(0)}%</span>
                    </div>
                    <AnimatedProgressBar value={scores.positive * 100} className="bg-green-500" />
                </div>

                <div>
                    <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-red-700">Negative</span>
                        <span className="text-muted-foreground">{(scores.negative * 100).toFixed(0)}%</span>
                    </div>
                    <AnimatedProgressBar value={scores.negative * 100} className="bg-red-500" />
                </div>

                <div>
                    <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-700">Neutral</span>
                        <span className="text-muted-foreground">{(scores.neutral * 100).toFixed(0)}%</span>
                    </div>
                    <AnimatedProgressBar value={scores.neutral * 100} className="bg-gray-500" />
                </div>

                <div>
                    <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-amber-700">Mixed</span>
                        <span className="text-muted-foreground">{(scores.mixed * 100).toFixed(0)}%</span>
                    </div>
                    <AnimatedProgressBar value={scores.mixed * 100} className="bg-amber-500" />
                </div>
            </div>
        </div>
    )
}

// Component for displaying key phrases
function KeyPhrases({ sentimentData }) {
    if (!sentimentData || !sentimentData.key_phrases || sentimentData.key_phrases.length === 0) {
        return null
    }

    return (
        <div className="bg-muted p-4 rounded-lg">
            <div className="text-lg font-semibold mb-3">Key Phrases</div>
            <div className="flex flex-wrap gap-2">
                {sentimentData.key_phrases.slice(0, 10).map((phrase, index) => (
                    <Badge key={index} variant="secondary" className="px-3 py-1 text-sm bg-background">
                        {phrase}
                    </Badge>
                ))}
            </div>
        </div>
    )
}
