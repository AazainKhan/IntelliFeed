import * as React from "react";
import { useState, useEffect, useRef } from "react"; // Import useState, useEffect, useRef
import { ChevronRight, Home, Plus, X } from "lucide-react";
import { SearchForm } from "@/components/search-form";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    SidebarSeparator,
} from "@/components/ui/sidebar";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useFetchCategories from "@/hooks/useFetchCategories";

export function AppSidebar({ onSourceClick, onHomeClick, currentRoute = "home", ...props }) {
    const { categories, loading, error } = useFetchCategories('http://localhost:8000/categories');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [searchTerm, setSearchTerm] = useState(""); // Add searchTerm state
    const searchInputRef = useRef(null); // Add useRef
    const [customRSSLink, setCustomRSSLink] = useState("");
    const [customRSSTitle, setCustomRSSTitle] = useState(""); // Add title state
    const [customRSSFeeds, setCustomRSSFeeds] = useState([]);
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [formError, setFormError] = useState(""); // Add error state for form validation

    // Load saved custom feeds from localStorage when component mounts
    useEffect(() => {
        const savedFeeds = localStorage.getItem('intellifeed_custom_rss');
        if (savedFeeds) {
            try {
                setCustomRSSFeeds(JSON.parse(savedFeeds));
            } catch (err) {
                console.error("Error parsing saved RSS feeds:", err);
            }
        }
    }, []);

    // Save custom feeds to localStorage whenever they change
    useEffect(() => {
        if (customRSSFeeds.length > 0) {
            localStorage.setItem('intellifeed_custom_rss', JSON.stringify(customRSSFeeds));
        }
    }, [customRSSFeeds]);

    // Add an event listener to refresh custom feeds when they change
    useEffect(() => {
        const handleCustomFeedsUpdate = () => {
            const savedFeeds = localStorage.getItem('intellifeed_custom_rss');
            if (savedFeeds) {
                try {
                    setCustomRSSFeeds(JSON.parse(savedFeeds));
                } catch (err) {
                    console.error("Error parsing saved RSS feeds:", err);
                }
            }
        };

        // Listen for the custom event
        window.addEventListener('custom-feeds-updated', handleCustomFeedsUpdate);

        // Clean up on unmount
        return () => {
            window.removeEventListener('custom-feeds-updated', handleCustomFeedsUpdate);
        };
    }, []);

    const handleSourceClick = (category, sourceName, sourceTitle = null) => {
        setSelectedCategory(category);
        onSourceClick(category, sourceName, sourceTitle);
    };

    const handleHomeClick = () => {
        // Handle home navigation logic
        setSelectedCategory(null);
        onHomeClick ? onHomeClick() : onSourceClick(null, null);
    };

    const handleAddRSSFeed = () => {
        // Reset any previous error
        setFormError("");
        
        // Validate both fields
        if (!customRSSTitle.trim()) {
            setFormError("Please enter a title for the feed");
            return;
        }
        
        if (!customRSSLink.trim()) {
            setFormError("Please enter a valid RSS URL");
            return;
        }

        // Make sure URL starts with http:// or https://
        let processedUrl = customRSSLink;
        if (!processedUrl.startsWith('http://') && !processedUrl.startsWith('https://')) {
            processedUrl = 'https://' + processedUrl;
        }
        
        // Check if feed with same URL already exists
        if (customRSSFeeds.some(feed => feed.url === processedUrl)) {
            setFormError("This RSS feed URL already exists");
            return;
        }

        // Add new feed with both title and URL
        setCustomRSSFeeds([...customRSSFeeds, { 
            title: customRSSTitle,
            url: processedUrl
        }]);
        
        // Reset form fields
        setCustomRSSTitle("");
        setCustomRSSLink("");
        setPopoverOpen(false);
    };

    // Focus on the search input when the component loads
    useEffect(() => {
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error.message}</div>;
    }

    // Filter categories and sources based on searchTerm
    const filteredCategories = Object.entries(categories)
        .map(([category, sources]) => {
            const filteredSources = sources.filter(source =>
                source.source_name.toLowerCase().includes(searchTerm.toLowerCase())
            );
            if (filteredSources.length > 0 || category.toLowerCase().includes(searchTerm.toLowerCase())) {
                return [category, filteredSources];
            }
            return null;
        })
        .filter(Boolean); // Remove null entries

    return (
        <Sidebar {...props} className="overflow-x-hidden">
            <SidebarHeader>
                {/* Search form moved below */}
            </SidebarHeader>
            <SidebarContent className="gap-0 overflow-x-hidden">
                {/* Navigation Items */}
                <SidebarGroup>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton 
                                asChild 
                                onClick={handleHomeClick}
                                className={currentRoute === "home" ? "bg-accent text-accent-foreground" : ""}
                            >
                                <button className="flex items-center gap-2">
                                    <Home size={16} />
                                    Home
                                </button>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        {/* Removed Dashboard menu item */}
                    </SidebarMenu>
                </SidebarGroup>
                
                <SidebarSeparator className="my-2" />
                
                {/* Categories heading */}
                <div className="px-4 py-1">
                    <span className="font-bold text-base">Categories</span>
                </div>
                
                {/* Search bar now placed below Categories heading */}
                <div className="px-2 py-2">
                    <SearchForm
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full max-w-full" 
                    />
                </div>
                
                {/* Categories Section */}
                {filteredCategories.map(([category, sources]) => (
                    <Collapsible
                        key={category}
                        title={category}
                        defaultOpen={false}
                        className="group/collapsible"
                    >
                        <SidebarGroup>
                            <SidebarGroupLabel
                                asChild
                                className="group/label text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sm"
                            >
                                <CollapsibleTrigger>
                                    {category}{" "}
                                    <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                </CollapsibleTrigger>
                            </SidebarGroupLabel>
                            <CollapsibleContent>
                                <SidebarGroupContent>
                                    <SidebarMenu>
                                        {sources.map((source) => (
                                            <SidebarMenuItem key={source.source_name}>
                                                <SidebarMenuButton asChild>
                                                    <button onClick={() => handleSourceClick(category, source.source_name)}>
                                                        {source.source_name}
                                                    </button>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        ))}
                                    </SidebarMenu>
                                </SidebarGroupContent>
                            </CollapsibleContent>
                        </SidebarGroup>
                    </Collapsible>
                ))}
                
                {/* Add horizontal separator and Custom RSS section */}
                <SidebarSeparator className="my-2" />
                
                {/* Custom RSS heading and add button */}
                <div className="px-4 py-1 flex justify-between items-center">
                    <span className="font-bold text-base">Custom RSS</span>
                    
                    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Plus size={16} />
                                <span className="sr-only">Add RSS Feed</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4" side="right">
                            <div className="space-y-2">
                                <h4 className="font-medium leading-none">Add RSS Feed</h4>
                                <p className="text-sm text-muted-foreground">
                                    Enter a title and URL for the RSS feed
                                </p>
                                <div className="flex flex-col gap-2">
                                    <div className="space-y-1">
                                        <label htmlFor="feedTitle" className="text-xs font-medium">
                                            Title
                                        </label>
                                        <Input 
                                            id="feedTitle"
                                            placeholder="My Feed Title" 
                                            value={customRSSTitle}
                                            onChange={(e) => setCustomRSSTitle(e.target.value)}
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="feedUrl" className="text-xs font-medium">
                                            URL
                                        </label>
                                        <Input 
                                            id="feedUrl"
                                            placeholder="https://example.com/feed.xml" 
                                            value={customRSSLink}
                                            onChange={(e) => setCustomRSSLink(e.target.value)}
                                            className="w-full"
                                        />
                                    </div>
                                    {formError && (
                                        <p className="text-sm text-destructive">{formError}</p>
                                    )}
                                    <Button 
                                        onClick={handleAddRSSFeed} 
                                        className="w-full mt-2"
                                    >
                                        Add Feed
                                    </Button>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
                
                {/* Display custom RSS feeds - fixed button nesting issue */}
                {customRSSFeeds.length > 0 && (
                    <SidebarGroup>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {customRSSFeeds.map((feed, index) => (
                                    <SidebarMenuItem key={`custom-${index}`}>
                                        <div className="flex justify-between items-center w-full">
                                            <SidebarMenuButton 
                                                asChild 
                                                className="flex-1 overflow-hidden"
                                            >
                                                <button 
                                                    onClick={() => handleSourceClick("Custom", feed.url, feed.title)}
                                                    title={feed.url}
                                                >
                                                    <span className="truncate">{feed.title}</span>
                                                </button>
                                            </SidebarMenuButton>
                                            
                                            <button 
                                                className="opacity-0 group-hover/menu-item:opacity-100 text-destructive hover:bg-destructive/10 rounded p-1 flex-shrink-0 mr-2"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const newFeeds = customRSSFeeds.filter((_, i) => i !== index);
                                                    setCustomRSSFeeds(newFeeds);
                                                    localStorage.setItem('intellifeed_custom_rss', JSON.stringify(newFeeds));
                                                }}
                                                title="Remove feed"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                )}
            </SidebarContent>
            <SidebarRail />
        </Sidebar>
    );
}