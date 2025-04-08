"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { X } from "lucide-react"

export function ArticleDetail({ article, onClose }) {
    const [isContentVisible, setIsContentVisible] = useState(false)
    const [articleContent, setArticleContent] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        // Trigger content fade-in animation after component mounts
        const timer = setTimeout(() => {
            setIsContentVisible(true)
        }, 100)

        return () => clearTimeout(timer)
    }, [])

    useEffect(() => {
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
                })
                .catch((err) => {
                    console.error("Error fetching article content:", err)
                    setError("Could not load the full article. Please try again later.")
                    setIsLoading(false)
                })
        }
    }, [article])

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
                className={`pt-2 transition-all duration-300 ease-in-out ${isContentVisible ? "opacity-100" : "opacity-0"}`}
            >
                <div className="mb-6">
                    <Badge variant="secondary">{article.category}</Badge>
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
                        <div dangerouslySetInnerHTML={{ __html: articleContent.content }} />
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
