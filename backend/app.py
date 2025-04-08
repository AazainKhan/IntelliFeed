from chalice import Chalice
import json
import feedparser
import logging
import uuid
import re
import requests
from bs4 import BeautifulSoup
from newspaper import Article
import time

app = Chalice(app_name='backend')
app.debug = True
app.api.cors = True


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
        
        return {
            "url": url,
            "title": article.title,
            "content": html_content,
            "authors": article.authors,
            "publish_date": article.publish_date.isoformat() if article.publish_date else None,
            "top_image": top_image
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
            
            return {
                "url": url,
                "content": content_html,
                "authors": authors,
                "top_image": top_image,
                "fallback": True
            }
        except Exception as fallback_error:
            app.log.error(f"Fallback scraping failed for {url}: {str(fallback_error)}")
            return {"error": f"Failed to scrape article: {str(e)}"}, 500
