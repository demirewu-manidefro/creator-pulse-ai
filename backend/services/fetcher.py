import asyncio
import re
import datetime
from typing import List
from .inference import Comment

class YouTubeFetcher:
    """
    Modular Fetcher service for YouTube comments.
    Strips HTML and extracts metadata.
    
    Note: For this MVP boilerplate, this includes a mock generator 
    to demonstrate the inference engine without requiring a live YouTube API Key.
    """
    
    async def fetch_comments(self, video_id_or_url: str) -> List[Comment]:
        """
        Main interface to fetch comments.
        Takes a URL or video ID and returns a list of sanitized Comment objects.
        """
        video_id = self._extract_video_id(video_id_or_url)
        
        # Simulate network delay for fetching
        await asyncio.sleep(1.5)
        
        # In a real implementation, you would do:
        # return await self._call_youtube_api(video_id)
        
        return self._generate_mock_comments()

    def _extract_video_id(self, url: str) -> str:
        """Extracts 11-character video ID from YouTube URL."""
        match = re.search(r'(?:v=|\/)([0-9A-Za-z_-]{11}).*', url)
        return match.group(1) if match else "mock_id_123"

    def _clean_html(self, text: str) -> str:
        """Strips HTML/garbage from comment text."""
        clean = re.compile('<.*?>')
        return re.sub(clean, '', text)

    def _generate_mock_comments(self) -> List[Comment]:
        """Generates realistic test data for the pipeline."""
        base_time = datetime.datetime.utcnow()
        comments = []
        
        # Mixture of Fidel, Romanized Amharic, and English
        # Including positive, negative, pain points, and requests
        mock_data_pool = [
            # Romanized Amharic
            "betam arif new gin audio-w aysemam", # mixed sentiment/pain point
            "Wow betam teru!", # positive
            "diskour aysemam", # negative
            "tutorial request betam arif", # request + positive
            
            # Fidel Amharic
            "ይሄ አሪፍ ነው ቀጣይ ስራልን", # positive + request
            "ምን አይነት መጥፎ ነው, ድምፅ አይሰማም", # negative + pain point (audio)
            "ቪዲዮው ረዘመ", # pain point (length)
            "ምርጥ", # positive
            
            # English
            "I love this video, tutorial part 2 please", # pos + request
            "This was terrible, pacing was off", # neg + pain point
            "good content!", # pos
            "microphone is too low", # pain point
            "how to set this up?" # request
        ]
        
        # Multiply to simulate a large dataset for chunking/batching (e.g., 260 comments)
        extended_pool = mock_data_pool * 20 
        
        for i, text in enumerate(extended_pool):
            comments.append(Comment(
                text=self._clean_html(text),
                author=f"CreatorFan_{i}",
                likes=i % 45,
                timestamp=(base_time - datetime.timedelta(minutes=i*2)).isoformat()
            ))
            
        return comments
