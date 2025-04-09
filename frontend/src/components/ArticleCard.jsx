"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

function timeAgo(dateString) {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now - date) / 1000)
    let interval = Math.floor(seconds / 31536000)

    if (interval > 1) {
        return `${interval} years ago`
    }
    interval = Math.floor(seconds / 2592000)
    if (interval > 1) {
        return `${interval} months ago`
    }
    interval = Math.floor(seconds / 86400)
    if (interval > 1) {
        return `${interval} days ago`
    }
    interval = Math.floor(seconds / 3600)
    if (interval >= 1) {
        return `${interval} hour${interval === 1 ? "" : "s"} ago`
    }
    interval = Math.floor(seconds / 60)
    if (interval >= 1) {
        return `${interval} minute${interval === 1 ? "" : "s"} ago`
    }
    return `${Math.floor(seconds)} second${Math.floor(seconds) === 1 ? "" : "s"} ago`
}

export function ArticleCard({ article, onArticleClick }) {
    const [imageUrl, setImageUrl] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [imageError, setImageError] = useState(false)

    useEffect(() => {
        // Fetch the article preview to get the image URL
        if (article && article.link) {
            setIsLoading(true)
            fetch("http://localhost:8000/article", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ url: article.link }),
            })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error("Failed to fetch article preview")
                    }
                    return response.json()
                })
                .then((data) => {
                    if (data.top_image) {
                        setImageUrl(data.top_image)
                    }
                    setIsLoading(false)
                })
                .catch((err) => {
                    console.error("Error fetching article preview:", err)
                    setIsLoading(false)
                })
        }
    }, [article])

    const handleImageError = () => {
        setImageError(true)
    }

    return (
        <Card className="shadow-md transition-all duration-200 hover:shadow-lg">
            <CardHeader>
                <CardTitle
                    className="cursor-pointer transition-all duration-200 hover:underline hover:text-primary"
                    onClick={() => onArticleClick(article)}
                >
                    {article.title}
                </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
                <div className="flex flex-row gap-4">
                    {/* Image on the left */}
                    <div className="flex-shrink-0 w-24 h-24 md:w-32 md:h-32 relative overflow-hidden rounded-md">
                        {isLoading ? (
                            <Skeleton className="w-full h-full" />
                        ) : imageUrl && !imageError ? (
                            <img
                                src={imageUrl || "/placeholder.svg"}
                                alt={article.title}
                                className="w-full h-full object-cover"
                                onError={handleImageError}
                            />
                        ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-xs">
                                No image
                            </div>
                        )}
                    </div>

                    {/* Summary on the right */}
                    <div className="flex-1">
                        <p className="text-muted-foreground text-sm line-clamp-2 md:line-clamp-6">
                          {article.summary}
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <Badge variant="secondary">{article.category}</Badge>
                    <span className="text-xs text-muted-foreground">
                        {new Date(article.published).toLocaleDateString()} ({timeAgo(article.published)})
                    </span>
                </div>
            </CardContent>
        </Card>
    )
}

export function ArticleSkeleton() {
    return (
        <Card className="shadow-md">
            <CardHeader>
                <Skeleton className="h-8 w-3/4" />
            </CardHeader>
            <CardContent className="grid gap-4">
                <div className="flex flex-row gap-4">
                    {/* Image skeleton */}
                    <Skeleton className="flex-shrink-0 w-24 h-24 md:w-32 md:h-32 rounded-md" />

                    {/* Summary skeleton */}
                    <div className="flex-1">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full mt-2" />
                        <Skeleton className="h-4 w-1/2 mt-2" />
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <Skeleton className="h-6 w-12" />
                    <Skeleton className="h-4 w-20" />
                </div>
            </CardContent>
        </Card>
    )
}
