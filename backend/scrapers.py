import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, quote
from typing import List, Dict, Optional
from dataclasses import dataclass
from datetime import datetime
import logging
import random
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class ScrapedItem:
    name: str
    address: str
    category: str
    map_link: Optional[str]
    source_url: str
    scraped_at: str


class YellowPagesScraper:
    """Scraper for Thailand Yellow Pages (yellowpages.co.th)"""

    BASE_URL = "https://www.yellowpages.co.th"
    SEARCH_URL = f"{BASE_URL}/ypsearch"

    def __init__(self, max_retries: int = 3, timeout: int = 10):
        self.max_retries = max_retries
        self.timeout = timeout
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
        self.items: List[ScrapedItem] = []

    def build_search_url(self, query: str, page: int = 1) -> str:
        """Build search URL from query string"""
        encoded_query = quote(query)
        if page == 1:
            return f"{self.SEARCH_URL}?q={encoded_query}"
        return f"{self.SEARCH_URL}?q={encoded_query}&page={page}"

    def _get_headers(self) -> Dict[str, str]:
        """Get headers with random user agent"""
        return {
            'User-Agent': random.choice(self.user_agents),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Referer': self.BASE_URL,
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }

    def scrape(self, query: str, max_pages: int = 1) -> List[ScrapedItem]:
        """Scrape results for a given query"""
        self.items = []

        logger.info(f"Scraping Yellow Pages for: {query}")

        for page in range(1, max_pages + 1):
            url = self.build_search_url(query, page)
            logger.info(f"Scraping page {page}: {url}")

            try:
                response = requests.get(url, headers=self._get_headers(), timeout=self.timeout)
                response.raise_for_status()

                soup = BeautifulSoup(response.content, 'lxml')

                # Find all business listings using correct selector
                listing_containers = soup.find_all('div', class_=lambda x: x and 'yp-search-listing' in x)

                logger.info(f"Page {page}: Found {len(listing_containers)} listings")

                if not listing_containers:
                    logger.info(f"No more listings found on page {page}. Stopping pagination.")
                    break

                for container in listing_containers:
                    try:
                        # Extract name from h3 > a
                        name = "N/A"
                        name_link = container.find('h3')
                        if name_link:
                            name_elem = name_link.find('a')
                            if name_elem:
                                name = name_elem.get_text(strip=True)

                        # Extract address from p.yp-listing-address
                        address = "N/A"
                        address_elem = container.find('p', class_='yp-listing-address')
                        if address_elem:
                            address = address_elem.get_text(strip=True)

                        # Extract category from a[href*="heading/"]
                        category = "N/A"
                        category_elem = container.find('a', href=lambda x: x and 'heading/' in x)
                        if category_elem:
                            category = category_elem.get_text(strip=True)

                        # Extract map link - look for link with map reference
                        map_link = None
                        all_links = container.find_all('a')
                        for link in all_links:
                            href = link.get('href', '')
                            if 'map' in href.lower() or 'maps' in href.lower():
                                map_link = href
                                break

                        # Extract source URL - use the name link's href
                        source_url = url
                        if name_link:
                            name_elem = name_link.find('a')
                            if name_elem and name_elem.get('href'):
                                profile_url = name_elem.get('href')
                                if profile_url.startswith('http'):
                                    source_url = profile_url
                                else:
                                    source_url = urljoin(self.BASE_URL, profile_url)

                        # Only add items with valid names
                        if name != "N/A":
                            item = ScrapedItem(
                                name=name,
                                address=address,
                                category=category,
                                map_link=map_link,
                                source_url=source_url,
                                scraped_at=datetime.now().isoformat()
                            )
                            self.items.append(item)

                    except Exception as e:
                        logger.warning(f"Error parsing item: {e}")
                        continue

                # Add delay between requests
                if page < max_pages:
                    delay = random.uniform(2, 4)
                    logger.info(f"Waiting {delay:.1f} seconds before next page...")
                    time.sleep(delay)

            except requests.RequestException as e:
                logger.error(f"Request error on page {page}: {e}")
                break
            except Exception as e:
                logger.error(f"Error during scraping on page {page}: {e}")
                break

        logger.info(f"Successfully scraped {len(self.items)} items total")
        return self.items


def scrape_yellow_pages(query: str, max_pages: int = 1) -> List[Dict]:
    """Main function to scrape yellow pages"""
    scraper = YellowPagesScraper()
    items = scraper.scrape(query, max_pages)

    return [
        {
            'name': item.name,
            'address': item.address,
            'category': item.category,
            'map_link': item.map_link,
            'source_url': item.source_url,
            'scraped_at': item.scraped_at
        }
        for item in items
    ]
