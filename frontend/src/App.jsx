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
import { Label } from "@/components/ui/label"
import { RefreshCw, MoveRight, PhoneCall } from "lucide-react"
import { Button } from "@/components/ui/button"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Cookie helper functions
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

function setCookie(name, value, days = 7) {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value}; ${expires}; path=/`;
}

function HomePage() {
  return (
    <div className="w-full">
      <div className="container mx-auto">
        <div className="flex gap-8 py-20 lg:py-40 items-center justify-center flex-col">
          <div>
            <Button 
              variant="secondary" 
              size="sm" 
              className="gap-4"
              onClick={() => window.open('https://github.com/AazainKhan/IntelliFeed', '_blank')}
            >
              GitHub<MoveRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-4 flex-col">
            <h1 className="text-5xl md:text-7xl max-w-2xl tracking-tighter text-center font-regular">
              RSS feeds for the modern world
            </h1>
            <p className="text-lg md:text-xl leading-relaxed tracking-tight text-muted-foreground max-w-2xl text-center">
              IntelliFeed is a smart RSS feed reader that helps you stay updated with the latest news and articles from your favorite sources. 
            </p>
          </div>
          <div className="flex flex-row gap-3">
            <Button size="lg" className="gap-4" variant="outline">
              Jump on a call <PhoneCall className="w-4 h-4" />
            </Button>
            <Button size="lg" className="gap-4">
              Sign up here <MoveRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedSource, setSelectedSource] = useState(null)
  const [selectedArticle, setSelectedArticle] = useState(null)
  const [isDetailVisible, setIsDetailVisible] = useState(false)
  const [isDetailHovered, setIsDetailHovered] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false) // Default to closed
  const [sortOrder, setSortOrder] = useState("newest")
  const [currentRoute, setCurrentRoute] = useState("home") // Default to home route

  // Load sidebar state on initial render
  useEffect(() => {
    // Check if we have a saved sidebar state
    const savedState = getCookie('sidebar:state');
    if (savedState !== null) {
      setSidebarOpen(savedState === 'true');
    }
  }, []);

  // Handle sidebar state changes
  const handleSidebarOpenChange = (open) => {
    setSidebarOpen(open);
    setCookie('sidebar:state', String(open));
  };

  const handleHomeClick = useCallback(() => {
    setSelectedCategory(null)
    setSelectedSource(null)
    setCurrentRoute("home")
    setArticles([]) // Clear the articles array to show homepage
    
    // Close detail view when going to home
    setIsDetailVisible(false)
    setTimeout(() => {
      setSelectedArticle(null)
    }, 300)
  }, [])

  const onSourceClick = useCallback(async (category, sourceName, sourceTitle = null) => {
    setLoading(true)
    
    // For custom feeds, set the displayed source name as the title instead of the URL
    if (category === "Custom" && sourceTitle) {
      setSelectedSource(sourceTitle)
    } else {
      setSelectedSource(sourceName)
    }
    
    setSelectedCategory(category)
    setCurrentRoute("feeds")
  
    // Close detail view when changing source
    setIsDetailVisible(false)
    setTimeout(() => {
      setSelectedArticle(null)
    }, 300) // Match transition duration
  
    try {
      // Handle custom RSS feeds differently
      if (category === "Custom") {
        // For custom feeds, sourceName is the URL of the feed
        const response = await fetch(`http://localhost:8000/custom-feed`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            url: sourceName,
            title: sourceTitle || sourceName.split('//')[1]?.split('/')[0] || sourceName // Use provided title or domain as title
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch articles from custom feed (${response.status})`);
        }
        
        const data = await response.json();
        
        // Check if we actually got articles back
        if (data.articles && data.articles.length > 0) {
          setArticles(data.articles);
        } else {
          console.warn("No articles found in the feed response:", data);
          setArticles([]);
        }
      } else {
        // For regular category feeds
        const response = await fetch(`http://localhost:8000/feeds/${category}`)
        if (!response.ok) {
          throw new Error("Failed to fetch articles")
        }
        const data = await response.json()
        const filteredArticles = data.articles.filter((article) => article.source_name === sourceName)
        setArticles(filteredArticles)
      }
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

  const handleSortChange = (value) => {
    setSortOrder(value)
    let sortedArticles = [...articles]

    switch (value) {
      case "oldest":
        sortedArticles.sort((a, b) => new Date(a.published) - new Date(b.published));
        break
      case "newest":
        sortedArticles.sort((a, b) => new Date(b.published) - new Date(a.published));
        break
      case "alphabetical_a_z":
        sortedArticles.sort((a, b) => a.title.localeCompare(b.title))
        break
      case "alphabetical_z_a":
        sortedArticles.sort((a, b) => b.title.localeCompare(a.title))
        break
      default:
        break
    }

    setArticles(sortedArticles)
  }

  const refreshArticles = useCallback(async () => {
    setLoading(true)
    try {
      if (selectedCategory && selectedSource) {
        const response = await fetch(`http://localhost:8000/feeds/${selectedCategory}`)
        if (!response.ok) throw new Error("Failed to fetch articles")
        const data = await response.json()
        const filteredArticles = data.articles.filter(
          (article) => article.source_name === selectedSource
        )
        setArticles(filteredArticles)
      }
    } catch (error) {
      console.error("Error fetching articles:", error)
      setArticles([])
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, selectedSource])

  return (
    <ThemeProvider>
      <SidebarProvider 
        defaultOpen={sidebarOpen} 
        open={sidebarOpen} 
        onOpenChange={handleSidebarOpenChange}
      >
        <AppSidebar 
          onSourceClick={onSourceClick} 
          onHomeClick={handleHomeClick}
          currentRoute={currentRoute}
        />
        <SidebarInset>
          <header className="flex sticky top-0 z-10 bg-background h-16 shrink-0 items-center px-4 border-b">
            <div className="flex items-center gap-2 flex-1">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              {currentRoute !== "home" && (
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href="#" onClick={handleHomeClick}>Home</BreadcrumbLink>
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
              )}
            </div>
            
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <a href="#" onClick={(e) => {e.preventDefault(); handleHomeClick();}} className="flex items-center hover:opacity-80 transition-opacity">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-1"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                  <path d="M2 17l10 5 10-5"></path>
                  <path d="M2 12l10 5 10-5"></path>
                </svg>
                <span className="font-bold text-lg">IntelliFeed</span>
              </a>
            </div>
            
            <div className="flex justify-end flex-1">
              <ModeToggle />
            </div>
          </header>

          <div className="flex flex-1 flex-row gap-4 p-4 overflow-hidden">
            {/* Articles list column - now 30% width when detail is open */}
            <div
              className={`flex flex-col gap-4 overflow-auto transition-all duration-300 ease-in-out ${
                selectedArticle ? (isDetailVisible ? "w-[30%]" : "w-full") : "w-full"
              } ${selectedArticle && isDetailHovered ? "blur-sm" : ""}`}
            >
              {!loading && articles.length > 0 && (
                <div className="flex justify-between items-center mb-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="sort">Sort by:</Label>
                    <Select value={sortOrder} onValueChange={handleSortChange}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Newest" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest to Oldest</SelectItem>
                        <SelectItem value="oldest">Oldest to Newest</SelectItem>
                        <SelectItem value="alphabetical_a_z">Alphabetical (A-Z)</SelectItem>
                        <SelectItem value="alphabetical_z_a">Alphabetical (Z-A)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <button
                    type="button"
                    onClick={refreshArticles}
                    className="px-4 py-2 border rounded"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              )}
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
                <HomePage />
              )}
            </div>

            {/* Article detail column - now 70% width when open with dynamic height */}
            {selectedArticle && (
              <div
                className={`border-l overflow-auto transition-all duration-300 ease-in-out ${
                  isDetailVisible ? "w-[70%] opacity-100 translate-x-0" : "w-0 opacity-0 translate-x-20"
                }`}
                onMouseEnter={handleDetailMouseEnter}
                onMouseLeave={handleDetailMouseLeave}
              >
                <div className="pl-4">
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
