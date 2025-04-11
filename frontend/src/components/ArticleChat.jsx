"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X, Send, Square, ChevronDown } from "lucide-react"
import { PromptInput, PromptInputTextarea, PromptInputActions, PromptInputAction } from "@/components/ui/prompt-input"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"

// Available model options
const AI_MODELS = [
    { id: "default", name: "Default (Mistral)" },
    { id: "small", name: "Small (Faster)" },
    { id: "large", name: "Large (Better)" },
]

export function ArticleChat({ article, articleText, onClose, isVisible }) {
    const [messages, setMessages] = useState([
        {
            role: "system",
            content: "I'm an AI assistant that can help answer questions about this article.",
        },
    ])
    const [inputMessage, setInputMessage] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isFirstRequest, setIsFirstRequest] = useState(true)
    const [isTyping, setIsTyping] = useState(false)
    const [currentTypingMessage, setCurrentTypingMessage] = useState("")
    const [typingIndex, setTypingIndex] = useState(0)
    const [selectedModel, setSelectedModel] = useState("default")
    const inputRef = useRef(null)
    const scrollAreaRef = useRef(null)
    const abortControllerRef = useRef(null)

    // Focus input when chat opens
    useEffect(() => {
        if (isVisible && inputRef.current) {
            setTimeout(() => {
                inputRef.current.focus()
            }, 300)
        }
    }, [isVisible])

    // Add initial context message when article changes
    useEffect(() => {
        if (article && articleText) {
            // Reset messages when article changes
            setMessages([
                {
                    role: "system",
                    content: "I'm an AI assistant that can help answer questions about this article.",
                },
                {
                    role: "assistant",
                    content: `I'm ready to discuss the article "${article.title}". What would you like to know about it?`,
                },
            ])
            setIsFirstRequest(true)
        }
    }, [article, articleText])

    // Clean up abort controller on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
        }
    }, [])

    // Handle typing animation
    useEffect(() => {
        if (isTyping && currentTypingMessage) {
            // Much slower typing speed - 1 to 3 characters per tick for more natural effect
            const typingSpeed = Math.floor(Math.random() * 2) + 5

            if (typingIndex < currentTypingMessage.length) {
                // Add variable timing to simulate human typing (30-90ms between characters)
                const randomDelay = Math.floor(Math.random() * 10) + 30 // to speed up the typing change the range from 60 to 10

                const timer = setTimeout(() => {
                    // For a smoother experience, add characters incrementally
                    setTypingIndex((prev) => Math.min(prev + typingSpeed, currentTypingMessage.length))
                }, randomDelay)

                return () => clearTimeout(timer)
            } else {
                // Typing animation complete
                // Add a small pause at the end to make it feel like the message is "complete"
                const completeTimer = setTimeout(() => {
                    setMessages((prev) => {
                        const filtered = prev.filter((msg) => !msg.isLoading && !msg.isTyping)
                        return [...filtered, { role: "assistant", content: currentTypingMessage }]
                    })
                    setIsTyping(false)
                    setCurrentTypingMessage("")
                    setTypingIndex(0)
                    setIsLoading(false) // Add this line to ensure loading indicators are removed
                }, 300) // Pause for 300ms when done typing

                return () => clearTimeout(completeTimer)
            }
        }
    }, [isTyping, currentTypingMessage, typingIndex])

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight
            }
        }
    }, [messages, typingIndex])

    const stopGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
        }
        
        // Remove loading messages and add a notice
        setMessages((prev) => {
            const filtered = prev.filter((msg) => !msg.isLoading && !msg.isTyping)
            return [
                ...filtered,
                {
                    role: "assistant",
                    content: "Generation stopped.",
                },
            ]
        })
        
        setIsLoading(false)
        setIsTyping(false)
        setCurrentTypingMessage("")
        setTypingIndex(0)
    }

    const handleSendMessage = async (e) => {
        // Prevent form submission from scrolling the page
        if (e) e.preventDefault()

        // If we're loading, this should act as a stop button
        if (isLoading) {
            stopGeneration()
            return
        }

        if (!inputMessage.trim()) return

        const userMessage = {
            role: "user",
            content: inputMessage,
        }

        // Add user message to chat
        setMessages((prev) => [...prev, userMessage])
        setInputMessage("")
        setIsLoading(true)

        // Show a special loading message for the first request
        if (isFirstRequest) {
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: "Thinking...",
                    isLoading: true,
                },
            ])
            setIsFirstRequest(false)
        }

        try {
            // Create a new AbortController for this request
            abortControllerRef.current = new AbortController()
            const signal = abortControllerRef.current.signal
            
            // Call the backend API
            const response = await fetch("http://localhost:8000/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages: [...messages, userMessage],
                    article_text: articleText,
                    article_title: article.title,
                    model: selectedModel, // Include selected model in API request
                }),
                signal, // Add the abort signal
            })

            if (!response.ok) {
                throw new Error(`Failed to get response from AI: ${response.status}`)
            }

            const data = await response.json()

            if (data.success) {
                // Remove loading messages and start typing animation
                setMessages((prev) => prev.filter((msg) => !msg.isLoading))
                // Start typing animation with a small delay to make it feel more natural
                setTimeout(() => {
                    setCurrentTypingMessage(data.message)
                    setTypingIndex(0)
                    setIsTyping(true)
                    // Add a temporary typing message
                    setMessages((prev) => [
                        ...prev,
                        {
                            role: "assistant",
                            content: "",
                            isTyping: true,
                        },
                    ])
                }, 500) // Wait 500ms before starting to type
            } else {
                throw new Error(data.error || "Unknown error")
            }
        } catch (error) {
            // Don't show error if it was an abort
            if (error.name === 'AbortError') {
                return
            }
            
            console.error("Error getting AI response:", error)
            // Remove any loading messages and add the error message
            setMessages((prev) => {
                const filtered = prev.filter((msg) => !msg.isLoading)
                return [
                    ...filtered,
                    {
                        role: "assistant",
                        content: "I'm sorry, I encountered an error while processing your request. Please try again.",
                    },
                ]
            })
        } finally {
            if (!signal?.aborted) {
                setIsLoading(false)
                abortControllerRef.current = null
            }
        }
    }

    // Handle click on send/stop button
    const handleButtonClick = () => {
        if (isLoading) {
            stopGeneration()
        } else {
            handleSendMessage()
        }
    }

    return (
        <Card
            className={`shadow-md flex flex-col h-[700px] resize-y overflow-auto ${isVisible ? "opacity-100" : "opacity-0"}`}
        >
            <CardHeader className="sticky top-0 bg-card z-10 border-b px-4 py-3 flex-shrink-0">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-xl font-bold">Chat with AI</CardTitle>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close chat</span>
                    </Button>
                </div>
                <CardDescription>Ask questions about this article</CardDescription>
            </CardHeader>

            <div className="flex-grow overflow-hidden relative">
                <ScrollArea ref={scrollAreaRef} className="absolute inset-0 p-4 h-full">
                    <div className="space-y-4 pb-2">
                        {messages
                            .filter((msg) => msg.role !== "system" && !msg.isLoading && !msg.isTyping)
                            .map((message, index) => (
                                <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                                    <div
                                        className={`max-w-[80%] rounded-lg px-3 py-2 ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                                    >
                                        {message.content}
                                    </div>
                                </div>
                            ))}

                        {/* Show typing animation for the current message */}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="max-w-[80%] rounded-lg px-3 py-2 bg-muted">
                                    {currentTypingMessage.slice(0, typingIndex)}
                                    {typingIndex < currentTypingMessage.length && (
                                        <span className="inline-block w-1 h-4 ml-0.5 bg-current animate-pulse"></span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Show loading messages */}
                        {messages
                            .filter((msg) => msg.isLoading)
                            .map((message, index) => (
                                <div key={`loading-${index}`} className="flex justify-start">
                                    <div className="max-w-[80%] rounded-lg px-3 py-2 bg-muted">
                                        <div>{message.content}</div>
                                        <div className="flex items-center space-x-2 mt-2">
                                            <div className="h-2 w-2 rounded-full bg-current animate-bounce [animation-delay:-0.3s]"></div>
                                            <div className="h-2 w-2 rounded-full bg-current animate-bounce [animation-delay:-0.15s]"></div>
                                            <div className="h-2 w-2 rounded-full bg-current animate-bounce"></div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                        {/* Show general loading indicator */}
                        {isLoading && !messages.some((msg) => msg.isLoading) && (
                            <div className="flex justify-start">
                                <div className="max-w-[80%] rounded-lg px-3 py-2 bg-muted">
                                    <div className="flex items-center space-x-2">
                                        <div className="h-2 w-2 rounded-full bg-current animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="h-2 w-2 rounded-full bg-current animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="h-2 w-2 rounded-full bg-current animate-bounce"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            <CardFooter className="border-t p-4 mt-auto flex-shrink-0">
                <PromptInput
                    value={inputMessage}
                    onValueChange={setInputMessage}
                    isLoading={isLoading}
                    onSubmit={handleSendMessage}
                    className="w-full"
                >
                    <PromptInputTextarea placeholder="Type your message..." ref={inputRef} />
                    <PromptInputActions className="justify-end pt-2">
                        {/* Model selection dropdown */}
                        <PromptInputAction>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="h-8 gap-1 text-xs flex items-center"
                                        disabled={isLoading}
                                    >
                                        {AI_MODELS.find(model => model.id === selectedModel)?.name || "Default"}
                                        <ChevronDown className="h-3 w-3 opacity-50" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {AI_MODELS.map(model => (
                                        <DropdownMenuItem 
                                            key={model.id} 
                                            onClick={() => setSelectedModel(model.id)}
                                            className={selectedModel === model.id ? "bg-accent font-medium" : ""}
                                        >
                                            {model.name}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </PromptInputAction>
                        
                        <PromptInputAction tooltip={isLoading ? "Stop generation" : "Send message"}>
                            <Button
                                type="button"
                                variant="default"
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                disabled={!isLoading && !inputMessage.trim()}
                                onClick={handleButtonClick}
                            >
                                {isLoading ? <Square className="h-4 w-4 fill-current" /> : <Send className="h-4 w-4" />}
                                <span className="sr-only">{isLoading ? "Stop generation" : "Send message"}</span>
                            </Button>
                        </PromptInputAction>
                    </PromptInputActions>
                </PromptInput>
            </CardFooter>
        </Card>
    )
}
