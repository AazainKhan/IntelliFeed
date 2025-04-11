from chalice import Chalice
import json
import feedparser
import logging
import uuid
import re
import requests
import hashlib
from bs4 import BeautifulSoup
from newspaper import Article
import time
import boto3
import base64
from botocore.exceptions import ClientError
import os
from dotenv import load_dotenv, find_dotenv

dotenv_path = find_dotenv()
load_dotenv(dotenv_path)

app = Chalice(app_name='backend')
app.debug = True
app.api.cors = True

# Initialize AWS clients
polly_client = boto3.client('polly')
translate_client = boto3.client('translate')

# Initialize Hugging Face API key from env file
HF_API_KEY = os.getenv('HF_API_KEY')

# Free tier models that work well for chat
HF_MODELS = {
    "default": "mistralai/Mistral-7B-Instruct-v0.2",  # Good balance of quality and speed
    "small": "google/flan-t5-base",                   # Faster but less capable
    "large": "meta-llama/Llama-2-7b-chat-hf"          # More capable but slower
}

# Choose which model to use
DEFAULT_MODEL = HF_MODELS["default"]

# Simple in-memory cache for responses
response_cache = {}

# --- Load Categories from JSON ---
def load_categories():
    try:
        with open('rss_feeds.json', 'r') as f:
            data = json.load(f)
        return data
    except FileNotFoundError:
        app.log.error("rss_feeds.json not found")
        return None
    except json.JSONDecodeError:
        app.log.error("Invalid JSON format in rss_feeds.json")
        return None

# --- API Endpoints ---
@app.route('/categories')
def get_categories():
    """
    Returns the list of news categories and sources.
    This does NOT include the actual news articles.
    """
    categories = load_categories()
    if categories:
        # Structure the response to match what the frontend expects
        response = {}
        for category, sources in categories.items():
            response[category] = [{"source_name": source["source_name"]} for source in sources]
        return response
    else:
        return {"error": "Could not load categories"}, 500

@app.route('/feeds/{category}')
def get_feeds(category):
    """
    Fetches and returns the latest news feeds for a given category.
    """
    categories = load_categories()
    if not categories:
        return {"error": "Could not load categories"}, 500
    if category not in categories:
        return {"error": "Category not found"}, 404

    all_articles = []
    for source in categories[category]:
        try:
            feed = feedparser.parse(source["source_link"])
            for entry in feed.entries:
                article_id = str(uuid.uuid4())

                # Clean the title
                title = entry.title
                if title:
                    title = title.replace("&#8220;", "\"")
                    title = title.replace("&#8221;", "\"")
                    title = title.replace("&#8217;", "'")
                    title = title.replace("&#8230;", "...")
                    title = re.sub(r'\[\s*\.\.\.\s*\]$', '', title)
                    title = re.sub(r'<[^>]*?>', '', title)

                # Clean the summary
                summary = entry.summary if hasattr(entry, 'summary') else None
                if summary:
                    summary = summary.replace("&#8220;", "\"")
                    summary = summary.replace("&#8221;", "\"")
                    summary = summary.replace("&#8217;", "'")
                    summary = summary.replace("&#8230;", "...")
                    summary = re.sub(r'\[\s*\.\.\.\s*\]$', '', summary)
                    summary = re.sub(r'<[^>]*?>', '', summary)
                    summary += "..."

                article = {
                    "id": article_id,
                    "category": category,
                    "source_name": source["source_name"],
                    "title": title,
                    "link": entry.link,
                    "summary": summary,
                    "published": entry.published if hasattr(entry, 'published') else None
                }
                all_articles.append(article)
        except Exception as e:
            app.log.error(f"Error fetching feed from {source['source_link']}: {e}")
            # Consider: You might want to handle errors more granularly
            # and perhaps return a partial list of articles.

    return {"category": category, "articles": all_articles}

@app.route('/article', methods=['POST'])
def get_article_content():
    """
    Scrapes and returns the full content of an article given its URL.
    """
    request_body = app.current_request.json_body
    if not request_body or 'url' not in request_body:
        return {"error": "URL is required"}, 400

    url = request_body['url']

    try:
        # Use newspaper3k to extract article content
        article = Article(url)
        article.download()
        # Add a small delay to ensure download completes
        time.sleep(1)
        article.parse()

        # Get the main image if available
        top_image = article.top_image if hasattr(article, 'top_image') else None

        # Format the article content as HTML, but don't include the top image in the content
        # since we'll handle it separately in the frontend
        html_content = f"""
        <div class="article-content">
            <div class="article-text">
                {article.text.replace('\n', '<br />')}
            </div>
        </div>
        """

        # Detect language using Amazon Comprehend (simplified for now)
        detected_language = "en"  # Default to English

        return {
            "url": url,
            "title": article.title,
            "content": html_content,
            "authors": article.authors,
            "publish_date": article.publish_date.isoformat() if article.publish_date else None,
            "top_image": top_image,
            "detected_language": detected_language
        }
    except Exception as e:
        app.log.error(f"Error scraping article from {url}: {str(e)}")
        # Fallback method using BeautifulSoup if newspaper3k fails
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            response = requests.get(url, headers=headers, timeout=10)
            soup = BeautifulSoup(response.text, 'html.parser')

            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()

            # Find the main content (this is a simple approach and might need customization)
            main_content = soup.find('article') or soup.find('main') or soup.find('div', class_='content')

            # Try to extract author information
            author_elements = soup.select('.author, .byline, [rel="author"], [itemprop="author"]')
            authors = []
            for el in author_elements:
                if el.text and len(el.text.strip()) > 0:
                    authors.append(el.text.strip())

            # Try to find a top image
            top_image = None
            img_elements = soup.select('article img, .featured-image img, [itemprop="image"]')
            if img_elements and len(img_elements) > 0:
                for img in img_elements:
                    if img.get('src') and (img.get('width') is None or int(img.get('width', '0')) > 300):
                        top_image = img.get('src')
                        # Remove this image from the content to avoid duplication
                        img.decompose()
                        break

            if main_content:
                content_html = str(main_content)
            else:
                # If no clear content container, get the body and clean it
                body = soup.find('body')
                if body:
                    # Remove navigation, header, footer, etc.
                    for nav in body.find_all(['nav', 'header', 'footer', 'aside']):
                        nav.decompose()
                    content_html = str(body)
                else:
                    content_html = "<p>Could not extract article content.</p>"

            # Detect language (simplified for now)
            detected_language = "en"  # Default to English

            return {
                "url": url,
                "content": content_html,
                "authors": authors,
                "top_image": top_image,
                "detected_language": detected_language,
                "fallback": True
            }
        except Exception as fallback_error:
            app.log.error(f"Fallback scraping failed for {url}: {str(fallback_error)}")
            return {"error": f"Failed to scrape article: {str(e)}"}, 500

@app.route('/text-to-speech', methods=['POST'])
def text_to_speech():
    """
    Converts article text to speech using Amazon Polly.
    """
    request_body = app.current_request.json_body
    if not request_body or 'text' not in request_body:
        return {"error": "Text is required"}, 400

    text = request_body['text']
    voice_id = request_body.get('voice_id', 'Joanna')  # Default to Joanna voice
    language_code = request_body.get('language_code', 'en')  # Get language code from request

    try:
        # Limit text length to avoid exceeding Polly limits
        if len(text) > 3000:
            text = text[:3000] + "..."

        # Map of language codes to Amazon Polly language codes
        # Some languages need specific format for Polly
        language_mapping = {
            'en': 'en-US',
            'es': 'es-ES',
            'fr': 'fr-FR',
            'de': 'de-DE',
            'it': 'it-IT',
            'pt': 'pt-BR',
            'zh': 'cmn-CN',
            'ja': 'ja-JP',
            'ko': 'ko-KR',
            'ar': 'arb',
            'ru': 'ru-RU',
            'hi': 'hi-IN'
        }

        # Voice mapping to ensure we're using supported voices for each language
        voice_mapping = {
            'en': 'Joanna',
            'es': 'Lupe',
            'fr': 'Lea',  # Note: Corrected from Léa to Lea (no accent)
            'de': 'Vicki',
            'it': 'Bianca',
            'pt': 'Camila',
            'zh': 'Zhiyu',
            'ja': 'Takumi',
            'ko': 'Seoyeon',
            'ar': 'Zeina',
            'ru': 'Tatyana',
            'hi': 'Aditi'
        }

        # Get the appropriate voice and language code
        polly_language = language_mapping.get(language_code, 'en-US')
        polly_voice = voice_mapping.get(language_code, 'Joanna')

        # Override voice_id if we have a specific mapping for this language
        if language_code in voice_mapping:
            voice_id = voice_mapping[language_code]

        # Configure the speech synthesis request
        synthesis_params = {
            'Text': text,
            'OutputFormat': 'mp3',
            'VoiceId': voice_id,
            'Engine': 'neural'  # Use neural engine for better quality
        }

        # For certain languages, explicitly set LanguageCode
        synthesis_params['LanguageCode'] = polly_language

        app.log.info(f"Synthesizing speech with params: {synthesis_params}")

        # Call Amazon Polly to synthesize speech
        response = polly_client.synthesize_speech(**synthesis_params)

        # Get the audio stream from the response
        if "AudioStream" in response:
            # Read the audio stream and encode as base64
            audio_data = response["AudioStream"].read()
            audio_base64 = base64.b64encode(audio_data).decode('utf-8')

            return {
                "success": True,
                "audio": audio_base64,
                "content_type": "audio/mpeg"
            }
        else:
            return {"error": "Failed to generate audio"}, 500
    except ClientError as e:
        app.log.error(f"Error calling Amazon Polly: {str(e)}")
        return {"error": f"Failed to generate speech: {str(e)}"}, 500

@app.route('/translate', methods=['POST'])
def translate_text():
    """
    Translates article text using Amazon Translate.
    """
    request_body = app.current_request.json_body
    if not request_body or 'text' not in request_body or 'target_language' not in request_body:
        return {"error": "Text and target language are required"}, 400

    text = request_body['text']
    target_language = request_body['target_language']
    source_language = request_body.get('source_language', 'auto')  # Auto-detect if not specified

    try:
        # Limit text length to avoid exceeding Translate limits
        # Amazon Translate has a limit of 5000 bytes per request
        if len(text.encode('utf-8')) > 5000:
            # Truncate text to approximately 5000 bytes
            text = text.encode('utf-8')[:4900].decode('utf-8', errors='ignore') + "..."

        # Call Amazon Translate to translate the text
        if source_language == 'auto':
            response = translate_client.translate_text(
                Text=text,
                TargetLanguageCode=target_language
            )
        else:
            response = translate_client.translate_text(
                Text=text,
                SourceLanguageCode=source_language,
                TargetLanguageCode=target_language
            )

        # Return the translated text
        return {
            "success": True,
            "translated_text": response.get('TranslatedText', ''),
            "source_language": response.get('SourceLanguageCode', source_language),
            "target_language": target_language
        }
    except ClientError as e:
        app.log.error(f"Error calling Amazon Translate: {str(e)}")
        return {"error": f"Failed to translate text: {str(e)}"}, 500

@app.route('/chat', methods=['POST'])
def chat_with_article():
    """
    Processes a chat message about an article using Hugging Face models.
    """
    request_body = app.current_request.json_body
    
    if not request_body or 'messages' not in request_body:
        return {"error": "Messages are required"}, 400
    
    messages = request_body['messages']
    article_text = request_body.get('article_text', '')
    article_title = request_body.get('article_title', '')
    
    # Get the selected model from the request, or use default
    selected_model_id = request_body.get('model', 'default')
    model = HF_MODELS.get(selected_model_id, DEFAULT_MODEL)
    
    # Truncate article text to avoid token limits
    # Free tier has stricter limits, so we'll be more conservative
    max_article_length = 2000
    if len(article_text) > max_article_length:
        article_text = article_text[:max_article_length] + "..."
    
    # Prepare the system message with article context
    system_message = f"""You are an AI assistant that helps users understand news articles.
    
Article Title: {article_title}

Article Content:
{article_text}

Your task is to answer questions about this article accurately and helpfully.
If you don't know the answer, say so rather than making up information.
Keep your responses concise and focused on the article content.
"""
    
    # Check cache first
    cache_key = get_cache_key(messages, system_message)
    cached_response = response_cache.get(cache_key)
    if cached_response:
        app.log.info("Using cached response")
        return cached_response
    
    try:
        # Generate response using Hugging Face with the selected model
        response = generate_huggingface_response(messages, system_message, model=model)
        # Cache the response
        response_cache[cache_key] = response
        return response
    except Exception as e:
        app.log.error(f"Error generating chat response: {str(e)}")
        app.log.warning(f"Primary model failed: {str(e)}. Trying fallback model...")
        try:
            # Try with a smaller, more reliable model
            response = generate_huggingface_response(messages, system_message, model=HF_MODELS["small"])
            # Cache the response
            response_cache[cache_key] = response
            return response
        except Exception as fallback_e:
            app.log.error(f"Fallback model also failed: {str(fallback_e)}")
            return {"error": "Failed to generate response"}, 500

def generate_huggingface_response(messages, system_message, model=DEFAULT_MODEL):
    """
    Generate a response using Hugging Face's Inference API (free tier).
    """
    # Format the conversation for the model
    # Different models expect different formats, but this works for most instruction-tuned models
    conversation = format_conversation_for_model(messages, system_message, model)
    
    # Call the Hugging Face Inference API
    headers = {
        "Authorization": f"Bearer {HF_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "inputs": conversation,
        "parameters": {
            "max_new_tokens": 256,  # Lower for free tier to avoid timeouts
            "temperature": 0.7,
            "top_p": 0.9,
            "do_sample": True,
            "return_full_text": False  # Only return the generated text, not the prompt
        }
    }
    
    # Add retry logic for API calls
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = requests.post(
                f"https://api-inference.huggingface.co/models/{model}",
                headers=headers,
                json=payload
            )
            
            # Check if the model is still loading
            if response.status_code == 503 and "currently loading" in response.text:
                app.log.info(f"Model {model} is still loading. Waiting...")
                time.sleep(10)  # Wait for model to load
                continue
                
            # Check for other errors
            if response.status_code != 200:
                app.log.error(f"Hugging Face API error: {response.text}")
                raise Exception(f"API returned status code {response.status_code}: {response.text}")
            
            result = response.json()
            
            # Extract the generated text
            if isinstance(result, list) and len(result) > 0:
                if "generated_text" in result[0]:
                    assistant_message = result[0]["generated_text"]
                else:
                    assistant_message = result[0]
            elif isinstance(result, dict) and "generated_text" in result:
                assistant_message = result["generated_text"]
            else:
                assistant_message = str(result)
            
            # Clean up the response
            assistant_message = clean_assistant_response(assistant_message)
            
            return {
                "success": True,
                "message": assistant_message,
                "role": "assistant"
            }
            
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            app.log.warning(f"Attempt {attempt + 1} failed: {str(e)}. Retrying...")
            time.sleep(2 * (attempt + 1))  # Exponential backoff
    
    # If we get here, all retries failed
    raise Exception("All retry attempts failed")

def format_conversation_for_model(messages, system_message, model):
    """
    Format the conversation based on the model being used.
    Different models expect different prompt formats.
    """
    if "mistral" in model.lower():
        # Mistral format
        conversation = f"<s>[INST] {system_message} [/INST]</s>\n\n"
        
        for i, msg in enumerate(messages):
            if msg['role'] == 'system':
                continue
            elif msg['role'] == 'user':
                conversation += f"<s>[INST] {msg['content']} [/INST]"
            elif msg['role'] == 'assistant':
                conversation += f" {msg['content']} </s>\n"
        
        # Add the final user message if the last message was from the user
        if messages and messages[-1]['role'] == 'user':
            conversation += " "
        
        return conversation
        
    elif "llama" in model.lower():
        # Llama 2 format
        conversation = f"<s>[INST] <<SYS>>\n{system_message}\n<</SYS>>\n\n"
        
        for i, msg in enumerate(messages):
            if msg['role'] == 'system':
                continue
            elif msg['role'] == 'user':
                if i > 0 and messages[i-1]['role'] == 'assistant':
                    conversation += f"[/INST] {messages[i-1]['content']} </s><s>[INST] {msg['content']}"
                else:
                    conversation += f"{msg['content']}"
            elif msg['role'] == 'assistant' and i == len(messages) - 1:
                conversation += f" [/INST] {msg['content']}"
        
        if messages and messages[-1]['role'] == 'user':
            conversation += " [/INST]"
            
        return conversation
        
    else:
        # Generic format for other models (T5, FLAN, etc.)
        conversation = f"System: {system_message}\n\n"
        
        for msg in messages:
            if msg['role'] == 'system':
                continue
            elif msg['role'] == 'user':
                conversation += f"User: {msg['content']}\n"
            elif msg['role'] == 'assistant':
                conversation += f"Assistant: {msg['content']}\n"
        
        # Add the final prompt for the model to continue
        if messages and messages[-1]['role'] == 'user':
            conversation += "Assistant: "
        
        return conversation

def clean_assistant_response(text):
    """
    Clean up the assistant's response to remove artifacts and ensure it's properly formatted.
    """
    # Remove any "Assistant:" prefix that might be in the response
    if text.startswith("Assistant:"):
        text = text[len("Assistant:"):].strip()
    
    # Remove any trailing "User:" or similar that might be generated
    stop_phrases = ["User:", "Human:", "<s>", "[INST]"]
    for phrase in stop_phrases:
        if phrase in text:
            text = text.split(phrase)[0].strip()
    
    return text

def get_cache_key(messages, system_message):
    """
    Generate a cache key based on the conversation.
    """
    # Use only the last few messages to generate the key
    recent_messages = messages[-3:] if len(messages) > 3 else messages
    cache_data = json.dumps({
        "messages": recent_messages,
        "system": system_message[:100]  # Just use the beginning of the system message
    }, sort_keys=True)
    return hashlib.md5(cache_data.encode()).hexdigest()