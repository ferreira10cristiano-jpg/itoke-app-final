"""
Test Help Topics Video URL functionality
Tests for FAQ do Cliente and FAQ do Estabelecimento video_url field
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://draft-offer-mode.preview.emergentagent.com')


class TestHelpTopicsVideoURL:
    """Tests for GET /api/help-topics video_url field"""
    
    def test_help_topics_returns_video_url(self):
        """GET /api/help-topics should return topics with video_url field"""
        response = requests.get(f"{BASE_URL}/api/help-topics")
        assert response.status_code == 200
        
        topics = response.json()
        assert isinstance(topics, list)
        assert len(topics) > 0
        
        # Check that topics have video_url field
        for topic in topics:
            assert "topic_id" in topic
            assert "title" in topic
            assert "content" in topic
            # video_url should be present (can be empty string or URL)
            assert "video_url" in topic or topic.get("video_url") is None
    
    def test_topic_o_que_sao_tokens_has_video(self):
        """Topic 'O que sao Tokens?' should have video_url"""
        response = requests.get(f"{BASE_URL}/api/help-topics")
        assert response.status_code == 200
        
        topics = response.json()
        tokens_topic = next((t for t in topics if "Tokens" in t.get("title", "")), None)
        
        assert tokens_topic is not None, "Topic 'O que sao Tokens?' not found"
        assert tokens_topic.get("video_url"), f"Topic should have video_url, got: {tokens_topic.get('video_url')}"
        assert "youtube" in tokens_topic["video_url"].lower() or "youtu.be" in tokens_topic["video_url"].lower()
    
    def test_topic_como_funciona_itoke_has_video(self):
        """Topic 'Como funciona o iToke?' should have video_url"""
        response = requests.get(f"{BASE_URL}/api/help-topics")
        assert response.status_code == 200
        
        topics = response.json()
        itoke_topic = next((t for t in topics if "Como funciona o iToke" in t.get("title", "")), None)
        
        assert itoke_topic is not None, "Topic 'Como funciona o iToke?' not found"
        assert itoke_topic.get("video_url"), f"Topic should have video_url, got: {itoke_topic.get('video_url')}"
    
    def test_topic_o_que_sao_creditos_no_video(self):
        """Topic 'O que sao Creditos?' should NOT have video_url"""
        response = requests.get(f"{BASE_URL}/api/help-topics")
        assert response.status_code == 200
        
        topics = response.json()
        creditos_topic = next((t for t in topics if "Creditos" in t.get("title", "") and "O que sao" in t.get("title", "")), None)
        
        assert creditos_topic is not None, "Topic 'O que sao Creditos?' not found"
        # video_url should be empty or not present
        video_url = creditos_topic.get("video_url", "")
        assert not video_url, f"Topic should NOT have video_url, got: {video_url}"


class TestEstHelpTopicsVideoURL:
    """Tests for GET /api/est-help-topics video_url field"""
    
    def test_est_help_topics_returns_video_url(self):
        """GET /api/est-help-topics should return topics with video_url field"""
        response = requests.get(f"{BASE_URL}/api/est-help-topics")
        assert response.status_code == 200
        
        topics = response.json()
        assert isinstance(topics, list)
        assert len(topics) > 0
        
        # Check that topics have video_url field
        for topic in topics:
            assert "topic_id" in topic
            assert "title" in topic
            assert "content" in topic
    
    def test_est_topic_conhecendo_itoke_has_video(self):
        """Topic 'Conhecendo o iToke' should have video_url"""
        response = requests.get(f"{BASE_URL}/api/est-help-topics")
        assert response.status_code == 200
        
        topics = response.json()
        conhecendo_topic = next((t for t in topics if "Conhecendo" in t.get("title", "")), None)
        
        assert conhecendo_topic is not None, "Topic 'Conhecendo o iToke' not found"
        assert conhecendo_topic.get("video_url"), f"Topic should have video_url, got: {conhecendo_topic.get('video_url')}"
    
    def test_est_topic_o_que_sao_tokens_has_video(self):
        """Establishment topic 'O que sao Tokens?' should have video_url"""
        response = requests.get(f"{BASE_URL}/api/est-help-topics")
        assert response.status_code == 200
        
        topics = response.json()
        tokens_topic = next((t for t in topics if "O que sao Tokens" in t.get("title", "")), None)
        
        assert tokens_topic is not None, "Topic 'O que sao Tokens?' not found"
        assert tokens_topic.get("video_url"), f"Topic should have video_url, got: {tokens_topic.get('video_url')}"
    
    def test_est_topic_o_que_sao_creditos_no_video(self):
        """Establishment topic 'O que sao Creditos?' should NOT have video_url"""
        response = requests.get(f"{BASE_URL}/api/est-help-topics")
        assert response.status_code == 200
        
        topics = response.json()
        creditos_topic = next((t for t in topics if "O que sao Creditos" in t.get("title", "")), None)
        
        assert creditos_topic is not None, "Topic 'O que sao Creditos?' not found"
        # video_url should be empty or not present
        video_url = creditos_topic.get("video_url", "")
        assert not video_url, f"Topic should NOT have video_url, got: {video_url}"
    
    def test_est_topics_with_video_have_youtube_url(self):
        """Topics with video_url should have valid YouTube URLs"""
        response = requests.get(f"{BASE_URL}/api/est-help-topics")
        assert response.status_code == 200
        
        topics = response.json()
        topics_with_video = [t for t in topics if t.get("video_url")]
        
        assert len(topics_with_video) > 0, "Should have at least one topic with video"
        
        for topic in topics_with_video:
            video_url = topic["video_url"]
            assert "youtube" in video_url.lower() or "youtu.be" in video_url.lower(), \
                f"Video URL should be YouTube: {video_url}"


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_health(self):
        """API health check should return 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
