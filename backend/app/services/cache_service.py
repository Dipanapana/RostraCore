"""
Cache Service for RostraCore
Provides Redis-based caching with automatic serialization and TTL management
"""

import redis
import json
import os
from typing import Optional, Any, Callable
from functools import wraps
from datetime import timedelta
import pickle

# Redis connection
redis_client = redis.Redis(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    db=int(os.getenv("REDIS_DB", 0)),
    decode_responses=False,  # We'll handle encoding/decoding
    socket_connect_timeout=5,
    socket_timeout=5
)


class CacheService:
    """
    Redis-based caching service with automatic serialization
    """

    @staticmethod
    def _serialize(value: Any) -> bytes:
        """Serialize Python objects to bytes"""
        try:
            # Try JSON first (faster, human-readable)
            return json.dumps(value).encode('utf-8')
        except (TypeError, ValueError):
            # Fall back to pickle for complex objects
            return pickle.dumps(value)

    @staticmethod
    def _deserialize(data: bytes) -> Any:
        """Deserialize bytes to Python objects"""
        try:
            # Try JSON first
            return json.loads(data.decode('utf-8'))
        except (json.JSONDecodeError, UnicodeDecodeError):
            # Fall back to pickle
            return pickle.loads(data)

    @staticmethod
    def get(key: str) -> Optional[Any]:
        """
        Get value from cache

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found/expired
        """
        try:
            data = redis_client.get(key)
            if data:
                return CacheService._deserialize(data)
            return None
        except redis.RedisError as e:
            print(f"Redis GET error: {e}")
            return None

    @staticmethod
    def set(key: str, value: Any, ttl: int = 300) -> bool:
        """
        Set value in cache with TTL

        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds (default: 5 minutes)

        Returns:
            True if successful, False otherwise
        """
        try:
            serialized = CacheService._serialize(value)
            redis_client.setex(key, ttl, serialized)
            return True
        except redis.RedisError as e:
            print(f"Redis SET error: {e}")
            return False

    @staticmethod
    def delete(key: str) -> bool:
        """
        Delete key from cache

        Args:
            key: Cache key

        Returns:
            True if key was deleted, False otherwise
        """
        try:
            redis_client.delete(key)
            return True
        except redis.RedisError as e:
            print(f"Redis DELETE error: {e}")
            return False

    @staticmethod
    def delete_pattern(pattern: str) -> int:
        """
        Delete all keys matching pattern

        Args:
            pattern: Pattern to match (e.g., "dashboard:*")

        Returns:
            Number of keys deleted
        """
        try:
            keys = redis_client.keys(pattern)
            if keys:
                return redis_client.delete(*keys)
            return 0
        except redis.RedisError as e:
            print(f"Redis DELETE_PATTERN error: {e}")
            return 0

    @staticmethod
    def exists(key: str) -> bool:
        """
        Check if key exists in cache

        Args:
            key: Cache key

        Returns:
            True if key exists, False otherwise
        """
        try:
            return bool(redis_client.exists(key))
        except redis.RedisError as e:
            print(f"Redis EXISTS error: {e}")
            return False

    @staticmethod
    def clear_all() -> bool:
        """
        Clear entire cache (use with caution!)

        Returns:
            True if successful, False otherwise
        """
        try:
            redis_client.flushdb()
            return True
        except redis.RedisError as e:
            print(f"Redis FLUSHDB error: {e}")
            return False

    @staticmethod
    def get_stats() -> dict:
        """
        Get Redis statistics

        Returns:
            Dictionary with cache statistics
        """
        try:
            info = redis_client.info('stats')
            memory = redis_client.info('memory')
            return {
                "total_keys": redis_client.dbsize(),
                "hits": info.get('keyspace_hits', 0),
                "misses": info.get('keyspace_misses', 0),
                "hit_rate": info.get('keyspace_hits', 0) / max(1, info.get('keyspace_hits', 0) + info.get('keyspace_misses', 0)),
                "memory_used_mb": memory.get('used_memory', 0) / 1024 / 1024,
                "memory_peak_mb": memory.get('used_memory_peak', 0) / 1024 / 1024
            }
        except redis.RedisError as e:
            print(f"Redis STATS error: {e}")
            return {}


# Decorator for automatic caching
def cached(ttl: int = 300, key_prefix: str = ""):
    """
    Decorator for automatic caching of function results

    Args:
        ttl: Time to live in seconds (default: 5 minutes)
        key_prefix: Prefix for cache key (default: function name)

    Usage:
        @cached(ttl=600, key_prefix="dashboard")
        def get_dashboard_metrics(org_id: int):
            # Expensive computation
            return metrics

    The cache key will be: "{key_prefix}:{function_name}:{args}:{kwargs}"
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Build cache key
            prefix = key_prefix or func.__name__

            # Create a string representation of args/kwargs
            args_str = "_".join(str(arg) for arg in args)
            kwargs_str = "_".join(f"{k}={v}" for k, v in sorted(kwargs.items()))
            cache_key = f"{prefix}:{func.__name__}:{args_str}:{kwargs_str}"

            # Try to get from cache
            cached_value = CacheService.get(cache_key)
            if cached_value is not None:
                return cached_value

            # Not in cache, compute and store
            result = func(*args, **kwargs)
            CacheService.set(cache_key, result, ttl=ttl)

            return result

        return wrapper
    return decorator


# Async version of decorator (for FastAPI async endpoints)
def cached_async(ttl: int = 300, key_prefix: str = ""):
    """
    Decorator for automatic caching of async function results

    Args:
        ttl: Time to live in seconds (default: 5 minutes)
        key_prefix: Prefix for cache key (default: function name)

    Usage:
        @cached_async(ttl=600, key_prefix="dashboard")
        async def get_dashboard_metrics(org_id: int):
            # Expensive async computation
            return metrics
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Build cache key
            prefix = key_prefix or func.__name__

            # Create a string representation of args/kwargs
            args_str = "_".join(str(arg) for arg in args)
            kwargs_str = "_".join(f"{k}={v}" for k, v in sorted(kwargs.items()))
            cache_key = f"{prefix}:{func.__name__}:{args_str}:{kwargs_str}"

            # Try to get from cache
            cached_value = CacheService.get(cache_key)
            if cached_value is not None:
                return cached_value

            # Not in cache, compute and store
            result = await func(*args, **kwargs)
            CacheService.set(cache_key, result, ttl=ttl)

            return result

        return wrapper
    return decorator


# Cache invalidation helpers
class CacheInvalidator:
    """
    Helper class for cache invalidation patterns
    """

    @staticmethod
    def invalidate_dashboard(org_id: Optional[int] = None):
        """Invalidate all dashboard caches"""
        if org_id:
            CacheService.delete_pattern(f"dashboard:*:*{org_id}*")
        else:
            CacheService.delete_pattern("dashboard:*")

    @staticmethod
    def invalidate_roster(org_id: Optional[int] = None):
        """Invalidate all roster caches"""
        if org_id:
            CacheService.delete_pattern(f"roster:*:*{org_id}*")
        else:
            CacheService.delete_pattern("roster:*")

    @staticmethod
    def invalidate_employees(org_id: Optional[int] = None):
        """Invalidate all employee caches"""
        if org_id:
            CacheService.delete_pattern(f"employees:*:*{org_id}*")
        else:
            CacheService.delete_pattern("employees:*")

    @staticmethod
    def invalidate_shifts(org_id: Optional[int] = None):
        """Invalidate all shift caches"""
        if org_id:
            CacheService.delete_pattern(f"shifts:*:*{org_id}*")
        else:
            CacheService.delete_pattern("shifts:*")

    @staticmethod
    def invalidate_all_for_org(org_id: int):
        """Invalidate all caches for an organization"""
        CacheService.delete_pattern(f"*:*{org_id}*")


# Health check function
def check_redis_health() -> dict:
    """
    Check Redis connection health

    Returns:
        Dictionary with health status
    """
    try:
        redis_client.ping()
        stats = CacheService.get_stats()
        return {
            "status": "healthy",
            "connected": True,
            "stats": stats
        }
    except redis.RedisError as e:
        return {
            "status": "unhealthy",
            "connected": False,
            "error": str(e)
        }
