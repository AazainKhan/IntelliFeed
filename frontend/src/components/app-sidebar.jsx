import * as React from "react";
import { useState, useEffect, useRef } from "react"; // Import useState, useEffect, useRef
import { ChevronRight } from "lucide-react";
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
} from "@/components/ui/sidebar";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import useFetchCategories from "@/hooks/useFetchCategories";

export function AppSidebar({ onSourceClick, ...props }) {
    const { categories, loading, error } = useFetchCategories('http://localhost:8000/categories');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [searchTerm, setSearchTerm] = useState(""); // Add searchTerm state
    const searchInputRef = useRef(null); // Add useRef

    const handleSourceClick = (category, sourceName) => {
        setSelectedCategory(category);
        onSourceClick(category, sourceName);
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
        <Sidebar {...props}>
            <SidebarHeader>
                <SearchForm  // Use the SearchForm component
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </SidebarHeader>
            <SidebarContent className="gap-0">
                {filteredCategories.map(([category, sources]) => (
                    <Collapsible
                        key={category}
                        title={category}
                        defaultOpen
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
            </SidebarContent>
            <SidebarRail />
        </Sidebar>
    );
}