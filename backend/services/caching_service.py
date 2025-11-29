"""
Caching Service pro FHIR queries - optimalizace performance
"""
from django.core.cache import cache
from django.conf import settings
import hashlib
import json
import logging
from typing import Dict, Optional, Any
from functools import wraps

logger = logging.getLogger(__name__)

# Cache timeouts (v sekundách)
CACHE_TIMEOUT_PATIENT = 300  # 5 minut
CACHE_TIMEOUT_PRACTITIONER = 600  # 10 minut
CACHE_TIMEOUT_LOCATION = 600  # 10 minut
CACHE_TIMEOUT_PROCEDURE = 60  # 1 minuta (operace se často mění)
CACHE_TIMEOUT_DEVICE = 1800  # 30 minut
CACHE_TIMEOUT_METADATA = 3600  # 1 hodina


def generate_cache_key(prefix: str, params: Dict) -> str:
    """
    Generuje konzistentní cache key z prefixu a parametrů
    
    Args:
        prefix: Prefix pro cache key (např. 'fhir:patient')
        params: Slovník parametrů
        
    Returns:
        str: Hash cache key
    """
    params_str = json.dumps(params, sort_keys=True)
    params_hash = hashlib.md5(params_str.encode()).hexdigest()
    return f"{prefix}:{params_hash}"


def cache_fhir_query(resource_type: str, timeout: Optional[int] = None):
    """
    Decorator pro cachování FHIR queries
    
    Usage:
        @cache_fhir_query('Patient', timeout=300)
        def search_patients(params):
            return fhir_service.search_patients(params)
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Vygenerovat cache key
            cache_prefix = f"fhir:{resource_type.lower()}"
            cache_params = {**kwargs}
            if args:
                cache_params['args'] = str(args)
            
            cache_key = generate_cache_key(cache_prefix, cache_params)
            
            # Zkusit načíst z cache
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache HIT: {cache_key}")
                return cached_result
            
            # Cache miss - zavolat funkci
            logger.debug(f"Cache MISS: {cache_key}")
            result = func(*args, **kwargs)
            
            # Uložit do cache
            cache_timeout = timeout or CACHE_TIMEOUT_PATIENT
            cache.set(cache_key, result, cache_timeout)
            
            return result
        
        return wrapper
    return decorator


class FHIRCacheService:
    """Service pro správu FHIR cache"""
    
    @staticmethod
    def invalidate_patient(patient_id: str):
        """Invaliduje cache pro konkrétního pacienta"""
        pattern = f"fhir:patient:*{patient_id}*"
        cache.delete_pattern(pattern)
        logger.info(f"Cache invalidována pro pacienta: {patient_id}")
    
    @staticmethod
    def invalidate_practitioner(practitioner_id: str):
        """Invaliduje cache pro praktikujícího"""
        pattern = f"fhir:practitioner:*{practitioner_id}*"
        cache.delete_pattern(pattern)
        logger.info(f"Cache invalidována pro praktikujícího: {practitioner_id}")
    
    @staticmethod
    def invalidate_location(location_id: str):
        """Invaliduje cache pro lokaci"""
        pattern = f"fhir:location:*{location_id}*"
        cache.delete_pattern(pattern)
        logger.info(f"Cache invalidována pro lokaci: {location_id}")
    
    @staticmethod
    def invalidate_procedure(procedure_id: str):
        """Invaliduje cache pro proceduru"""
        pattern = f"fhir:procedure:*{procedure_id}*"
        cache.delete_pattern(pattern)
        logger.info(f"Cache invalidována pro proceduru: {procedure_id}")
    
    @staticmethod
    def invalidate_all():
        """Invaliduje všechny FHIR cache"""
        pattern = "fhir:*"
        cache.delete_pattern(pattern)
        logger.info("Všechny FHIR cache invalidovány")
    
    @staticmethod
    def get_cache_stats() -> Dict:
        """Získá statistiky cache"""
        from django.conf import settings
        
        stats = {
            'backend': 'unknown',
            'status': 'active'
        }
        
        cache_backend = settings.CACHES.get('default', {}).get('BACKEND', '')
        if 'redis' in cache_backend.lower():
            stats['backend'] = 'redis'
            try:
                # Try to get Redis info
                from django_redis import get_redis_connection
                redis_conn = get_redis_connection("default")
                info = redis_conn.info()
                stats['redis_version'] = info.get('redis_version', 'unknown')
                stats['used_memory_human'] = info.get('used_memory_human', 'unknown')
                stats['connected_clients'] = info.get('connected_clients', 0)
            except Exception as e:
                logger.error(f"Error getting Redis stats: {str(e)}")
        elif 'locmem' in cache_backend.lower():
            stats['backend'] = 'locmem'
        
        return stats


# Wrapped FHIR Service s cachingem
class CachedFHIRService:
    """FHIR Service s automatickým cachingem"""
    
    def __init__(self):
        from services.fhir_service import FHIRService
        self.fhir_service = FHIRService()
    
    @cache_fhir_query('Patient', CACHE_TIMEOUT_PATIENT)
    def get_patient(self, fhir_id: str):
        return self.fhir_service.get_patient(fhir_id)
    
    @cache_fhir_query('Patient', CACHE_TIMEOUT_PATIENT)
    def search_patients(self, params: Dict):
        return self.fhir_service.search_patients(params)
    
    @cache_fhir_query('Practitioner', CACHE_TIMEOUT_PRACTITIONER)
    def get_practitioner(self, fhir_id: str):
        return self.fhir_service.get_practitioner(fhir_id)
    
    @cache_fhir_query('Practitioner', CACHE_TIMEOUT_PRACTITIONER)
    def search_practitioners(self, params: Dict):
        return self.fhir_service.search_practitioners(params)
    
    @cache_fhir_query('Location', CACHE_TIMEOUT_LOCATION)
    def get_location(self, fhir_id: str):
        return self.fhir_service.get_location(fhir_id)
    
    @cache_fhir_query('Location', CACHE_TIMEOUT_LOCATION)
    def search_locations(self, params: Dict):
        return self.fhir_service.search_locations(params)
    
    @cache_fhir_query('Procedure', CACHE_TIMEOUT_PROCEDURE)
    def get_procedure(self, fhir_id: str):
        return self.fhir_service.get_procedure(fhir_id)
    
    @cache_fhir_query('Procedure', CACHE_TIMEOUT_PROCEDURE)
    def search_procedures(self, params: Dict):
        return self.fhir_service.search_procedures(params)
    
    # Pro write operace invalidujeme cache
    def create_patient(self, patient_data: Dict):
        result = self.fhir_service.create_patient(patient_data)
        if result:
            FHIRCacheService.invalidate_patient(result.get('id', ''))
        return result
    
    def update_patient(self, fhir_id: str, patient_data: Dict):
        result = self.fhir_service.update_patient(fhir_id, patient_data)
        if result:
            FHIRCacheService.invalidate_patient(fhir_id)
        return result

