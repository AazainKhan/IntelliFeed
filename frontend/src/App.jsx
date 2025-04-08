"use client"

import { useState, useEffect, useCallback } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { ModeToggle } from "@/components/mode-toggle"
import { ThemeProvider } from "@/components/theme-provider"
import { ArticleCard, ArticleSkeleton } from "@/components/ArticleCard"
import { ArticleDetail } from "@/components/ArticleDetail"

function App() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedSource, setSelectedSource] = useState(null)
  const [selectedArticle, setSelectedArticle] = useState(null)
  const [isDetailVisible, setIsDetailVisible] = useState(false)
  const [isDetailHovered, setIsDetailHovered] = useState(false)

  const onSourceClick = useCallback(async (category, sourceName) => {
    setLoading(true)
    setSelectedCategory(category)
    setSelectedSource(sourceName)

    // Close detail view when changing source
    setIsDetailVisible(false)
    setTimeout(() => {
      setSelectedArticle(null)
    }, 300) // Match transition duration

    try {
      const response = await fetch(`http://localhost:8000/feeds/${category}`)
      if (!response.ok) {
        throw new Error("Failed to fetch articles")
      }
      const data = await response.json()
      const filteredArticles = data.articles.filter((article) => article.source_name === sourceName)
      setArticles(filteredArticles)
    } catch (error) {
      console.error("Error fetching articles:", error)
      setArticles([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleArticleClick = useCallback((article) => {
    setSelectedArticle(article)
    // Delay setting visibility to true for animation
    setTimeout(() => {
      setIsDetailVisible(true)
    }, 50)
  }, [])

  const closeArticleDetail = useCallback(() => {
    setIsDetailVisible(false)
    // Delay removing the article to allow animation to complete
    setTimeout(() => {
      setSelectedArticle(null)
    }, 300) // Match transition duration
  }, [])

  const handleDetailMouseEnter = useCallback(() => {
    setIsDetailHovered(true)
  }, [])

  const handleDetailMouseLeave = useCallback(() => {
    setIsDetailHovered(false)
  }, [])

  useEffect(() => {
    if (selectedCategory && !loading && articles.length === 0 && selectedSource) {
      setSelectedSource(null)
    }
  }, [selectedCategory, loading, articles.length, selectedSource])

  return (
    <ThemeProvider>
      <SidebarProvider>
        <AppSidebar onSourceClick={onSourceClick} />
        <SidebarInset>
          <header className="flex sticky top-0 z-10 bg-background h-16 shrink-0 items-center justify-between gap-2 border-b px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="#">Home</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  {selectedCategory && (
                    <>
                      <BreadcrumbItem className="hidden md:block">
                        <BreadcrumbLink href="#">{selectedCategory}</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator className="hidden md:block" />
                    </>
                  )}
                  {selectedSource && (
                    <BreadcrumbItem>
                      <BreadcrumbPage>{selectedSource}</BreadcrumbPage>
                    </BreadcrumbItem>
                  )}
                  {!selectedCategory && (
                    <BreadcrumbItem>
                      <BreadcrumbPage>Select a Category</BreadcrumbPage>
                    </BreadcrumbItem>
                  )}
                  {selectedCategory && !selectedSource && (
                    <BreadcrumbItem>
                      <BreadcrumbPage>Select a Source</BreadcrumbPage>
                    </BreadcrumbItem>
                  )}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <ModeToggle />
          </header>

          <div className="flex flex-1 flex-row gap-4 p-4 overflow-hidden">
            {/* Articles list column - now 30% width when detail is open */}
            <div
              className={`flex flex-col gap-4 overflow-auto transition-all duration-300 ease-in-out ${
                selectedArticle ? (isDetailVisible ? "w-[30%]" : "w-full") : "w-full"
              } ${isDetailHovered ? "blur-sm" : ""}`}
            >
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => <ArticleSkeleton key={index} />)
              ) : articles.length > 0 ? (
                articles.map((article, index) => (
                  <ArticleCard
                    key={`${article.source_name}-${article.title}-${index}`}
                    article={article}
                    onArticleClick={handleArticleClick}
                  />
                ))
              ) : selectedCategory && selectedSource ? (
                <div>
                  No articles found for {selectedSource} in {selectedCategory}.
                </div>
              ) : selectedCategory ? (
                <div>Select a source in {selectedCategory} to view articles.</div>
              ) : (
                <div>Select a category to view news sources.</div>
              )}
            </div>

            {/* Article detail column - now 70% width when open */}
            {selectedArticle && (
              <div
                className={`border-l overflow-hidden transition-all duration-300 ease-in-out ${
                  isDetailVisible ? "w-[70%] opacity-100 translate-x-0" : "w-0 opacity-0 translate-x-20"
                }`}
                onMouseEnter={handleDetailMouseEnter}
                onMouseLeave={handleDetailMouseLeave}
              >
                <div className="pl-4 h-full">
                  <ArticleDetail article={selectedArticle} onClose={closeArticleDetail} />
                </div>
              </div>
            )}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  )
}

export default App
