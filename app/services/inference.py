import abc
import asyncio
import re
from typing import List, Dict, Any
from pydantic import BaseModel

class Comment(BaseModel):
    text: str
    author: str
    likes: int
    timestamp: str

class AnalysisResult(BaseModel):
    overall_sentiment: Dict[str, float]  # positive, neutral, negative
    sentiment_index: float  # -100 to 100
    top_requests: List[Dict[str, Any]]
    pain_points: List[Dict[str, Any]]
    language_demographics: Dict[str, float]  # fidel, romanized, english

class SentimentInferenceService(abc.ABC):
    """
    Base interface for Inference. 
    Can be swapped seamlessly with an ONNX-optimized XLM-RoBERTa / Afro-mBERT service.
    """
    
    @abc.abstractmethod
    async def analyze_batch(self, comments: List[Comment], batch_size: int = 128) -> AnalysisResult:
        pass


class PrototypeInferenceService(SentimentInferenceService):
    """
    Lightweight MVP Pipeline using heuristics and regex for high-speed prototyping.
    """
    
    def __init__(self):
        # Extremely basic heuristic dictionaries for MVP demonstration
        self.positive_keywords = r'(arif|betam|awesome|good|love|like|teru|አሪፍ|ምርጥ|ጥሩ|በጣም)'
        self.negative_keywords = r'(bad|terrible|hate|aysemam|yaznal|diskour|አይሰማም|መጥፎ|አይረባም)'
        
        self.request_keywords = r'(tutorial|part 2|ስራልን|ቀጣይ|how to)'
        self.pain_keywords = r'(audio|mic|sound|ድምፅ|pacing|length|ረዘመ)'

        # Regex for language detection
        self.fidel_regex = re.compile(r'[\u1200-\u137F]')
        self.english_only_regex = re.compile(r'^[A-Za-z0-9\s\.,!\?\'\"]+$')

    def _detect_language(self, text: str) -> str:
        if self.fidel_regex.search(text):
            return 'fidel'
        elif self.english_only_regex.match(text):
            return 'english'
        else:
            return 'romanized' # Mix of latin but not strictly english-looking (heuristic)

    async def _process_chunk(self, chunk: List[Comment]) -> Dict[str, Any]:
        """Process a single chunk of comments asynchronously."""
        # Simulate heavy lifting
        await asyncio.sleep(0.1) 
        
        results = {
            'pos': 0, 'neu': 0, 'neg': 0,
            'fidel': 0, 'romanized': 0, 'english': 0,
            'requests': [], 'pains': []
        }
        
        for comment in chunk:
            text = comment.text.lower()
            
            # Language
            lang = self._detect_language(text)
            results[lang] += 1
            
            # Sentiment
            is_pos = re.search(self.positive_keywords, text)
            is_neg = re.search(self.negative_keywords, text)
            
            if is_pos and not is_neg:
                results['pos'] += 1
            elif is_neg and not is_pos:
                results['neg'] += 1
            else:
                results['neu'] += 1
                
            # Content Goldmine
            if req := re.search(self.request_keywords, text):
                results['requests'].append(req.group(0))
                
            # Pain Points
            if pain := re.search(self.pain_keywords, text):
                results['pains'].append(pain.group(0))
                
        return results

    async def analyze_batch(self, comments: List[Comment], batch_size: int = 128) -> AnalysisResult:
        if not comments:
            return AnalysisResult(
                overall_sentiment={"positive": 0, "neutral": 0, "negative": 0},
                sentiment_index=0,
                top_requests=[],
                pain_points=[],
                language_demographics={"fidel": 0, "romanized": 0, "english": 0}
            )

        # High-Speed Batch Pipeline
        chunks = [comments[i:i + batch_size] for i in range(0, len(comments), batch_size)]
        
        # Process chunks concurrently
        chunk_results = await asyncio.gather(*(self._process_chunk(chunk) for chunk in chunks))
        
        # Aggregate
        total = len(comments)
        agg = {
            'pos': 0, 'neu': 0, 'neg': 0,
            'fidel': 0, 'romanized': 0, 'english': 0,
        }
        all_requests = []
        all_pains = []
        
        for r in chunk_results:
            for k in agg.keys():
                agg[k] += r[k]
            all_requests.extend(r['requests'])
            all_pains.extend(r['pains'])
            
        # Calculate percentages
        sentiment = {
            "positive": (agg['pos'] / total) * 100,
            "neutral": (agg['neu'] / total) * 100,
            "negative": (agg['neg'] / total) * 100,
        }
        
        # Sentiment Index: +1 for pos, -1 for neg, 0 for neu. Map to -100 to 100
        sentiment_index = ((agg['pos'] - agg['neg']) / total) * 100
        
        demographics = {
            "fidel": (agg['fidel'] / total) * 100,
            "romanized": (agg['romanized'] / total) * 100,
            "english": (agg['english'] / total) * 100,
        }
        
        # Aggregate requests and pain points
        req_counts = {}
        for req in all_requests:
            req_counts[req] = req_counts.get(req, 0) + 1
            
        pain_counts = {}
        for pain in all_pains:
            pain_counts[pain] = pain_counts.get(pain, 0) + 1
            
        top_requests = [{"topic": k, "count": v} for k, v in sorted(req_counts.items(), key=lambda item: item[1], reverse=True)[:5]]
        top_pains = [{"issue": k, "count": v} for k, v in sorted(pain_counts.items(), key=lambda item: item[1], reverse=True)[:5]]

        return AnalysisResult(
            overall_sentiment=sentiment,
            sentiment_index=sentiment_index,
            top_requests=top_requests,
            pain_points=top_pains,
            language_demographics=demographics
        )
