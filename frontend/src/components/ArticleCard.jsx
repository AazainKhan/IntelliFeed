"use client"

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
                <p className="text-muted-foreground text-sm">{article.summary}</p>
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
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex items-center space-x-2">
                    <Skeleton className="h-6 w-12" />
                    <Skeleton className="h-4 w-20" />
                </div>
            </CardContent>
        </Card>
    )
}
